var syrup = require('stf-syrup')
var execSync = require("child_process").execSync
var SubpPocess = require("teen_process").SubProcess
var util = require("util")
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var lifecycle = require('../../../util/lifecycle')
var SubpPocess = require("teen_process").SubProcess

var logger = require('../../../util/logger')


module.exports = syrup.serial()
.define(function(options){
  var log = logger.createLogger('ios-device:plugins:ios-deploy')
  var plugin = new EventEmitter()

  plugin.install=function(serial,file,type='device'){
    log.info("start installing package",file);
    var params = ['-i', file,'-u',serial]
    var cmd = 'ideviceinstaller'
    if(type=='emulator'){
      cmd = 'xcrun'
      params = ['simctl','install',serial,file]
    }
    wdaPro = new SubpPocess(cmd,params)
    wdaPro.start()
    wdaPro.on("exit",(code,signal)=>{
        this.emit('end',"install finish")
    });
    wdaPro.on("stream-line",line=>{
        if(line.indexOf("- Error occurred:")!=-1){
            this.emit('error',line)
        }
        else if(line.indexOf('(')!=-1){
            prostr = line.slice(line.indexOf('(')+1,line.indexOf('%'))
            this.emit("installing_app",parseInt(prostr,10))
        }
        else if(line.indexOf('Complete')!=-1){
            this.emit('installing_app',100)
        }
    })
    return Promise.resolve()
  }

  plugin.uninstall=function(serial,package,type='device'){
    log.info("start uninstalling package",package);
    var params = ['-U', package,'-u',serial]
    var cmd = "ideviceinstaller"
    if(type=='emulator'){
      cmd = 'xcrun'
      params = ['simctl','uninstall',serial,package]
    }
    wdaPro = new SubpPocess(cmd,params)
    wdaPro.start()
    wdaPro.on("exit",(code,signal)=>{
    });
    wdaPro.on("stream-line",line=>{
        log.info(line)
    })
    return Promise.resolve()
  }

  lifecycle.observe(function() {
    return true
  })

  return plugin
})
