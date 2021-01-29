var requestPromise = require('request-promise')
var syrup = require('stf-syrup')
var request = require('request')
var Promise = require('bluebird')
var url = require('url')
var util = require('util')
var logger = require('../../../util/logger')
var EventEmitter = require('eventemitter3')
var lifecycle = require('../../../util/lifecycle')

var MaxFailCount = 3
module.exports = syrup.serial()
.define(function(options){
    var log = logger.createLogger('ios-device:plugins:wdaCommands')
    var plugin = new EventEmitter()
    var baseUrl = util.format('http://localhost:%d',options.wdaPort)
    var sessionid = null
    var sessionTimer = null
    
    plugin.getSessionid = function(){
        if(sessionid==null){
            plugin.initSession()
        }
        return sessionid
    }

    plugin.initSession = function(){
        let options = {
            method:'GET',
            uri:baseUrl+'/status',
            headers:{
                'Content-Type':'application/json'
            },
            json:true
        }
        requestPromise(options).then(function(resp){
            sessionid = resp.sessionId
            return sessionid
        }).catch(function(err){
            return null
        })
    }

    plugin.click = function(x,y,duration){
        var body = {
            x:x,
            y:y,
            duration:duration
        }
        plugin.PostData('wda/tap_stf',body,false)
    }

    plugin.swipe = function(swipeList,duration){
        var actions = [
            {
                action:"press",
                options:{
                    x:swipeList[0].x,
                    y:swipeList[0].y
                }
            }
        ]
        var time = duration
        if(swipeList.length>2){
            time = 50
        }
        for(i=1;i<swipeList.length;i++){
            actions.push(
                {
                    action:"wait",
                    options:{
                        ms:swipeList[i].t
                    }
                }
            )
            actions.push(
                {
                    action:"moveTo",
                    options:{
                        x:swipeList[i].x,
                        y:swipeList[i].y
                    }
                }
            )
        }
        actions.push({
            action:"release",
            options:{}
        })
        var body = {
            actions:actions
        }
        plugin.PostData('wda/touch/perform_stf',body,false)
    }

    plugin.drag = function(startx,starty,endx,endy,duration){
        var body = {
            fromX:Math.floor(startx),
            fromY:Math.floor(starty),
            toX:Math.floor(endx),
            toY:Math.floor(endy),
            duration:duration
        }
        plugin.PostData('wda/dragfromtoforduration_stf',body,false)
    }

    plugin.launchApp = function(bundleId){
        var body = {
            capabilities:{
                bundleId:bundleId
            }
        }
        plugin.PostData('session',body,false)
    }

    function processResp(resp){
        var respValue = resp.value
        if(respValue=={}||respValue==null||respValue=="")
            return
        if(respValue.func==undefined)
            return
        return plugin.emit(respValue.func,respValue)
    }

    plugin.PostData = function(uri,body,bWithSession){
        var session = ''
        if(bWithSession)
            session = util.format("/session/%s",plugin.getSessionid())
        let options = {
            method:'POST',
            uri:util.format("%s%s/%s",baseUrl,session,uri),
            body:body,
            json:true,
            headers:{
                'Content-Type':'application/json'
            }
        }
        requestPromise(options).then(function(resp){
            failCnt = 0
            processResp(resp)
        }).catch(function(err){
            //log.info('post request err',err)
            return null
        })
    }

    plugin.GetRequest = function(uri,param='',bWithSession=false){
        var session = ''
        if(bWithSession)
            session = util.format("/session/%s",plugin.getSessionid())
        let options = {
            method:'GET',
            uri:util.format("%s%s/%s%s",baseUrl,session,uri,param),
            json:true,
            headers:{
                'Content-Type':'application/json'
            }
        }
        requestPromise(options).then(function(resp){
            failCnt = 0
            processResp(resp)
        }).catch(function(err){
            //log.info('get request err',err)
            return null
        })
    }

    sessionTimer = setInterval(plugin.initSession, 30000);

    lifecycle.observe(function() {
        clearInterval(sessionTimer)
        return true
    })

    return plugin
})
