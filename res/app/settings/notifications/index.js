module.exports = angular.module('settings-notifications', [
  require('stf/settings').name
])
  .run(['$templateCache', function($templateCache) {
    $templateCache.put(
      'settings/notifications/notifications.pug'
    , require('./notifications.pug')
    )
  }])
  .factory('NotificationsService', require('./notifications-service'))
  .controller('NotificationsCtrl', require('./notifications-controller'))
