module.exports = function BatchControlServiceFactory(
  $upload
, $http
, socket
, TransactionService
, $rootScope
, gettext
, KeycodesMapped
, $window
, AppState
, $log
) {
  var batchcontrolService = {}
  function BatchControlService(target, channel) {


    function sendOneWay(action, data) {

      let devices = JSON.parse(localStorage.getItem('devices'))
      let isSync = localStorage.getItem('isSync')
      socket.emit(action, channel, data)
        
      if (isSync === 'yes' ) {
        devices.splice(0,1)
        console.log(devices)
        devices.forEach(function(device) {
          if(device && device.channel) {
            console.log(device.channel)
            socket.emit(action, device.channel, data)
          }
        })
      }
    }
    function sendTwoWay(action, data) {
        var tx = TransactionService.create(target)
        socket.emit(action, channel, tx.channel, data)
        return tx.promise
    }

    function keySender(type, fixedKey) {
      return function(key) {
        if (typeof key === 'string') {
          sendOneWay(type, {
            key: key
          })
        }
        else {
          var mapped = fixedKey || KeycodesMapped[key]
          if (mapped) {
            sendOneWay(type, {
              key: mapped
            })
          }
        }
      }
    }

    this.gestureStart = function(seq) {
      sendOneWay('input.gestureStart', {
        seq: seq
      })
    }

    this.gestureStop = function(seq) {
      sendOneWay('input.gestureStop', {
        seq: seq
      })
    }

    this.touchDown = function(seq, contact, x, y, pressure) {
      sendOneWay('input.touchDown', {
        seq: seq
      , contact: contact
      , x: x
      , y: y
      , pressure: pressure
      })
    }

    this.touchMove = function(seq, contact, x, y, pressure) {
      sendOneWay('input.touchMove', {
        seq: seq
      , contact: contact
      , x: x
      , y: y
      , pressure: pressure
      })
    }

    this.touchUp = function(seq, contact) {
      sendOneWay('input.touchUp', {
        seq: seq
      , contact: contact
      })
    }

    this.touchCommit = function(seq) {
      sendOneWay('input.touchCommit', {
        seq: seq
      })
    }

    this.touchReset = function(seq) {
      sendOneWay('input.touchReset', {
        seq: seq
      })
    }

    this.keyDown = keySender('input.keyDown')
    this.keyUp = keySender('input.keyUp')
    this.keyPress = keySender('input.keyPress')

    this.home = keySender('input.keyPress', 'home')
    this.menu = keySender('input.keyPress', 'menu')
    this.back = keySender('input.keyPress', 'back')
    this.appSwitch = keySender('input.keyPress', 'app_switch')

    this.type = function(text) {
      return sendOneWay('input.type', {
        text: text
      })
    }

    this.paste = function(text) {
      return sendTwoWay('clipboard.paste', {
        text: text
      })
    }

    this.copy = function() {
      return sendTwoWay('clipboard.copy')
    }

    //@TODO: Refactor this please
    var that = this
    this.getClipboardContent = function() {
      that.copy().then(function(result) {
        $rootScope.$apply(function() {
          if (result.success) {
            if (result.lastData) {
              that.clipboardContent = result.lastData
            } else {
              that.clipboardContent = gettext('No clipboard data')
            }
          } else {
            that.clipboardContent = gettext('Error while getting data')
          }
        })
      })
    }

    this.shell = function(command) {
      return sendTwoWay('shell.command', {
        command: command
      , timeout: 10000
      })
    }

    this.identify = function() {
      return sendTwoWay('device.identify')
    }

    this.install = function(options) {
      return sendTwoWay('device.install', options)
    }

    this.uninstall = function(pkg) {
      return sendTwoWay('device.uninstall', {
        packageName: pkg
      })
    }

    this.reboot = function() {
      return sendTwoWay('device.reboot')
    }

    this.rotate = function(rotation, lock) {
      return sendOneWay('display.rotate', {
        rotation: rotation,
        lock: lock
      })
    }

    this.testForward = function(forward) {
      return sendTwoWay('forward.test', {
        targetHost: forward.targetHost
      , targetPort: Number(forward.targetPort)
      })
    }

    this.createForward = function(forward) {
      return sendTwoWay('forward.create', {
        id: forward.id
      , devicePort: Number(forward.devicePort)
      , targetHost: forward.targetHost
      , targetPort: Number(forward.targetPort)
      })
    }

    this.removeForward = function(forward) {
      return sendTwoWay('forward.remove', {
        id: forward.id
      })
    }

    this.startLogcat = function(filters) {
      return sendTwoWay('logcat.start', {
        filters: filters
      })
    }

    this.stopLogcat = function() {
      return sendTwoWay('logcat.stop')
    }

    this.startRemoteConnect = function() {
      return sendTwoWay('connect.start')
    }

    this.applyLogcatFilters = function(filters) {
      return sendTwoWay('logcat.filters', {
        filters: filters
      })
    }
    this.stopRemoteConnect = function() {
      return sendTwoWay('connect.stop')
    }

    this.openBrowser = function(url, browser) {
      return sendTwoWay('browser.open', {
        url: url
      , browser: browser ? browser.id : null
      })
    }

    this.clearBrowser = function(browser) {
      return sendTwoWay('browser.clear', {
        browser: browser.id
      })
    }

    this.openStore = function() {
      return sendTwoWay('store.open')
    }

    this.screenshot = function() {
      return sendTwoWay('screen.capture')
    }

    this.screendump = function() {
      return sendTwoWay('screen.dump')
    }

    this.fsretrieve = function(file) {
      return sendTwoWay('fs.retrieve', {
        file: file
      })
    }

    this.fslist = function(dir) {
      return sendTwoWay('fs.list', {
        dir: dir
      })
    }

    this.checkAccount = function(type, account) {
      return sendTwoWay('account.check', {
        type: type
      , account: account
      })
    }

    this.removeAccount = function(type, account) {
      return sendTwoWay('account.remove', {
        type: type
      , account: account
      })
    }

    this.addAccountMenu = function() {
      return sendTwoWay('account.addmenu')
    }

    this.addAccount = function(user, password) {
      return sendTwoWay('account.add', {
        user: user
      , password: password
      })
    }

    this.getAccounts = function(type) {
      return sendTwoWay('account.get', {
        type: type
      })
    }

    this.getSdStatus = function() {
      return sendTwoWay('sd.status')
    }

    this.setRingerMode = function(mode) {
      return sendTwoWay('ringer.set', {
        mode: mode
      })
    }

    this.getRingerMode = function() {
      return sendTwoWay('ringer.get')
    }

    this.setWifiEnabled = function(enabled) {
      return sendTwoWay('wifi.set', {
        enabled: enabled
      })
    }

    this.getWifiStatus = function() {
      return sendTwoWay('wifi.get')
    }

    this.setQuality = function(val){
      return sendTwoWay('stream.quality',{
        rate: val
      })
    }

    window.cc = this
  }

  batchcontrolService.create = function(target, channel) {
    return new BatchControlService(target, channel)
  }

  return batchcontrolService
}
