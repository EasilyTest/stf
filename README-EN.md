# Batch control management platform based on openstf secondary development



| This project is based on openstf and openstf IOS secondary development. It also supports Android / IOS single control and group control.  


-   Single control: Based on the original openstf, it is easy to operate, and can use file installation, shell, clipboard, log and other functions;  
-   Batch control: batch support of machine display on the same screen, one click home / remove and other functions;  



## Quick start

Quick installation in two steps ：

1.  Prepare a Mac host. If you do not wang to use IOS , Linux can also be used；

2.  install brew and nodejs，Run the command:  
    brew uninstall --ignore-dependencies libimobiledevice  
    brew uninstall --ignore-dependencies usbmuxd  
    brew install --HEAD usbmuxd  
    brew unlink usbmuxd  
    brew link usbmuxd  
    brew install --HEAD libimobiledevice  
    brew install --HEAD ideviceinstaller  
    brew install carthage  
    brew install socat  
    brew install graphicsmagick zeromq protobuf yasm pkg-config  
    brew cask install android-platform-tools  
    
3.  cd this folder,run cnpm install or npm install

4.  if use ios，configure WebDriverAgent,clone and cd，run ./Scripts/bootstrap.sh Download the dependency library for WDA
    install xcode（version< 10.3）,test WebDriverAgent 

5.  If the operation is wrong, check STF doctor
   


## Related tools

-   [WebDriverAgent](https://github.com/EasilyTest/WebDriverAgent.git)
-   brew
-   xcode (<10.3)
-   nodejs (8)



## Product advantages

-   Open Source: Based on open source, as long as you like it, I will continue to iterate. If you encounter bugs or suggestions, please commit issue;  



## 技术栈

-   angular ，nodejs

## 致谢

-   [openstf](https://jmeter.apache.org/)：Thanks to openstf as the basic engine  
-   [mrx1203](https://github.com/mrx1203/stf)：Thank you for the IOS design ideas provided by mrx1203  


If you think it's easy to use, please give me a star. recommend chrome viewer. The display experience is better. Open source is not easy and you like it and cherish it.


## License & Copyright

Licensed under the Apache License, Version 2.0 (the "License");you may not use this file except in compliance with the License.
You may obtain a copy of the License at 
 
	http://www.apache.org/licenses/LICENSE-2.0  
	
Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.See the License for the specific language governing permissions and limitations under the License.
