/**
* Copyright © 2019 contains code contributed by Orange SA, authors: Denis Barbaron - Licensed under the Apache license 2.0
**/

var yargs = require('yargs')
var Promise = require('bluebird')

Promise.longStackTraces()

var _argv = yargs.usage('Usage: $0 <command> [options]')
  .strict()
  .command(require('./api'))
  .command(require('./app'))
  .command(require('./auth-ldap'))
  .command(require('./auth-mock'))
  .command(require('./auth-oauth2'))
  .command(require('./auth-openid'))
  .command(require('./auth-saml2'))
  .command(require('./groups-engine'))
  .command(require('./device'))
  .command(require('./ios-device'))
  .command(require('./doctor'))
  .command(require('./generate-fake-device'))
  .command(require('./generate-fake-user'))
  .command(require('./generate-fake-group'))
  .command(require('./local'))
  .command(require('./log-rethinkdb'))
  .command(require('./migrate'))
  .command(require('./notify-hipchat'))
  .command(require('./notify-slack'))
  .command(require('./poorxy'))
  .command(require('./processor'))
  .command(require('./provider'))
  .command(require('./ios-provider'))
  .command(require('./reaper'))
  .command(require('./storage-plugin-apk'))
  .command(require('./storage-plugin-image'))
  .command(require('./storage-s3'))
  .command(require('./storage-temp'))
  .command(require('./triproxy'))
  .command(require('./websocket'))
  .demandCommand(1, 'Must provide a valid command.')
  .help('h', 'Show help.')
  .alias('h', 'help')
  .version('V', 'Show version.', function() {
    return require('../../package').version
  })
  .alias('V', 'version')
  .argv
