module.exports = function MenuCtrl($scope, $rootScope, SettingsService,
  $location, $log) {

  SettingsService.bind($scope, {
    target: 'lastUsedDevice'
  })

  SettingsService.bind($rootScope, {
    target: 'platform',
    defaultValue: 'native'
  })

  $scope.$on('$routeChangeSuccess', function() {
    $scope.isControlRoute = $location.path().search('/control') !== -1
  })

  // $scope.weakNetOn = false
  $scope.check = 0
  $scope.weakNetConfig = function(check) {
    $log.log('menuController发送doWeakNet消息')
    // $log.log('config weaknet', $scope.check, check)
    if (check === 1) {
      $rootScope.$broadcast('doWeakNet', true)
    } else {
      $rootScope.$broadcast('doWeakNet', false)
    }
  }
}
