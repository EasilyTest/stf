var syrup = require('stf-syrup')
var Promise = require('bluebird')

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')
var lifecycle = require('../../../util/lifecycle')
var SubpPocess = require("teen_process").SubProcess
var util = require('util')

module.exports = syrup.serial()
  .dependency(require('../support/router'))
  .dependency(require('../support/push'))
  .dependency(require('./group'))
  .define(function(options, router, push, group) {
    var log = logger.createLogger('ios-device:plugins:logcat')
    var plugin = Object.create(null)
    var activeLogcat = null
    var channel = null

    plugin.parseLog = function(data){
      if(data.indexOf('[')==-1 || data.indexOf('testmanagerd')!=-1)
        return null
      return {
        date:Date.now(),
        pid:0,
        tid:0,
        tag:'',
        priority:4,
        message:data
      }
    }

    plugin.dataListener = function(data) {
      var entry = plugin.parseLog(data)
      if(entry==null)
        return
      push.send([
        channel
      , wireutil.envelope(new wire.DeviceLogcatEntryMessage(
          options.serial
        , entry.date / 1000
        , entry.pid
        , entry.tid
        , entry.priority
        , entry.tag
        , entry.message
        ))
      ])
    }

    plugin.start = function(filters) {
      return group.get().then(function(group){
        channel = group.group
        plugin.stop()
          .then(function() {
            log.info('Starting idevicesyslog')
            var param = ['-u',options.serial,'-d']
            if(filters.length){
              param = ['-u',options.serial,'-d','|grep',filters[0]]
            }
            activeLogcat = new SubpPocess("idevicesyslog",param)
            activeLogcat.start()
            activeLogcat.on('stream-line', plugin.dataListener)
          })
      })
    }

    plugin.stop = Promise.method(async function() {
      if (plugin.isRunning()) {
        log.info('Stopping idevicesyslog')
        activeLogcat.removeListener('stream-line', plugin.dataListener)
        await activeLogcat.stop()
        activeLogcat = null
      }
    })

    plugin.isRunning = function() {
      return activeLogcat!=null
    }

    lifecycle.observe(plugin.stop)
    group.on('leave', plugin.stop)

    router
      .on(wire.LogcatStartMessage, function(channel, message) {
        var reply = wireutil.reply(options.serial)
        plugin.start(message.filters)
          .then(function() {
            push.send([
              channel
            , reply.okay('success')
            ])
          })
          .catch(function(err) {
            log.error('Unable to start idevicesyslog', err.stack)
            push.send([
              channel
            , reply.fail('fail')
            ])
          })
      })
      .on(wire.LogcatApplyFiltersMessage, function(channel, message) {
        var reply = wireutil.reply(options.serial)
        plugin.start(message.filters)
          .then(function() {
            push.send([
              channel
            , reply.okay('success')
            ])
          })
          .catch(function(err) {
            log.error('Failed to apply logcat filters', err.stack)
            push.send([
              channel
            , reply.fail('fail')
            ])
          })
      })
      .on(wire.LogcatStopMessage, function(channel) {
        var reply = wireutil.reply(options.serial)
        plugin.stop()
          .then(function() {
            push.send([
              channel
            , reply.okay('success')
            ])
          })
          .catch(function(err) {
            log.error('Failed to stop idevicesyslog', err.stack)
            push.send([
              channel
            , reply.fail('fail')
            ])
          })
      })

    return plugin
  })
