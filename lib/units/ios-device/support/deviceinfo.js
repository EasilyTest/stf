var wire = require('../../../wire')
var ProductType = require("./TypeToModel")

var execSync = require('child_process').execSync;
var images = require('images')
var simctl = require('./simctl')

function runCmd(serial,filter){
    var stdout = execSync("ideviceinfo -u "+serial+"| grep "+filter,{});
    return stdout.toString().split(":")[1].trim()
}
var DeviceInfo = {
    getBatteryInfo: function(serial,type='device'){
        var level = 100
        if(type!='emulator'){
            level = parseInt(runCmd(serial,"BatteryCurrentCapacity"),10);
        }
        return {serial:serial
          ,status:"charging"
          ,health:"good"
          ,source:"usb"
          ,level:level
          ,scale:100
          ,temp:0
          ,voltage:0}
    }
    ,getDisplay:function(serial,type='device'){
        if(type=='emulator'){
            return simctl.GetDisplay(serial)
        }
        var filename = serial+".png";
        cmd = "idevicescreenshot -u "+serial+" "+filename;
        stdout = execSync(cmd,{});
        img = images(filename)
        var w = img.width()
        var h = img.height()
        cmd = 'rm '+filename
        execSync(cmd,{});
        return {width:w,height:h}
    }
    ,getDeviceInfo: function(serial,type='device'){
        var abi = "arm64"
        var version = "";
        var model = "";
        var display = null;
        var product = "Apple"
        if(type!='emulator'){
            abi = runCmd(serial,"CPUArchitecture");
            version = runCmd(serial,"ProductVersion");
            var proType = runCmd(serial,"ProductType");
            model = ProductType.toModel(proType);
            display = DeviceInfo.getDisplay(serial,type);
        }
        else if(type=='emulator'){
            var info = simctl.GetSimInfo(serial)
            version = info.sdk
            model = info.name
            product = "Apple Simulator"
            display = simctl.GetDisplay(serial)
        }
        return {serial:serial
            ,platform:"iOS"
            ,manufacturer:product
            ,operator:""
            ,model:model
            ,version:version
            ,abi:abi
            ,sdk:""
            ,display:{id:0,width:display.width,height:display.height
                ,rotation:0,xdpi:0,ydpi:0,fps:60.0,density:1.0,secure:false,url:"",size:0}
            ,phone:{imei:"",imsi:"",phoneNumber:"",iccid:"",network:""}
            ,product:product
            ,cpuPlatform:""
            ,openGLESVersion:""
        }
    }
}

module.exports = DeviceInfo;

