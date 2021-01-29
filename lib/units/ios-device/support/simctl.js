var execSync = require('child_process').execSync;
var _ = require('lodash')._
var util = require('util')
var images = require('images')

function runCmd(cmd,filter){
    var stdout = execSync("xcrun "+cmd+" "+serial+"| grep "+filter,{});
    return stdout
}
function getDeviceListByParsing () {
    // get the list of devices
    var stdout = execSync("xcrun simctl list devices",{})
    // expect to get a listing like
    // -- iOS 8.1 --
    //     iPhone 4s (3CA6E7DD-220E-45E5-B716-1E992B3A429C) (Shutdown)
    //     ...
    // -- iOS 8.2 --
    //     iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
    //     ...
    // so, get the `-- iOS X.X --` line to find the sdk (X.X)
    // and the rest of the listing in order to later find the devices
    let deviceSectionRe = /-- iOS (.+) --(\n\s{4}.+)*/mg;
    let matches = [];
    let match = deviceSectionRe.exec(stdout);
  
    // make an entry for each sdk version
    while (match !== null) {
      matches.push(match);
      match = deviceSectionRe.exec(stdout);
    }
    if (matches.length < 1) {
      console.log('Could not find device section');
    }
  
    // get all the devices for each sdk
    let devices = [];
    for (match of matches) {
      let sdk = match[1];
      //devices[sdk] = [];
      // split the full match into lines and remove the first
      for (let line of match[0].split('\n').slice(1)) {
        // a line is something like
        //    iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
        // retrieve:
        //   iPhone 4s
        //   A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E
        //   Shutdown
        //let lineRe = /([^\s].+) \((\w+-.+\w+)\) \((\w+\s?\w+)\)/; // https://regex101.com/r/lG7mK6/3
        let lineRe = /([^\s].+) \((\w+-.+\w+)\) \(Booted\)/;
        let lineMatch = lineRe.exec(line);
        if (lineMatch === null) {
          //throw new Error(`Could not match line: ${line}`);
          continue
        }
        // save the whole thing as ab object in the list for this sdk
  
        devices.push({
          name: lineMatch[1],
          udid: lineMatch[2],
          state: 'Booted',//lineMatch[3],
          sdk,
        });
      }
    }
  
    return devices;
}

function getDeviceList (forSdk = null) {
    let devices;
    try {
      var stdout =  execSync("xcrun simctl list devices -j",{})
      /* JSON should be
       * {
       *   "devices" : {
       *     "iOS <sdk>" : [
       *       {
       *         "state" : "Booted",
       *         "availability" : "(available)",
       *         "name" : "iPhone 6",
       *         "udid" : "75E34140-18E8-4D1A-9F45-AAC735DF75DF"
       *       }
       *     ]
       *   }
       * }
       */
      devices = [];
      for (let [sdkName, entries] of _.toPairs(JSON.parse(stdout).devices)) {
        if (sdkName.indexOf('iOS') !== 0) {
          continue;
        }
        //console.log('==========',entries)
        let sdk = sdkName.replace('iOS ', '');
        for(i=0;i<entries.length;i++){
            var el = entries[i]
            if(el.state=='Shutdown')
                continue
            delete el.availability;
            devices.push({...el, sdk});
        }
      }
    } catch (err) {
        console.log(`Unable to get JSON device list: ${err.message}`);
        console.log('Falling back to manually parsing');
        devices = getDeviceListByParsing();
    }

    return devices;
}

var SimCtl = {
    GetBootedSim:function(){
        var devices = []
        try{
          var stdout = execSync("xcrun simctl list | grep Booted",{});
          stdout = stdout.toString().trim()
          if(stdout=='')
            return devices
          for (let line of stdout.split('\n')) {
            let lineRe = /([^\s].+) \((\w+-.+\w+)\) \(Booted\)/;
            let lineMatch = lineRe.exec(line);
            if (lineMatch === null) {
              continue
            }
            devices.push(lineMatch[2])
          }
        }catch(e){
        }
        return devices
    },
    GetSimInfo:function(serial){
        var devices = getDeviceList()
        for(i=0;i<devices.length;i++){
            var device = devices[i]
            if(device.udid==serial)
                return device
        }
        return null
    },
    GetDisplay:function(serial){
        var filename = serial+".png";
        execSync(util.format("xcrun simctl io %s screenshot %s",serial,filename),{});
        img = images(filename)
        var w = img.width()
        var h = img.height()
        cmd = 'rm '+filename
        execSync(cmd,{});
        return {width:w,height:h}
    }

}

module.exports = SimCtl;
