var util = require('util')
var EventEmitter = require('eventemitter3')
module.exports = function coreBathControlDirective(
  UserService
  , DeviceService
  , GroupService
  , ControlService
  , InstallService
  , $http
  , $rootScope
  , $log
  ) {
  return {
    restrict: 'E',
    scope: {},
    template: require('./batch-control.pug'),
    link: function (scope, element) {
      var checked_devices = []
      var isSync = "yes"
      var bIsQuery = false
      var user = UserService.currentUser
      let bath = element.find('div')[0]
      let container = bath.firstChild.nextSibling.nextSibling
      let applistContainer = bath.firstChild.nextSibling.nextSibling.nextSibling
      scope.appDicts = []
      scope.devices = checked_devices
      scope.onlineDevices = []
      scope.selectAll_Status = {
        checked: false
      }
      scope.page = {
        currentPage: 1,
        nextPage: 2,
        prePage: 0,
        number: 30,
        totalPage: 0
      }
      scope.input = {
        Value: ""
      }
      scope.quality = 'hd'
      scope.currentPageDvices = []
      scope.providers = []
      scope.device_install = {
        successed:[],
        failed:[],
        installing:[],
        bIsInstall: false,
        installStr: "成功%d/失败%d/安装中%d"
      }

      let src = '#!/control/'
      var thirdview = "#!/thirdview/"
      scope.providers = []
       
      getOnlineDevices()
      function getOnlineDevices() {
        $http.get('/api/v1/devices').then(function (response) {
          scope.onlineDevices = response.data.devices
          scope.onlineDevices = scope.onlineDevices.filter(device => (device.present && device.ready))
          scope.onlineDevices = Object.values(scope.onlineDevices).sort(
            function(a,b){ 
              var la = (a.marketName || '').toLowerCase()
              var lb = (b.marketName || '').toLowerCase()
              if (la === lb) {
                return 0
              }
              else {
                return la < lb ? -1 : 1
              }
            }
          );
          scope.onlineDevices.forEach(function (device) {
         
            if (device.owner) {
              for (var i = 0; i < checked_devices.length; i++) {
                if (device.serial === checked_devices[i].serial) {
                  device.checked = true
                  device.usable = true
                  device.using = true
                  break
                }
              }
            }
          })
   
          scope.currentPageDvices = scope.onlineDevices 
          if(scope.currentPageDvices.length>scope.page.number){
            scope.currentPageDvices = scope.currentPageDvices.slice(0,scope.page.number)
          }
          scope.filter(scope.page, 0)
        })
      }

      window.addEventListener('message', function (e) {
        try {
          let isValid = e.data['isFromFatalMessage']
          if (isValid) {
            let marketName = e.data['name']
            console.log("设备" + marketName + "异常退出:",e)
            checked_devices.forEach(function (device) {
              if (device.serial === e.data.serial) {
                scope.onRemove(device)
              }
            })
          }
          for (let i = 1; i < checked_devices.length; i++) {
            if (checked_devices[i].serial === e.data.serial) {
              scope.closeContainer()
              return
            }
          }
        } catch (e) { }
      })

      scope.syncConfig = function () {
        isSync = localStorage.getItem('isSync') === 'no' ? 'yes' : 'no'
        localStorage.setItem('isSync', isSync)
      }

      localStorage.setItem('isSync', "no")
      window.addEventListener('message', receiveMessage, false)
      scope.closeContainer = function () {
        container.classList.add('cancel')
        applistContainer.classList.add('cancel')
      }

      scope.openContainer = function () {
        container.classList.remove('cancel')
      }

      function receiveMessage(event) {
        if (!event.data || !event.data.serial || event.data.isFromFatalMessage) {
          return
        }
        var device = event.data
        setDeviceUsed(device, true)
        updateCheckStatus(true, device)
        scope.$digest()
      }

      scope.search = function (value) {
        if (value === '') {
          scope.refresh()
        }
        else {
          scope.currentPageDvices = filterByfield(scope.onlineDevices, 'serial|model|name|marketName', value)
          if(scope.currentPageDvices.length>scope.page.number){
            scope.currentPageDvices = scope.currentPageDvices.slice(0,scope.page.number)
          }
        }
        scope.$digest()
      }

      scope.refresh = function () {
        getOnlineDevices()
      }

      scope.selectAll = function (selectDevices) {
        if (scope.selectAll_Status.checked) {
          selectDevices.forEach(function (device) {
            if (device.present && device.ready && (device.owner === null || device.owner.email === user.email)) {

              updateCheckStatus(true, device)
              setDeviceUsed(device, false)
            }
          })
          localStorage.setItem('devices', JSON.stringify(checked_devices))
          console.log(localStorage.getItem('devices'))
          scope.selectAll_Status.checked = true

        }
        else {
          selectDevices.forEach(function (device) {
            if (device.owner && device.owner.email === user.email) {
              scope.onRemove(device, false)
            }
          })
          scope.selectAll_Status.checked = false
        }
      }

      scope.selectOne = function (device) {
        if (device.checked) {
          if (device.owner && device.owner.email != user.email) {
    
            device.checked = false
            return
          }
          setDeviceUsed(device, true)
        }
        else {
          scope.onRemove(device)
        }
      }

      scope.changeMaster = function (device) {
        let temp = undefined
        device.bmaster = true
        device.class = "phone-item-master"
        var index = findIndex(checked_devices, device)
        var master = checked_devices[0]
        master.bmaster = false
        master.class = "phone-item"
        checked_devices[0]=device
        checked_devices[index] = master
        localStorage.setItem('devices', JSON.stringify(checked_devices))
        //scope.changeScreenQuality(scope.quality)
        let control = ControlService.create(master, master.channel)
        //control.setQuality('sd')
        setTimeout(() => {
          scope.$digest()
        }, 1000);
      }

  

      function setDeviceUsed(device, bStore = true) {
        let index = checked_devices.length
        let rate = 'sd'
        device.bmaster = index===0
        device.class = "phone-item"
        if(device.bmaster){
          device.class = "phone-item-master"
          rate = scope.quality
        }
        device.usable = true
        device.using = true
        device.checked = true
        device.src = src + device.serial + '?standalone'
        delete device.installation
        if (findIndex(checked_devices, device) === -1) {
          checked_devices[index] = device
        }
        let control = ControlService.create(device, device.channel)
        if (bStore) {
          localStorage.setItem('devices', JSON.stringify(checked_devices))
        }
        setTimeout(() => {
          scope.$digest()
        }, 2000);
      }

      scope.onPower = function (device) {
        let control = ControlService.create(device, device.channel)
        control.keyPress('power')
      }
      scope.onHome = function (device) {
        let control = ControlService.create(device, device.channel)
        control.home()
      }
      scope.onRemove = function (device, refresh = true) {
        try {
          GroupService.kick(device, true)
          device.checked = false
          device.bmaster = false
          delete device.installation
          var id = findIndex(checked_devices, device)
          checked_devices.splice(id, 1)
          updateCheckStatus(false, device)
          if(checked_devices.length>0){
            checked_devices[0].bmaster = true
            checked_devices[0].class = "phone-item-master"
          }
          localStorage.setItem('devices', JSON.stringify(checked_devices))
          scope.selectAll_Status.checked = false
        
          container.classList.add('cancel')
          applistContainer.classList.add('cancel')
        } catch (e) { console.log(e) }
      }

      scope.onFull = function (device) {
        var win = window.open(src + device.serial, device.marketName || device.name || device.model,
          'width=' + 800 + ',height=' + 600 + ',left=' + (window.screen.width - 800) / 2 + ',top=' + (window.screen.height - 600) / 2 +
          ',resizable=no,status=yes,toolbar=no,location=no,menubar=no,menu=yes,scrollbars=yes')
        device.src = thirdview + device.serial + '?standalone'
        win.addEventListener('beforeunload', function (event) {
          device.src = src + device.serial + '?standalone'
          scope.$digest()
        }, false)
        setTimeout(() => {
          scope.$digest()
        }, 2000);
      }

      scope.onAllRemove = function () {
        checked_devices.forEach(function (device) {
          delete device.installation
          GroupService.kick(device, true)
        })
        checked_devices.splice(0, checked_devices.length)
        updateCheckStatus(false, null)
        localStorage.setItem('devices', JSON.stringify(checked_devices))
        scope.selectAll_Status.checked = false
        setTimeout(() => {
          scope.refresh()
          scope.$digest()
        }, 5000);
      }
      scope.onAllPower = function () {
        checked_devices.forEach(function (device) {
          let control = ControlService.create(device, device.channel)
          control.reboot()
          control = null
        })
      }
      scope.onAllHome = function () {
        checked_devices.forEach(function (device) {
          let control = ControlService.create(device, device.channel)
          control.home()
          control = null
        })
      }
      scope.onAllStart = function () {
        scope.appDicts = []
        if (checked_devices.length === 0) {
          alert("请先添加设备")
          return
        }
       
        applistContainer.classList.remove('cancel')
        setTimeout(() => {
          scope.$digest()
        }, 10000);
      }
      scope.onOprateApp = function (packageName, flag) {
        applistContainer.classList.add('cancel')
        var platform = checked_devices[0].platform
        checked_devices.forEach(function (device) {
          if (device.platform === platform) {
            let control = ControlService.create(device, device.channel)
            if (flag === 1) {
              if (platform.toLowerCase() === 'ios') {
                control.launchDashboardApp(packageName)
              }
              else {
                control.shell("monkey --pct-syskeys 0 -p " + packageName + ' -c android.intent.category.LAUNCHER 1')
              }
            }
            else if (flag === 0) {
              if (platform.toLowerCase() === 'ios') {
                control.stopDashboardApp(packageName)
              }
              else {
                control.shell("am force-stop " + packageName)
              }
            }
            else {
             
              control.uninstall(packageName)
            }
            control = null
          }
        })
      }

      scope.filter = function (page, flag) {
        page.totalPage = scope.onlineDevices.length % page.number === 0 ? scope.onlineDevices.length / page.number : scope.onlineDevices.length / page.number + 1
        if (page.currentPage + flag > page.totalPage || page.currentPage + flag < 1) {
          return
        }
        page.currentPage += flag
        var startIndex = (page.currentPage - 1) * page.number
        var endIndex = page.currentPage * page.number
        if (scope.onlineDevices.length < startIndex) {
          return
        }
        if (scope.onlineDevices.length < endIndex) {
          endIndex = scope.onlineDevices.length
        }
        scope.currentPageDvices = scope.onlineDevices.slice(startIndex, endIndex)
      }

      function Installation(state) {
        this.progress = 0
        this.state = state
        this.settled = false
        this.success = false
        this.error = null
        this.href = null
        this.manifest = null
        this.launch = true
        this.serial = null
      }
      Installation.prototype = Object.create(EventEmitter.prototype)
      Installation.prototype.constructor = Installation
      Installation.prototype.apply = function($scope) {
        function changeListener() {
          $scope.safeApply()
        }

        this.on('change', changeListener)

        $scope.$on('$destroy', function() {
          this.removeListener('change', changeListener)
        }.bind(this))

        return this
      }
      Installation.prototype.update = function(progress, state) {
        this.progress = Math.floor(progress)
        this.state = state
        this.emit('change')
      }
      Installation.prototype.okay = function(state) {
        this.settled = true
        this.progress = 100
        this.success = true
        this.state = state
        this.emit('change')
      }
      Installation.prototype.fail = function(err) {
        this.settled = true
        this.progress = 100
        this.success = false
        this.error = err
        this.emit('change')
      }

      scope.clear = function(device) {
        device.installation = null
      }

      scope.installFile = function ($files) {
        scope.device_install = {
          successed:[],
          failed:[],
          installing:[],
          bIsInstall: false,
          installStr: "成功%d/失败%d/安装中%d",
          installation: null
        }
        if ($files.length) {
          $files.forEach(function (file) {
            let platform = file.name.endsWith('.apk') ? 'android' : 'ios'
            InstallService.bathStoreFile(scope.device_install, [file])
              .then(function(res) {
                console.log("UPLOAD FILE TO", res)
                scope.device_install.installation = null
                checked_devices.forEach(function (device) {
                  if (device.platform.toLowerCase() === platform) {
                    scope.device_install.bIsInstall = true
                    console.log('install to device', device.serial)
                    let control = ControlService.create(device, device.channel)
                    // InstallService.installFile(control, [file])
                    let installation = new Installation('uploading')
                    installation.serial = control.device.serial
                    $rootScope.$broadcast('installation', installation)
                    installation.update(100 / 2, 'processing')
                    installation.href = res.data.resources.file.href
                    return $http.get(installation.href + '/manifest')
                      .then(function(res) {
                        if (res.data.success) {
                          installation.manifest = res.data.manifest
                          return control.install({
                            href: installation.href
                            , manifest: installation.manifest
                            , launch: installation.launch
                          })
                            .progressed(function(result) {
                              installation.update(50 + result.progress / 2, result.lastData)
                            })
                        }
                        else {
                          throw new Error('Unable to retrieve manifest')
                        }
                      })
                      .then(function() {
                        installation.okay('installed')
                      })
                      .catch(function(err) {
                        installation.fail(err.code || err.message)
                      })
                      .finally(function() {
                        scope.device_install.installing.push(device)
                        control = null
                      })
                  }
                })
              })
            scope.device_install.installStr = util.format("成功%d/失败%d/安装中%d"
              , scope.device_install.successed.length
              , scope.device_install.failed.length
              , scope.device_install.installing.length)
          })
        }
      }

      scope.$on('installation', function (e, installation) {
        checked_devices.forEach(function(device){
          console.log(installation)
          if(installation.serial===device.serial){
            device.installation = installation
            function installChangeListener(){
              if(installation.error || installation.state==="installed"){
                var temp = device.installation
                delete device.installation
                scope.$evalAsync(function() {
                  scope.device_install.installing.pop(device)
                  if(installation.error){
                    scope.device_install.failed.push(device)
                  }
                  else{
                    scope.device_install.successed.push(device)
                    installation.removeListener("change",installChangeListener)
                  }
                  device.installation = temp
                  scope.device_install.installStr = util.format("成功%d/失败%d/安装中%d"
                    , scope.device_install.successed.length
                    , scope.device_install.failed.length
                    , scope.device_install.installing.length)
                  console.log(scope.device_install)
                })
              }
            }
            installation.on("change",installChangeListener)
          }
        })
      })

      scope.onInput = function () {
        console.log("input text", scope.input.Value)
        if (scope.input.Value === "") {
          return
        }
        checked_devices.forEach(function (device) {
          let control = ControlService.create(device, device.channel)
          if (device.platform.toLowerCase() === "android") {
            control.paste(scope.input.Value)
          }
          else {
            control.type(scope.input.Value)
          }
          control = null
        })
        scope.input.Value = ""
      }

      scope.providerFilter = localStorage.getItem('filter')
     
      scope.applyFilterProvider = function(value){
        localStorage.setItem('filter',value)
        scope.providerFilter = value
        scope.refresh()
      }

      
      function updateCheckStatus(status, device = null) {
        scope.onlineDevices.forEach(function (dev) {
          if (device === null) {
            dev.checked = status
            dev.using = status
          }
          else if (device.serial === dev.serial) {
            dev.checked = status
            dev.using = status
          }
        })
      }

      function findIndex(device_list, device) {
        for (var i = 0; i < device_list.length; i++) {
          if (device_list[i].serial === device.serial) {
            return i
          }
        }
        return -1
      }

   

      $rootScope.$on('$locationChangeSuccess', function (evt, next, previous) {
        if (angular.toJson(previous).search('batchcontrol')) {

          checked_devices.forEach(function (device) {
            try {
              if (device) {
                GroupService.kick(device)
              }
            } catch (e) {
              $log.log(e.message)
            }
          })

          checked_devices.splice(0, checked_devices.length)
          checked_devices = []
          localStorage.removeItem('devices')
        }
      })

    },
  }
}
