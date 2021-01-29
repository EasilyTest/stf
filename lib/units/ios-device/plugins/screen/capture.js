var util = require('util')

var syrup = require('stf-syrup')
var execSync = require('child_process').execSync

var logger = require('../../../../util/logger')
var wire = require('../../../../wire')
var wireutil = require('../../../../wire/util')
var images = require('images')
var Promise = require('bluebird')

module.exports = syrup.serial()
  .dependency(require('../../support/router'))
  .dependency(require('../../support/push'))
  .dependency(require('../../support/storage'))
  .define(function(options, router, push, storage) {
    var log = logger.createLogger('ios-device:plugins:screen:capture')
    var plugin = Object.create(null)

    plugin.capture = function() {
      log.info('Capturing screenshot')
      var filename = options.serial+".png";
      cmd = "idevicescreenshot -u "+options.serial+" "+filename;
      if(options.type=='emulator'){
        cmd = util.format("xcrun simctl io %s screenshot %s.png",options.serial,options.serial)
      }
      stdout = execSync(cmd,{});
      img = images(filename);
      transfer = img.encode('jpg');
      cmd = 'rm '+filename;
      execSync(cmd,{});
      return storage.store('blob', transfer, {
        filename: util.format('%s.jpg', options.serial)
      , contentType: 'image/jpeg'
      , knownLength: transfer.length
      })
    }

    router.on(wire.ScreenCaptureMessage, function(channel) {
      var reply = wireutil.reply(options.serial)
      plugin.capture()
        .then(function(file) {
          push.send([
            channel
          , reply.okay('success', file)
          ])
        })
        .catch(function(err) {
          log.error('Screen capture failed', err.stack)
          push.send([
            channel
          , reply.fail(err.message)
          ])
        })
    })

    return plugin
  })
