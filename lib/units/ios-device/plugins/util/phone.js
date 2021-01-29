var syrup = require('stf-syrup')

var logger = require('../../../../util/logger')

module.exports = syrup.serial()
  .define(function(options) {
    var log = logger.createLogger('ios-device:plugins:phone')

    function fetch() {
      log.info('Fetching phone info')
      return {imei:"",imsi:"",phoneNumber:"",iccid:"",network:""}
    }

    return fetch()
  })
