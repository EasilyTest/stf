/**
* Copyright © 2019 code initially contributed by Orange SA, authors: Denis Barbaron - Licensed under the Apache license 2.0
**/

module.exports = angular.module('stf.generic-modal', [
  require('stf/common-ui/modals/common').name
])
  .factory('GenericModalService', require('./generic-modal-service'))
