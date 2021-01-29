var util = require('util')

var syrup = require('stf-syrup')
var EventEmitter = require('eventemitter3')
var lifecycle = require('../../../../util/lifecycle')
var Promise = require('bluebird')

var logger = require('../../../../util/logger')
var DeviceInfo = require('../../support/deviceinfo')

module.exports = syrup.serial()
  .dependency(require('../service'))
  .dependency(require('../screen/options'))
  .define(function(options, service, screenOptions) {
    var log = logger.createLogger('ios-device:plugins:display')
    var rotationMap = [0,0,180,90,270,0,0]

    function Display(id, properties) {
      this.id = id
      this.properties = properties
    }

    util.inherits(Display, EventEmitter)

    Display.prototype.updateRotation = function(newRotation) {
      this.properties.rotation = rotationMap[newRotation]
      service.updateRotation(rotationMap[newRotation])
    }

    Display.prototype.updateFrameRate = function(framerate){
      service.setFrameRate(framerate)
    }

    function readInfo(id) {
      log.info('Reading display info')
      rect = DeviceInfo.getDisplay(options.serial,options.type)
      properties = {id:id,width:rect.width,height:rect.height,rotation:0,xdpi:0,ydpi:0,fps:60.0,
          density:1.0,secure:false,url:screenOptions.publicUrl,size:0}
      return Promise.resolve(new Display(id,properties))
    }

    lifecycle.observe(function() {
        return true
    })

    return readInfo(0).then(function(display){
      return display
    })
  })
