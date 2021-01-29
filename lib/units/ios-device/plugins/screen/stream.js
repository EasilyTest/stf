var util = require('util')

var Promise = require('bluebird')
var syrup = require('stf-syrup')
var WebSocket = require('ws')
var uuid = require('uuid')
var EventEmitter = require('eventemitter3')
var split = require('split')
var adbkit = require('adbkit')
var net = require('net')
var sharp = require('sharp')

var logger = require('../../../../util/logger')
var lifecycle = require('../../../../util/lifecycle')
var bannerutil = require('./util/banner')
var FrameParser = require('./util/frameparser')
var FrameConfig = require('./util/frameconfig')
var BroadcastSet = require('./util/broadcastset')
var StateQueue = require('../../../../util/statequeue')
var RiskyStream = require('../../../../util/riskystream')
var FailCounter = require('../../../../util/failcounter')

module.exports = syrup.serial()
  .dependency(require('../util/display'))
  .dependency(require('./options'))
  .define(function(options, display, screenOptions) {
    var log = logger.createLogger('ios-device:plugins:screen:stream')
    var framerate = 65

    function FrameProducer(config) {
      EventEmitter.call(this)
      this.actionQueue = []
      this.runningState = FrameProducer.STATE_STOPPED
      this.desiredState = new StateQueue()
      this.output = null
      this.socket = null
      this.pid = -1
      this.banner = null
      this.parser = null
      this.frameConfig = config
      this.readable = false
      this.needsReadable = false
      this.failCounter = new FailCounter(3, 10000)
      this.failCounter.on('exceedLimit', this._failLimitExceeded.bind(this))
      this.failed = false
      this.readableListener = this._readableListener.bind(this)
    }

    util.inherits(FrameProducer, EventEmitter)

    FrameProducer.STATE_STOPPED = 1
    FrameProducer.STATE_STARTING = 2
    FrameProducer.STATE_STARTED = 3
    FrameProducer.STATE_STOPPING = 4

    FrameProducer.prototype._ensureState = function() {
      if (this.desiredState.empty()) {
        return
      }

      if (this.failed) {
        log.warn('Will not apply desired state due to too many failures')
        return
      }

      switch (this.runningState) {
      case FrameProducer.STATE_STARTING:
      case FrameProducer.STATE_STOPPING:
        // Just wait.
        break
      case FrameProducer.STATE_STOPPED:
        if (this.desiredState.next() === FrameProducer.STATE_STARTED) {
          this.runningState = FrameProducer.STATE_STARTING
          this._startService()
            this.parser = new FrameParser()
            var banner={ version: 1
              , length: 24
              , pid: 1
              , realWidth: display.properties.width
              , realHeight: display.properties.height
              , virtualWidth: options.vncInitialSize[0]
              , virtualHeight: options.vncInitialSize[1]
              , orientation: display.properties.rotation
              , quirks: {
                  dumb: false
                , alwaysUpright: true
                , tear: false
              }
            }
            this.banner = banner
            this._readFrames(this.socket)
            this.runningState = FrameProducer.STATE_STARTED
            this.emit('start')
            this._ensureState()
            //})
        }
        else {
          setImmediate(this._ensureState.bind(this))
        }
        break
      case FrameProducer.STATE_STARTED:
        if (this.desiredState.next() === FrameProducer.STATE_STOPPED) {
          this.runningState = FrameProducer.STATE_STOPPING
          this._stop().finally(function() {
            this._ensureState()
          })
        }
        else {
          setImmediate(this._ensureState.bind(this))
        }
        break
      }
    }

    FrameProducer.prototype.start = function() {
      log.info('Requesting frame producer to start')
      this.desiredState.push(FrameProducer.STATE_STARTED)
      this._ensureState()
    }

    FrameProducer.prototype.stop = function() {
      log.info('Requesting frame producer to stop')
      this.desiredState.push(FrameProducer.STATE_STOPPED)
      this._ensureState()
    }

    FrameProducer.prototype.restart = function() {
      switch (this.runningState) {
      case FrameProducer.STATE_STARTED:
      case FrameProducer.STATE_STARTING:
        this.desiredState.push(FrameProducer.STATE_STOPPED)
        this.desiredState.push(FrameProducer.STATE_STARTED)
        this._ensureState()
        break
      }
    }

    FrameProducer.prototype.updateRotation = function(rotation) {
      if (this.frameConfig.rotation === rotation) {
        log.info('Keeping %d as current frame producer rotation', rotation)
        return
      }

      log.info('Setting frame producer rotation to %d', rotation)
      this.frameConfig.rotation = rotation
      this._configChanged()
    }

    FrameProducer.prototype.updateProjection = function(width, height) {
      if (this.frameConfig.virtualWidth === width &&
          this.frameConfig.virtualHeight === height) {
        log.info(
          'Keeping %dx%d as current frame producer projection', width, height)
        return
      }

      log.info('Setting frame producer projection to %dx%d', width, height)
      this.frameConfig.virtualWidth = width
      this.frameConfig.virtualHeight = height
      this._configChanged()
    }

    FrameProducer.prototype.nextFrame = function() {
      var frame = null
      var chunk
      if (this.parser && this.socket) {
        if(this.parser.rotation>-1&&this.parser.rotation<7){
          display.updateRotation(this.parser.rotation)
        }
        while ((frame = this.parser.nextFrame()) === null) {
          if(this.socket){
            chunk = this.socket.read()
          }
          if (chunk) {
            this.parser.push(chunk)
          }
          else {
            this.readable = false
            break
          }
        }
      }

      return frame
    }

    FrameProducer.prototype.needFrame = function() {
      this.needsReadable = true
      this._maybeEmitReadable()
    }

    FrameProducer.prototype._configChanged = function() {
      this.restart()
    }

    FrameProducer.prototype._failLimitExceeded = function(limit, time) {
      this._stop()
      this.failed = true
      this.emit('error', new Error(util.format(
        'Failed more than %d times in %dms'
      , limit
      , time
      )))
    }

    FrameProducer.prototype._startService = function() {
      log.info('Launching screen service')
      this.socket = net.connect({
        port: screenOptions.devicePort
      })
      this.socket.write("start send jpeg")
    }

    FrameProducer.prototype._stop = function() {
      return this._disconnectService(this.socket).bind(this)
        .timeout(2000)
        .then(function() {
          return this._stopService(this.output).timeout(10000)
        })
        .then(function() {
          this.runningState = FrameProducer.STATE_STOPPED
          this.emit('stop')
        })
        .catch(function(err) {
          // In practice we _should_ never get here due to _stopService()
          // being quite aggressive. But if we do, well... assume it
          // stopped anyway for now.
          this.runningState = FrameProducer.STATE_STOPPED
          this.emit('error', err)
          this.emit('stop')
        })
        .finally(function() {
          this.output = null
          this.socket = null
          this.pid = -1
          this.banner = null
          this.parser = null
        })
    }

    FrameProducer.prototype._disconnectService = function(socket) {
      log.info('Disconnecting from minicap service')
      if(this.socket){
        this.socket.removeListener('readable', this.readableListener)
      }
      return Promise.resolve(true)
    }

    FrameProducer.prototype._stopService = function(output) {
      log.info('Stopping minicap service')
      if(this.socket){
        this.socket.destroy()
        this.socket = null
      }
      return Promise.resolve(true)
    }

    FrameProducer.prototype._readFrames = function(socket) {
      this.needsReadable = true
      if(this.socket){
        this.socket.on('readable', this.readableListener)
      }
      // We may already have data pending. Let the user know they should
      // at least attempt to read frames now.
      this.readableListener()
    }

    FrameProducer.prototype._maybeEmitReadable = function() {
      if (this.readable && this.needsReadable) {
        this.needsReadable = false
        this.emit('readable')
      }
    }

    FrameProducer.prototype._readableListener = function() {
      this.readable = true
      this._maybeEmitReadable()
    }

    function createServer() {
      log.info('Starting WebSocket server on port %d', screenOptions.publicPort)

      var wss = new WebSocket.Server({
        port: screenOptions.publicPort
      , perMessageDeflate: false
      })

      var listeningListener, errorListener
      return new Promise(function(resolve, reject) {
          listeningListener = function() {
            return resolve(wss)
          }

          errorListener = function(err) {
            return reject(err)
          }

          wss.on('listening', listeningListener)
          wss.on('error', errorListener)
        })
        .finally(function() {
          wss.removeListener('listening', listeningListener)
          wss.removeListener('error', errorListener)
        })
    }

    return createServer()
      .then(function(wss) {
        var frameProducer = new FrameProducer(
          new FrameConfig(display.properties, display.properties))
        var broadcastSet = frameProducer.broadcastSet = new BroadcastSet()

        broadcastSet.on('nonempty', function() {
          frameProducer.start()
        })

        broadcastSet.on('empty', function() {
          frameProducer.stop()
        })

        broadcastSet.on('insert', function(id) {
          // If two clients join a session in the middle, one of them
          // may not release the initial size because the projection
          // doesn't necessarily change, and the producer doesn't Getting
          // restarted. Therefore we have to call onStart() manually
          // if the producer is already up and running.
          switch (frameProducer.runningState) {
          case FrameProducer.STATE_STARTED:
            broadcastSet.get(id).onStart(frameProducer)
            break
          }
        })

        display.on('rotationChange', function(newRotation) {
          frameProducer.updateRotation(newRotation)
        })

        frameProducer.on('start', function() {
          broadcastSet.keys().map(function(id) {
            return broadcastSet.get(id).onStart(frameProducer)
          })
        })

        frameProducer.on('readable', function next() {
          var frame = frameProducer.nextFrame()
          if (frame) {
            Promise.settle([broadcastSet.keys().map(function(id) {
              return broadcastSet.get(id).onFrame(frame)
            })]).then(next)
          }
          else {
            frameProducer.needFrame()
          }
        })

        frameProducer.on('error', function(err) {
          log.fatal('Frame producer had an error', err.stack)
          lifecycle.fatal()
        })

        wss.on('connection', function(ws) {
          var id = uuid.v4()
          var pingTimer
          var lastsenttime = 0
          var index=0
          function send(message, options) {
            return new Promise(function(resolve, reject) {
              switch (ws.readyState) {
              case WebSocket.OPENING:
                // This should never happen.
                log.warn('Unable to send to OPENING client "%s"', id)
                break
              case WebSocket.OPEN:
                // This is what SHOULD happen.
                //log.info('send image data to web')
                //index++
                //if(index%5==0){
                //    break
                //}
                //else{
                ws.send(message, options, function(err) {
                  return err ? reject(err) : resolve()
                })
                //}
                break
              case WebSocket.CLOSING:
                // Ok, a 'close' event should remove the client from the set
                // soon.
                break
              case WebSocket.CLOSED:
                // This should never happen.
                log.warn('Unable to send to CLOSED client "%s"', id)
                clearInterval(pingTimer)
                broadcastSet.remove(id)
                break
              }
            })
          }

          function wsStartNotifier() {
            return send(util.format(
              'start %s'
            , JSON.stringify(frameProducer.banner)
            ))
          }

          function wsPingNotifier() {
            return send('ping')
          }

          function wsFrameNotifier(frame) {
            var width = display.properties.width
            var div = 1.5
            if(width>1000){
              div = 2
            }
            if(display.properties.rotation!=0){
              width = display.properties.height
            }
            if(framerate>30){
              div = div
            }
            else if(framerate>15){
              div = Math.floor(div+1)
            }
            else{
              div = Math.floor(div+2)
            }
            width = Math.floor(width/div)
            if(lastsenttime === 0 || Date.now() - lastsenttime > 1000 / framerate) {
              lastsenttime = Date.now()
              display.emit("screen",frame)
              sharp(frame).resize({width:width}).rotate().toBuffer()
              .then(data=>{
                  return send(data, {
                  binary: true
                })
              }).catch(function(err){})
            }
          }

          // Sending a ping message every now and then makes sure that
          // reverse proxies like nginx don't time out the connection [1].
          //
          // [1] http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout
          pingTimer = setInterval(wsPingNotifier, options.screenPingInterval)

          ws.on('message', function(data) {
            var match = /^(on|off|(size) ([0-9]+)x([0-9]+))$/.exec(data)
            if (match) {
              switch (match[2] || match[1]) {
              case 'on':
                broadcastSet.insert(id, {
                  onStart: wsStartNotifier
                , onFrame: wsFrameNotifier
                })
                break
              case 'off':
                broadcastSet.remove(id)
                // Keep pinging even when the screen is off.
                break
              case 'size':
                frameProducer.updateProjection(
                  Number(match[3]), Number(match[4]))
                break
              }
            }
            else{
              if(data !== 'undefined') {
                framerate = data
              }
              else {
                framerate = 90
              }
              log.info('user set framerate：' + framerate)
              display.updateFrameRate(framerate)
            }
          })

          ws.on('close', function() {
            clearInterval(pingTimer)
            broadcastSet.remove(id)
            if(this.socket){
              this.socket.destroy()
              this.socket = null
            }
          })
        })

        lifecycle.observe(function() {
          wss.close()
        })

        lifecycle.observe(function() {
          frameProducer.stop()
        })

        return frameProducer
      })
  })
