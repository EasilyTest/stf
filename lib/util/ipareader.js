'use strict'

const Promise = require('bluebird')
var bplist = require('bplist')
var fs = require('fs')
var unzip = require('node-unzip-2')
var os = require('os')
var util = require('util')
var execSync = require('child_process').execSync;
var EventEmitter = require('eventemitter3')

function IpaReader(filepath) {
  EventEmitter.call(this)
  this.file = filepath
  this.cachedir = os.tmpdir()+'/ipa'
}

util.inherits(IpaReader, EventEmitter)

IpaReader.prototype.parsePlist = function(){
  var manifest = {}
  var destdir = this.cachedir+'/Payload'
  var dirs = fs.readdirSync(destdir)
  if (dirs[0].indexOf('.DS_Store') !== -1 || dirs[0].indexOf('.app') === -1) {
    destdir = util.format('%s/%s', destdir, dirs[1])
  }
  else {
    destdir = util.format('%s/%s', destdir, dirs[0])
  }

    var destfile = destdir+'/Info.plist'
    var content = fs.readFileSync(destfile)
    return new Promise((resolve,reject)=>{
      bplist.parseBuffer(content,function(err,result){
        if(err){
          return reject(err)
        }
        manifest = result[0]
        manifest.package = result[0].CFBundleIdentifier
        manifest.versionCode = parseInt(result[0].CFBundleInfoDictionaryVersion)
        manifest.versionName = result[0].CFBundleShortVersionString
        return resolve(manifest)
      })
    })
}

IpaReader.prototype.UnzipIpa = function(){
    try
    {
      this.cachedir = os.tmpdir()+'/ipa'
      if(!fs.existsSync(this.cachedir)){
        fs.mkdirSync(this.cachedir)
      }
    }catch(err){
      console.error(err)
    }
    return new Promise((resolve,reject)=>{
      fs.createReadStream(this.file )
      .pipe(unzip.Extract({path:this.cachedir})).on('close',()=>{
        return resolve()
      })
    })
}

IpaReader.prototype.ReadInfoPlist = function(){
  return new Promise((resolve,reject)=> {
    try {
      this.UnzipIpa().then(() => {
        this.parsePlist().then(function(res) {
          return resolve(res)
        })
      })
    } catch (err) {
      console.log(err)
    }
  })
}

module.exports = IpaReader
