function FrameParser() {
  this.readFrameBytes = 0
  this.frameBodyLength = 0
  this.frameBody = null
  this.chunk = null
  this.startByte = Buffer.from("--BoundaryString--Content-type: image/jpg--")
  this.startLen = this.startByte.length
  this.rotation = 1
}

FrameParser.prototype.push = function(chunk) {
  if (this.chunk) {
    throw new Error('Must consume pending frames before pushing more chunks')
  }

  this.chunk = chunk
}

FrameParser.prototype.nextFrame = function() {
  if (!this.chunk) {
    return null
  }
  if (this.chunk.indexOf(Buffer.from('Server: WDA MJPEG Server'))!=-1){
    this.chunk= null
    return null
  }
  if(this.chunk.indexOf(this.startByte)!=-1){
    var startPos = this.startLen+3
    var rostr = this.chunk.slice(this.startLen,startPos+3).toString('utf8')
    this.rotation = parseInt(rostr.split('=')[1],10)
    if(this.frameBody){
      this.chunk = this.chunk.slice(startPos)
      completeBody = this.frameBody
      this.frameBody = null
      return completeBody
    }
    else{
      this.frameBody = this.chunk.slice(startPos)
      this.chunk = null
    }
  }
  else{
    if(this.frameBody){
      this.frameBody = Buffer.concat([this.frameBody,this.chunk])
      this.chunk = null
    }
    else{
      this.frameBody = this.chunk
      this.chunk = null
    }
  }
  this.chunk = null
  return null
}

module.exports = FrameParser
