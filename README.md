# 基于openstf二次开发的群控管理平台


|                                                                                       |
| ------------------------------------------------------------------------------------------------------------ |
| 本项目根据openstf以及openstf-ios二次开发。同时支持Android/iOS单体控制以及群体控制。


-   单控: 基于原生的openstf，操作便捷可使用文件安装，shell、剪贴板、日志等功能；
-   群控: 批量支持机器同屏展示，一键home/移除等功能；



## 快速开始

仅需两步快速安装 MeterSphere：

1.  准备一台 Mac 主机；

2.  安装 brew 以及nodejs（version 8，推荐使用8.9.3），运行以下命令
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
    
3.  进入本项目目录,执行 cnpm install 或者 npm install

4.  如需使用ios接入，配置WebDriverAgent,clone代码，clone完毕后进入目录，执行./Scripts/bootstrap.sh 下载 wda所需依赖库
    安装xcode（版本< 10.3）,运行WebDriverAgent
   


## 相关工具

-   [WebDriverAgent](https://github.com/EasilyTest/WebDriverAgent.git)
-   [brew]( /bin/zsh -c "$(curl -fsSL https://gitee.com/cunkai/HomebrewCN/raw/master/Homebrew.sh)" )



## 产品优势

-   开源：基于开源、只要你敢点赞，我就会一直迭代下去，遇到bug或建议请提issue；



## 技术栈

-   angular ，nodejs

## 致谢

-   [openstf](https://jmeter.apache.org/)：感谢 openstf  作为基础引擎
-   [mrx1203](https://github.com/mrx1203/stf)：感谢 mrx1203 提供的iOS设计思路


如果觉得好用的话，请给我点个star，推荐chrome游览器，显示体验更加，开源不易且赞且珍惜。


## License & Copyright

Licensed under The GNU General Public License version 2 (GPLv2)  (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

<https://www.gnu.org/licenses/gpl-2.0.html>

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
