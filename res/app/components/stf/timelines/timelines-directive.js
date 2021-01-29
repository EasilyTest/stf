module.exports = function timelinesDirective(Timelines) {
  return {
    restrict: 'AE',
    replace: false,
    scope: {},
    template: require('./timelines.pug'),
    link: function(scope) {
      scope.cssPrefix = Timelines.options.cssPrefix
      scope.notifications = Timelines.notifications
    }
  }
}
