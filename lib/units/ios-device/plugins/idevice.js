var EventEmitter, Promise, iDevice,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

var execSync = require('child_process').execSync;
EventEmitter = require('events').EventEmitter;
var simtcl = require('../support/simctl')

Promise = require('bluebird');

iDevice = (function(superClass) {
  extend(iDevice, superClass);

  function iDevice() {
    this.deviceList = [];
    this.simulatorList = []
  }

  iDevice.prototype.read = function() {
    var stdout = execSync('idevice_id -l',{});
    var out = stdout.toString().trim();
    if(out!=""){
      ref = out.split('\n');
      this.update(ref,'device');
    }else{
      this.update([],'device');
    }
    ref = simtcl.GetBootedSim()
    if(ref){
      this.update(ref,'emulator');
    }
  };

  iDevice.prototype.update = function(newList,type='device') {
    var changeSet, device, j, len1,ref;
    changeSet = {
      removed: [],
      changed: [],
      added: []
    };
    ref = this.deviceList;
    if(type=='emulator'){
      ref = this.simulatorList
    }
    for (j = 0, len1 = ref.length; j < len1; j++) {
      device = ref[j];
      if (newList.indexOf(device)==-1 || newList.length==0) {
        dev = {
            id: device,
            type: "offline"
        }
        changeSet.removed.push(dev);
        this.emit('remove', dev);
        this.remove(type,device)
      }
    }
    for (k =0;k<newList.length;k++){
      device = newList[k];
      if (ref.indexOf(device)==-1){
        dev = {
            id: device,
            type: type
        }
        changeSet.added.push(dev);
        this.emit('add', dev);
        if(type!='emulator'){
          this.deviceList.push(device);
          ref = this.deviceList;
        }
        else if(type=='emulator'){
          this.simulatorList.push(device);
          ref = this.simulatorList;
        }
        break;
      }
    }
    this.emit('changeSet', changeSet);
    return this;
  };

  iDevice.prototype.remove = function(type,device){
    if(type!='emulator'){
      var index = this.deviceList.indexOf(device)
      if(index==-1){
        return
      }
      this.deviceList.splice(index,1);
    }
    else if(type=='emulator'){
      var index = this.simulatorList.indexOf(device)
      if(index==-1){
        return
      }
      this.simulatorList.splice(index,1);
    }
  }

  iDevice.prototype.end = function() {
    return this;
  };

  return iDevice;

})(EventEmitter);

module.exports = iDevice;
