var util = require('util')

var syrup = require('stf-syrup')
var Promise = require('bluebird')

var logger = require('../../../util/logger')
var grouputil = require('../../../util/grouputil')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')
var lifecycle = require('../../../util/lifecycle')
var SubpPocess = require("teen_process").SubProcess
var util = require('util')

module.exports = syrup.serial()
  .dependency(require('../support/router'))
  .dependency(require('../support/push'))
  .dependency(require('./group'))
  .dependency(require('./solo'))
  .dependency(require('./util/urlformat'))
  .define(function(options, router, push, group, solo, urlformat) {
    var log = logger.createLogger('ios-device:plugins:connect')
    var plugin = Object.create(null)
    var activeServer = null

    plugin.port = options.connectPort
    plugin.url = urlformat(options.connectUrlPattern, plugin.port)

    plugin.start = function() {
      return new Promise(function(resolve, reject) {
        if (plugin.isRunning()) {
          return resolve(plugin.url)
        }
        activeServer = new SubpPocess("socat",
          [
            util.format('TCP-LISTEN:%d,reuseaddr,fork',plugin.port)
            ,'UNIX-CONNECT:/var/run/usbmuxd'
          ]
        )
        activeServer.on('stream-line',line=>{
        })
        activeServer.start()
        lifecycle.share('Remote ADB', activeServer)
        return resolve(plugin.url)
      })
    }

    plugin.stop = Promise.method(async function() {
      if (plugin.isRunning()) {
        try{
          await activeServer.stop()
          activeServer = null
        }catch(err){}
      }
    })

    plugin.isRunning = function() {
      return activeServer!=null
    }

    lifecycle.observe(plugin.stop)
    //group.on('leave', plugin.stop)

    router
      .on(wire.ConnectStartMessage, function(channel) {
        var reply = wireutil.reply(options.serial)
        plugin.start()
          .then(function(url) {
            push.send([
              channel
            , reply.okay(url)
            ])

            // Update DB
            push.send([
              channel
            , wireutil.envelope(new wire.ConnectStartedMessage(
                options.serial
              , url
              ))
            ])
            log.important('Remote Connect Started for device "%s" at "%s"', options.serial, url)
          })
          .catch(function(err) {
            log.error('Unable to start remote connect service', err.stack)
            push.send([
              channel
            , reply.fail(err.message)
            ])
          })
      })
      .on(wire.ConnectStopMessage, function(channel) {
        var reply = wireutil.reply(options.serial)
        plugin.stop()
          .then(function() {
            push.send([
              channel
            , reply.okay()
            ])
            // Update DB
            push.send([
              channel
            , wireutil.envelope(new wire.ConnectStoppedMessage(
                options.serial
              ))
            ])
            log.important('Remote Connect Stopped for device "%s"', options.serial)
          })
          .catch(function(err) {
            log.error('Failed to stop connect service', err.stack)
            push.send([
              channel
            , reply.fail(err.message)
            ])
          })
      })

    return plugin.start()
      .return(plugin)
  })
