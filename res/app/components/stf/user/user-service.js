/**
* Copyright © 2019 contains code contributed by Orange SA, authors: Denis Barbaron - Licensed under the Apache license 2.0
**/

module.exports = function UserServiceFactory(
  $rootScope
, $http
, socket
, AppState
, AddAdbKeyModalService
) {
  var UserService = {}

  var user = UserService.currentUser = AppState.user

  UserService.getUser = function() {
    return $http.get('/api/v1/user')
  }

  UserService.getAdbKeys = function() {
    return (user.adbKeys || (user.adbKeys = []))
  }

  UserService.addAdbKey = function(key) {
    socket.emit('user.keys.adb.add', key)
  }

  UserService.acceptAdbKey = function(key) {
    socket.emit('user.keys.adb.accept', key)
  }

  UserService.removeAdbKey = function(key) {
    socket.emit('user.keys.adb.remove', key)
  }

  socket.on('user.keys.adb.error', function(error) {
    $rootScope.$broadcast('user.keys.adb.error', error)
  })

  socket.on('user.keys.adb.added', function(key) {
    UserService.getAdbKeys().push(key)
    $rootScope.$broadcast('user.keys.adb.updated', user.adbKeys)
    $rootScope.$apply()
  })

  socket.on('user.keys.adb.removed', function(key) {
    user.adbKeys = UserService.getAdbKeys().filter(function(someKey) {
      return someKey.fingerprint !== key.fingerprint
    })
    $rootScope.$broadcast('user.keys.adb.updated', user.adbKeys)
    $rootScope.$apply()
  })

  socket.on('user.keys.adb.confirm', function(data) {
    AddAdbKeyModalService.open(data).then(function(result) {
      if (result) {
        UserService.acceptAdbKey(data)
      }
    })
  })

  return UserService
}
