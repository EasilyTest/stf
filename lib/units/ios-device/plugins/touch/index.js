var util = require('util')

var Promise = require('bluebird')
var syrup = require('stf-syrup')
var split = require('split')
var EventEmitter = require('eventemitter3')
//var adbkit = require('adbkit')
var Parser = require('adbkit/lib/adb/parser')

var wire = require('../../../../wire')
var logger = require('../../../../util/logger')
var lifecycle = require('../../../../util/lifecycle')
var SeqQueue = require('../../../../wire/seqqueue')
var StateQueue = require('../../../../util/statequeue')
var RiskyStream = require('../../../../util/riskystream')
var FailCounter = require('../../../../util/failcounter')

module.exports = syrup.serial()
  .dependency(require('../wdaCommands'))
  .dependency(require('../../support/router'))
  .dependency(require('../util/display'))
  .dependency(require('../util/flags'))
  .define(function(options, wda, router, display, flags) {
    var log = logger.createLogger('ios-device:plugins:touch')
    var touchTime = 0
    var lastMoveTime = 0
    var bIsTouch = false
    var startX = 0
    var startY = 0
    var endX = 0
    var endY = 0
    var swipeList = []
    var preMovePoint = {x: 0, y: 0}

    function TouchConsumer(config) {
      EventEmitter.call(this)
      this.actionQueue = []
      this.runningState = TouchConsumer.STATE_STOPPED
      this.desiredState = new StateQueue()
      this.output = null
      this.socket = null
      this.banner = null
      this.touchConfig = config
      this.starter = Promise.resolve(true)
      this.failCounter = new FailCounter(3, 10000)
      this.failCounter.on('exceedLimit', this._failLimitExceeded.bind(this))
      this.failed = false
      this.writeQueue = []
      this.maxPressure = 0
      this.bIsMove = false
      this.bDrag = false
      this.touchCount = 0
      this.bTouchUp = false
      var div = 2
      if(display.properties.width > 1000 && display.properties.width < 1500) {
        div = 3
      }
      else if(display.properties.width > 1500) {
        div = 2
      }
      this.width = display.properties.width / div
      this.height = display.properties.height / div
    }

    util.inherits(TouchConsumer, EventEmitter)

    TouchConsumer.STATE_STOPPED = 1
    TouchConsumer.STATE_STARTING = 2
    TouchConsumer.STATE_STARTED = 3
    TouchConsumer.STATE_STOPPING = 4

    TouchConsumer.prototype.translate = function(x,y){
      var retVal = {x:x,y:y}
      switch (display.properties.rotation) {
        case 90:
          retVal.x = y
          retVal.y = this.width - x
          break
        case 180:
          retVal.x  = this.width - x
          retVal.y = this.height - y
          break
        case 270:
          retVal.y = x
          retVal.x  = this.height - y
          break
      }
      return retVal
    }

    TouchConsumer.prototype.touchDown = function(point) {
      this.bTouchUp = false
      touchTime = Date.now()
      lastMoveTime = touchTime
      this.touchCount+=1
      startX = point.x * this.width
      startY = point.y * this.height
      bIsTouch = true
      this.bIsMove = false
      // var val = this.translate(startX,startY)
      // startX = val.x
      // startY = val.y
      preMovePoint.x = startX
      preMovePoint.y = startY
      // log.info("start point:" + startX + " " + startY)
    }

    TouchConsumer.prototype.touchMove = function(point) {
      endX = point.x * this.width
      endY = point.y * this.height
      if(Math.abs(startX - endX) < 10 && Math.abs(startY - endY) < 10) {
        //移动点小于10个像素,认为是在同一个点
        if(Date.now()-touchTime>=10000){
          //同一个像素点停留1.5s-3s,则认为是drag事件
          this.bDrag = true
          bIsTouch = false
        }
      }
      else{
        this.bIsMove = true
        bIsTouch = false
      }
      if(Math.abs(preMovePoint.x - endX) > 50 || Math.abs(preMovePoint.y - endY) > 50) {
        // let val = this.translate(endX,endY)
        // endX = val.x
        // endY = val.y
        // log.info("end point:" + endX + " " + endY)
        swipeList.push({x: endX, y: endY, t:Date.now() - lastMoveTime})
        preMovePoint.x = endX
        preMovePoint.y = endY
        lastMoveTime = Date.now()
      }
    }

    TouchConsumer.prototype.touchUp = function(point) {
      this.bTouchUp =true
      if(this.bDrag){
        //drag事件且移动距离超过50像素
        if(Math.abs(startX - endX) > 50 || Math.abs(startY - endY) > 50){
          wda.drag(startX, startY, endX, endY,0.5)
          this.bIsMove =false
        }
      }
      if(this.bIsMove) {
        var duration = Date.now() - touchTime
        swipeList.push({x: endX, y: endY, t:Date.now() - lastMoveTime})
        if (duration < 50) {
          duration = 50
        }

        swipeList.unshift({x: startX, y: startY})
        wda.swipe(swipeList, duration)
      }
      else if(bIsTouch) {
        var duration = Date.now() - touchTime
        eX = point.x * this.width
        eY = point.y * this.height
        if(duration > 1000 ){
          swipeList.push({x: startX+5, y: startY+5, t: duration})
          swipeList.unshift({x: startX, y: startY})
          wda.swipe(swipeList, duration)
        }else{
          wda.click(startX, startY, 0)
        }
       }
      this.touchReset()
    }

    TouchConsumer.prototype.touchCommit = function() {
    }

    TouchConsumer.prototype.touchReset = function() {
      touchTime = Date.now()
      startX = startY = endX = endY = 0
      bIsTouch = false
      this.bIsMove = false
      this.bIsMove = false
      this.bDrag = false
      swipeList = []
      preMovePoint = {x: 0, y: 0}
    }

    TouchConsumer.prototype.tap = function(point) {
      this.touchDown(point)
      this.touchCommit()
      this.touchUp(point)
      this.touchCommit()
    }

    TouchConsumer.prototype._ensureState = function() {
      if (this.desiredState.empty()) {
        return
      }

      if (this.failed) {
        log.warn('Will not apply desired state due to too many failures')
        return
      }

      switch (this.runningState) {
      case TouchConsumer.STATE_STARTING:
      case TouchConsumer.STATE_STOPPING:
        // Just wait.
        break
      case TouchConsumer.STATE_STOPPED:
        if (this.desiredState.next() === TouchConsumer.STATE_STARTED) {
          this.runningState = TouchConsumer.STATE_STARTING
            this.runningState = TouchConsumer.STATE_STARTED
            this.emit('start')
            this._ensureState()
        }
        else {
          setImmediate(this._ensureState.bind(this))
        }
        break
      case TouchConsumer.STATE_STARTED:
        if (this.desiredState.next() === TouchConsumer.STATE_STOPPED) {
          this.runningState = TouchConsumer.STATE_STOPPING
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

    TouchConsumer.prototype.start = function() {
      log.info('Requesting touch consumer to start')
      this.desiredState.push(TouchConsumer.STATE_STARTED)
      this._ensureState()
    }

    TouchConsumer.prototype.stop = function() {
      log.info('Requesting touch consumer to stop')
      this.desiredState.push(TouchConsumer.STATE_STOPPED)
      this._ensureState()
    }

    TouchConsumer.prototype.restart = function() {
      switch (this.runningState) {
      case TouchConsumer.STATE_STARTED:
      case TouchConsumer.STATE_STARTING:
        this.starter.cancel()
        this.desiredState.push(TouchConsumer.STATE_STOPPED)
        this.desiredState.push(TouchConsumer.STATE_STARTED)
        this._ensureState()
        break
      }
    }

    TouchConsumer.prototype._configChanged = function() {
      this.restart()
    }

    TouchConsumer.prototype._failLimitExceeded = function(limit, time) {
      this._stop()
      this.failed = true
      this.emit('error', new Error(util.format(
        'Failed more than %d times in %dms'
      , limit
      , time
      )))
    }

    TouchConsumer.prototype._stop = function() {
      return this._disconnectService(this.socket).bind(this)
        .timeout(2000)
        .then(function() {
          return this._stopService(this.output).timeout(10000)
        })
        .then(function() {
          this.runningState = TouchConsumer.STATE_STOPPED
          this.emit('stop')
        })
        .catch(function(err) {
          // In practice we _should_ never get here due to _stopService()
          // being quite aggressive. But if we do, well... assume it
          // stopped anyway for now.
          this.runningState = TouchConsumer.STATE_STOPPED
          this.emit('error', err)
          this.emit('stop')
        })
        .finally(function() {
          this.output = null
          this.socket = null
          this.banner = null
        })
    }

    TouchConsumer.prototype._disconnectService = function(socket) {
      log.info('Disconnecting from minitouch service')
      return Promise.resolve(true)
    }

    TouchConsumer.prototype._stopService = function(output) {
      log.info('Stopping minitouch service')
      return Promise.resolve(true)
    }

    function startConsumer() {
      var touchConsumer = new TouchConsumer({
        // Usually the touch origin is the same as the display's origin,
        // but sometimes it might not be.
        origin: (function(origin) {
          log.info('Touch origin is %s', origin)
          return {
            'top left': {
              x: function(point) {
                return point.x
              }
            , y: function(point) {
                return point.y
              }
            }
            // So far the only device we've seen exhibiting this behavior
            // is Yoga Tablet 8.
          , 'bottom left': {
              x: function(point) {
                return 1 - point.y
              }
            , y: function(point) {
                return point.x
              }
            }
          }[origin]
        })(flags.get('forceTouchOrigin', 'top left'))
      })

      var startListener, errorListener

      return new Promise(function(resolve, reject) {
        touchConsumer.on('start', startListener = function() {
          resolve(touchConsumer)
        })

        touchConsumer.on('error', errorListener = reject)

        touchConsumer.start()
      })
      .finally(function() {
        touchConsumer.removeListener('start', startListener)
        touchConsumer.removeListener('error', errorListener)
      })
    }

    return startConsumer()
      .then(function(touchConsumer) {
        var queue = new SeqQueue(100, 4)

        touchConsumer.on('error', function(err) {
          log.fatal('Touch consumer had an error', err.stack)
          lifecycle.fatal()
        })

        router
          .on(wire.GestureStartMessage, function(channel, message) {
            queue.start(message.seq)
          })
          .on(wire.GestureStopMessage, function(channel, message) {
            queue.push(message.seq, function() {
              queue.stop()
            })
          })
          .on(wire.TouchDownMessage, function(channel, message) {
            queue.push(message.seq, function() {
              touchConsumer.touchDown(message)
            })
          })
          .on(wire.TouchMoveMessage, function(channel, message) {
            queue.push(message.seq, function() {
              touchConsumer.touchMove(message)
            })
          })
          .on(wire.TouchUpMessage, function(channel, message) {
            queue.push(message.seq, function() {
              touchConsumer.touchUp(message)
            })
          })
          .on(wire.TouchCommitMessage, function(channel, message) {
            queue.push(message.seq, function() {
              touchConsumer.touchCommit()
            })
          })
          .on(wire.TouchResetMessage, function(channel, message) {
            queue.push(message.seq, function() {
              touchConsumer.touchReset()
            })
          })

        return touchConsumer
      })
  })
