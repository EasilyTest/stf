module.exports = angular.module('stf/batch-control', [
  require('stf/socket').name,
  require('stf/transaction').name,
  require('stf/keycodes').name,
  require('stf/app-state').name
])
  .factory('BatchControlService', require('./batch-control-service'))
