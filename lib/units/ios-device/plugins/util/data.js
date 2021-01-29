var syrup = require('stf-syrup')
var deviceData = require('stf-device-db')

var logger = require('../../../../util/logger')

module.exports = syrup.serial()
  .dependency(require('./identity'))
  .define(function(options, identity) {
    var log = logger.createLogger('ios-device:plugins:data')

    function find() {
      var data = deviceData.find(identity)
      if (!data) {
        log.warn('Unable to find device data', identity)
      }
      console.dir(data)
      return data
    }

    return find()
  })