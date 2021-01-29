require('./performance.css')

module.exports = angular.module('stf.performance', [
  require('./cpu').name
])
  .run(['$templateCache', function($templateCache) {
    $templateCache.put('control-panes/performance/performance.pug',
      require('./performance.pug')
    )
  }])
  .controller('PerformanceCtrl', require('./performance-controller'))
