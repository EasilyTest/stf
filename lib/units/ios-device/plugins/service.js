var util = require('util')
var events = require('events')

var syrup = require('stf-syrup')
var Promise = require('bluebird')

var wire = require('../../../wire')
var wireutil = require('../../../wire/util')
var devutil = require('../../../util/devutil')
var keyutil = require('../../../util/keyutil')
var streamutil = require('../../../util/streamutil')
var logger = require('../../../util/logger')
var ms = require('../../../wire/messagestream')
var lifecycle = require('../../../util/lifecycle')
var deviceInfo = require('../support/deviceinfo')

var subP = require("teen_process").SubProcess
var exec = require("teen_process").exec
var execSync = require('child_process').execSync;

var requestPromise = require('request-promise')

module.exports = syrup.serial()
  .dependency(require('./wdaCommands'))
  .dependency(require('../support/router'))
  .dependency(require('../support/push'))
  .dependency(require('../support/storage'))
  .define(function(options, wda, router, push,storage) {
    var log = logger.createLogger('ios-device:plugins:service')
    var plugin = new events.EventEmitter()
    var curRotation = 0
    var curStatus = 0//1-device,2-connecting,0-init

    const adaptor = function(node) {
      node.class = node.type
      const rect = node.rect
      node.bounds = [
        rect.x,
        rect.y,
        rect.width,
        rect.height
      ]

      if (node.children) {
        const children = node.children.length ? node.children : [node.children];

        var nodes = []
        children.forEach(child => {
          if (child.isVisible || child.type !== 'Window') {
            nodes.push(adaptor(child))
          }
        })

        node.nodes = nodes
        delete node.children
      }
      return node
    }

    function ensureHttpProtocol(url) {
      // Check for '://' because a protocol-less URL might include
      // a username:password combination.
      return (url.indexOf('://') === -1 ? 'http://' : '') + url
    }

    plugin.isWdaStart = function(){
        return wda.getSessionid()!=null
    }

    plugin.unlock = function(){
        wda.PostData('wda/unlock',{},false)
    }

    plugin.lock = function(){
        wda.PostData('wda/lock',{},false)
    }

    plugin.isLocked = function(){
      wda.GetRequest('wda/locked','',false)
      return new Promise(function(resolve, reject) {
        var lockListen = function(resp) {
          wda.removeListener('locked',lockListen)
          if(resp.isLocked!=undefined){
            return resolve(resp.isLocked)
          }
          else{
            reject(false)
          }
        }
        wda.on('locked',lockListen)
      })
    }

    plugin.screenShot = function(){
      wda.GetRequest("screenshot",'',false)
    }

    plugin.goHome = function(){
        wda.PostData('wda/homescreen',{},false)
    }

    plugin.copy = function(channel){
        wda.PostData('wda/getPasteboard',{contentType:'plaintext'},true)
        var copyListen = function(resp){
          wda.removeListener('getPasteboard',copyListen)
          if(resp.content!=undefined){
            var content = resp.content
            var reply = wireutil.reply(options.serial)
            push.send([
              channel
            , reply.okay(content)])
          }
        }
        wda.on('getPasteboard',copyListen)
    }

    plugin.paste = function(channel,text){
        wda.PostData('wda/setPasteboard',{contentType:'plaintext',content:text},true)
        var reply = wireutil.reply(options.serial)
        push.send([
            channel
            , reply.okay()])
    }

    plugin.type = function(text){
        wda.PostData('wda/keys',{value:text,frequency:60},true)
    }

    plugin.rotate = function(rotation){
        var orientation = 1//'PORTRAIT'
        if(rotation==90)
            orientation = 3//'LANDSCAPE'
        wda.PostData('orientation_Control',{orientation:orientation},false)
    }

    plugin.setFrameRate = function(framerate){
      wda.PostData('appium/settings',{settings:{mjpegServerFramerate:framerate}},true)
    }

    plugin.getSource = function() {
      wda.GetRequest('source',"?format=json",false)
      return new Promise(function(resolve, reject) {
        var sourceListen = function(resp) {
          wda.removeListener("source",sourceListen)
          var tree = adaptor(resp.value)

          return resolve(storage.store('blob', JSON.stringify(tree), {
            filename: util.format('%s.json', options.serial)
            , contentType: 'text/plain'
          }))
        }
        wda.on('source',sourceListen)
      })
    }

    plugin.updateRotation = function(newRotation){
      var rotation = newRotation
      if(rotation!=curRotation){
        curRotation = rotation
        push.send([
          wireutil.global
          , wireutil.envelope(new wire.RotationEvent(
            options.serial
            , rotation
          ))
        ])
        log.info('Rotation changed to %d',rotation)
      }
    }

    plugin.openUrl = function(message){
      message.url = ensureHttpProtocol(message.url)
      log.info('Opening "%s"', message.url)
      wda.PostData('url',{url:message.url},true)
    }

    plugin.queryAppList = function(serial, boredAfter = 2000) {
      var output = execSync('ios-deploy' + ' --id ' + serial + ' --list_bundle_id').toString()
      // log.info('get stdout:' + output)
      return output
    }

    plugin.launchDashApp = function(bundleId) {
      log.info("now opening: " + bundleId)
      var body = {
        desiredCapabilities:{
          bundleId:bundleId,
          shouldWaitForQuiescence: false
        }
      }
      wda.PostData('wda/apps/launchapp',body,false)
    }

    plugin.stopDashApp = function(bundleId) {
      log.info("now stoping: " + bundleId)
      var body = {
          bundleId:bundleId
      }
      wda.PostData('wda/apps/terminateapp',body,false)
    }

    plugin.uninstallDashApp = async function(bundleId, serial) {
      log.info("now uninstalling: " + bundleId + " " + serial)
      var params = ['-U', bundleId,'-u',serial]
      var cmd = "ideviceinstaller"
      let {stdout, stderr, code} = await exec(cmd, params)
      return stdout
    }

    plugin.WeakNetGetTokenAndAddress = async function() {
      log.info("get weaknet token and address ing..")
      var baseUrl = util.format('http://localhost:%d',options.wdaPort)
      var param = '', uri='wda/getWeaknetInfo'
      let optionss = {
        method:'GET',
        uri:util.format("%s/%s%s",baseUrl,uri,param),
        json:true,
        headers:{
          'Content-Type':'application/json'
        }
      }
      return await requestPromise(optionss).then(function(resp){
        log.info(resp)
        return resp
      }).catch(function(err){
          return null
      })
    }

    plugin.rout = function(){
        router
          .on(wire.PhysicalIdentifyMessage, function(channel) {
            var reply = wireutil.reply(options.serial)
            push.send([
              channel
            , reply.okay()
            ])
          })
          .on(wire.KeyDownMessage, function(channel, message) {
            try {
              switch(message.key){
                case "home":
                  return plugin.goHome()
                case "dpad_left":
                  //左移
                  return wda.swipe(200,200,50,200,100)
                case "dpad_right":
                  return wda.swipe(50,200,200,200,100)
                case "dpad_up":
                  return wda.swipe(200,200,200,50,100)
                case "dpad_down":
                  return wda.swipe(200,50,200,200,100)
                //case "enter":
                //  return wda.PostData('wda/keyboard/dismiss',{},true)
                case "del":
                  return wda.PostData('wda/del_key',{},false)
              }
            }
            catch (e) {
              log.warn(e.message)
            }
          })
          .on(wire.KeyUpMessage, function(channel, message) {
            try {
            }
            catch (e) {
              log.warn(e.message)
            }
          })
          .on(wire.KeyPressMessage, function(channel, message) {
            try {
              if(message.key=='home'){
                plugin.goHome()
              }
              else if(message.key=='power'){
                plugin.isLocked().then(function(islocked){
                  if(islocked){
                    plugin.unlock()
                  }
                  else{
                    plugin.lock()
                  }
                })
              }
            }
            catch (e) {
              log.warn(e.message)
            }
          })
          .on(wire.TypeMessage, function(channel, message) {
            plugin.type(message.text)
          })
          .on(wire.RotateMessage, function(channel, message) {
              plugin.rotate(message.rotation)
          })
          .on(wire.CopyMessage, function(channel) {
            log.info('Copying clipboard contents')
            plugin.copy(channel)
          })
          .on(wire.PasteMessage, function(channel, message) {
            log.info('Pasting "%s" to clipboard', message.text)
            plugin.paste(channel,message.text)
          })
          .on(wire.BrowserOpenMessage, function(channel, message) {
            plugin.openUrl(message)
            var reply = wireutil.reply(options.serial)
            push.send([
              channel
              , reply.okay()
            ])
          })
        return plugin
    }
    wda.on('batteryInfo',function(resp){
      var state = 'charging'
      if(resp.state==3)
          state = 'full'
      var message ={
          status:state
          ,health:"good"
          ,source:"usb"
          ,level:parseInt(resp.level*100)
          ,scale:100
          ,temp:0
          ,voltage:0
      }
      push.send([
          wireutil.global
          , wireutil.envelope(new wire.BatteryEvent(
              options.serial
              , message.status
              , message.health
              , message.source
              , message.level
              , message.scale
              , message.temp
              , message.voltage
          ))
      ])
      plugin.emit('batteryChange', message)
    })
    wda.on('check_status',function(resp){
      if(resp==="error" && curStatus!=2){
        log.info("WDA Status is False,set the device status to connecting(4)")
        curStatus = 2
        push.send([
          wireutil.global
        , wireutil.envelope(new wire.DeviceStatusMessage(
            options.serial
          , wireutil.toDeviceStatus("connecting")
          ))
        ])
      }else if(resp!="error" && curStatus!=1){
        log.info("WDA Status is true,set the device status to device(3)")
        curStatus = 1
        push.send([
          wireutil.global
        , wireutil.envelope(new wire.DeviceStatusMessage(
            options.serial
          , wireutil.toDeviceStatus("device")
          ))
        ])
      }
    })
    wda.on('screenshot',function(resp) {
      plugin.emit('screenshot',resp.value)
    })
    wda.on('weaknet', function(resp) {
      plugin.emit('weaknet', resp.value)
    })

    lifecycle.observe(function() {
      return true
    })

    return plugin.rout()
})
