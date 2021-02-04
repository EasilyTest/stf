
var syrup = require('stf-syrup')
var execSync = require("child_process").execSync
var SubpPocess = require("teen_process").SubProcess
var util = require("util")
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var lifecycle = require('../../../util/lifecycle')
var path = require('path')

var logger = require('../../../util/logger')

module.exports = syrup.serial()
.dependency(require('./wdaCommands'))
.define(function(options,wda){
  var log = logger.createLogger('ios-device:plugins:wdaProxy')
  var plugin = new EventEmitter()
  var wdaPro = null;
  var proxyProMap = new Map()
  var exit = false
  var bRestart = true
  var wdaPath = options.wdaPath
  var bRestartCnt = 0
  var batteryTimer = null
  var checkTimer = null

  wda.on('restart',function(){
    if(!bRestart)
      return 
    plugin.stopWda()
  })

  plugin.start = async function(){
    if(options.type=='device'){
      proxyProMap.set(options.wdaPort,plugin.startIproxy(options.wdaPort,options.wdaRemotePort))
      proxyProMap.set(options.mjpegPort,plugin.startIproxy(options.mjpegPort,options.wdaMjpegRemotePort))
    }
    return plugin.startWda().then(function(){
      return plugin
    })
  }

  plugin.restartIproxy = function(localPort,remotePort){
    if (!exit){
      proxyPro = null;
      proxyProMap.set(localPort,plugin.startIproxy(localPort,remotePort));
    }
  };

  plugin.startIproxy = function(localPort,remotePort){
    log.info("start iproxy with params:%d %d %s",localPort,remotePort,options.serial)
    pro = new SubpPocess("iproxy",[localPort,remotePort,"-l","-s","127.0.0.1","-u",options.serial])
    pro.start();
    pro.on("exit",(code,signal)=>{
      log.info("exit with code :%d",code)
      plugin.restartIproxy(localPort,remotePort);
    });
    pro.on("output",(stdout,stderr)=>{
    });
    return pro
  };

  plugin.restartWda = function(){
    if (!exit && bRestart){
      bRestartCnt=bRestartCnt+1 
      /*if(bRestartCnt>3){
        log.info("more than 3 times attemp to restart WDA.removing WDA and reboot the device")
        var uninstall = new SubpPocess("ideviceinstaller",["--udid",options.serial,
          "--uninstall","com.apple.test.WebDriverAgentRunner-Runner"])
        uninstall.start()
        var reboot = new SubpPocess("idevicediagnostics",["restart","-u",options.serial])
        reboot.start()
        bRestart = false
        plugin.end()
      }
      else{*/
      plugin.startWda();
    }
  };

  plugin.startWda = function(){
    var platform = ""
    if(options.type=='emulator'){
      platform = " Simulator"
    }
    //var uninstall = new SubpPocess("ideviceinstaller",["--udid",options.serial,
    //      "--uninstall","com.apple.test.WebDriverAgentRunner-Runner"])
    //uninstall.start()
    //var params = ['build-for-testing', 'test-without-building','-project',path.join(wdaPath,'WebDriverAgent.xcodeproj')
   //               ,'-scheme','WebDriverAgentRunner','-destination','id='+options.serial+',platform=iOS'+platform
    //              ,'-configuration','Debug','IPHONEOS_DEPLOYMENT_TARGET=10.2']

   
    const env = { 
      USE_PORT: options.wdaRemotePort,
      MJPEG_SERVER_PORT:options.wdaMjpegRemotePort
    }
   //"/Library/Frameworks/Python.framework/Versions/3.7/bin/tidevice"
    wdaPro = new SubpPocess("tidevice",["-u",options.serial,
			"xctest", "-B","com.apple.test.WebDriverAgentRunner-Runner"])
    wdaPro.start()
    return new Promise((resolve,reject)=>{
      wdaPro.on("exit",(code,signal)=>{
        wdaPro = null;
        bRestart = true
        //plugin.restartWda();
        return resolve()
      });
      wdaPro.on("stream-line",line=>{
        bRestart = false
        log.info("tidevice开始构建")
        log.info(line)
        if (line.indexOf("WebDriverAgent start successfully")!=-1){
          log.info("WDA启动成功")
          wda.launchApp('com.apple.Preferences')
          wda.initSession()
          wda.emit("started");
          bRestart=true
          bRestartCnt = 0
          if(checkTimer===null){
            batteryTimer = setInterval(plugin.getBatteryInfo,300000)
            checkTimer = setInterval(plugin.checkWdaStatus,3000)
          }
          return resolve()
        }
      })
    })
  };

  plugin.getBatteryInfo = function(){
    wda.GetRequest('wda/batteryInfo','',false)
  }
  plugin.checkWdaStatus = function(){
    wda.GetRequest('check_status','',false)
  }

  plugin.stopWda = function(){
    if (wdaPro!=null){
      wdaPro.stop()
      wdaPro = null
    }
    if(checkTimer){
      clearInterval(batteryTimer)
      clearInterval(checkTimer)
      checkTimer = null
      batteryTimer = null
    }
  }

  plugin.end = function() {
    exit = true
    plugin.stopWda()
    var proIter = proxyProMap.values()
    while((pro=proIter.next().value)!=null){
      pro.stop()
    }
    proxyProMap.clear()
    return true
  };

  lifecycle.observe(function() {
    return plugin.end()
  })

  return plugin.start()
})
