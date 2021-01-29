require('./adb-keys.css')

module.exports = angular.module('stf.settings.keys.adb-keys', [
  require('stf/user').name,
  require('stf/common-ui').name,
  require('stf/keys/add-adb-key').name
])
  .run(['$templateCache', function($templateCache) {
    $templateCache.put(
      'settings/keys/adb-keys/adb-keys.pug', require('./adb-keys.pug')
    )
  }])
  .controller('AdbKeysCtrl', require('./adb-keys-controller'))
