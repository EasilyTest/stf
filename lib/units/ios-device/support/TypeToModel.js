
DeviceType = {
    "iPhone6,1":"iPhone 5s"
    ,"iPhone6,2":"iPhone 5s"
    ,"iPhone7,2":"iPhone 6"
    ,"iPhone7,1":"iPhone 6 Plus"
    ,"iPhone8,1":"iPhone 6s"
    ,"iPhone8,2":"iPhone 6s Plus"
    ,"iPhone8,4":"iPhone SE"
    ,"iPhone9,1":"iPhone 7"
    ,"iPhone9,3":"iPhone 7"
    ,"iPhone9,2":"iPhone 7 Plus"
    ,"iPhone9,4":"iPhone 7 Plus"
    ,"iPhone10,1":"iPhone 8"
    ,"iPhone10,4":"iPhone 8"
    ,"iPhone10,2":"iPhone 8 Plus"
    ,"iPhone10,5":"iPhone 8 Plus"
    ,"iPhone10,3":"iPhone X"
    ,"iPhone10,6":"iPhone X"
    ,"iPhone11,8":"iPhone XR"
    ,"iPhone11,2":"iPhone XS"
    ,"iPhone11,6":"iPhone XS Max"
    ,"iPhone11,4":"iPhone XS Max"
    ,"iPad6,11":"iPad air 2"
}

var ProductType={
    
    toModel:function(type){
        return DeviceType[type]
    }
}

module.exports = ProductType