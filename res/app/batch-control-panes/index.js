require('./batch-control.css')

module.exports = angular.module('batch-control-panes', [
  require('stf/device').name,
  require('stf/batch-control').name,
  //require('stf/control').name,
  require('stf/user/group').name,
  require('stf/install').name
])
  .config(['$routeProvider', function($routeProvider) {
    $routeProvider
      .when('/batchcontrol', {
        controller: 'BatchControlCtrl',
        template: require('./batch.pug')
      })
  }])
  /*.config(['$routeProvider', function($routeProvider) {
        $routeProvider
        .otherwise({
                   redirectTo: '/batchcontrol'
                   })
        }])*/
  .controller('BatchControlCtrl', require('./batch-control-controller'))
  .directive('coreBathControl', require('./core-batch-control-directive'))
