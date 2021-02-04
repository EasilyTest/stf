# 基于openstf二次开发的群控管理平台


> [English](README-EN.md) | 中文  

| 本项目根据openstf以及openstf-ios二次开发。同时支持Android/iOS单体控制以及群体控制。  
| 本项目可以兼容Linux/Mac，利用最新开源的tidevice实现wda快速编译运行，不一定需要Mac设备的支持，体验不一样的openstf.  

-   单控: 基于原生的openstf，操作便捷可使用文件安装，shell、剪贴板、日志等功能；
-   群控: 批量支持机器同屏展示，一键home/移除等功能；

![ScreenShot](https://github.com/EasilyTest/stf/blob/master/batch.png)

## 快速开始

仅需两步快速安装 （Mac）：


1.  准备一台 Mac 主机；

2.  安装 brew 以及nodejs，运行以下命令  
    pip3 install -U tidevice  
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

5.  如运行错误，检查stf doctor
   
Linux(centos):   

1.  基础环境准备  
    pip3 install -U tidevice  
    sudo -s  
    yum update  
    yum install git  
    yum install yum  
    yum -y install gcc  
    yum install gcc-c++  
    yum install gcc-gfortran  
    yum install zeromq-devel  
    
	
2.  安装rethinkdb  
    wget http://download.rethinkdb.com/centos/7/`uname -m`/rethinkdb.repo \  
      -O /etc/yum.repos.d/rethinkdb.repo  
    yum install rethinkdb  
    

    安装GraphicsMagick  

	wget https://iweb.dl.sourceforge.net/project/graphicsmagick/graphicsmagick/1.3.26/GraphicsMagick-1.3.26.tar.gz  
	tar -zxvf GraphicsMagick-1.3.25.tar.gz  
	cd GraphicsMagick-1.3.25  
	./configure --prefix=/usr/local/gm  
	make  
	make install  

    安装zeromq  

	wget https://github.com/zeromq/libzmq/releases/download/v4.2.2/zeromq-4.2.2.tar.gz  
	tar zxvf zeromq-4.2.2.tar.gz  
	cd zeromq-4.2.2  
	./configure --prefix=/usr/local/zeromq  
	make  
	make install  

    安装pkg-config  

	wget http://pkgconfig.freedesktop.org/releases/pkg-config-0.29.2.tar.gz  
	tar -zxvf pkg-config-0.29.2.tar.gz  
	cd pkg-config-0.29.2  
	./configure --prefix=/usr/local/pkg-config --with-internal-glib  
	make  
	make intall  

    安装yasm  

	wget http://www.tortall.net/projects/yasm/releases/yasm-1.3.0.tar.gz  
	tar -zxvf yasm-1.3.0.tar.gz  
	cd yasm-1.3.0  
	./configure --prefix=/usr/local/yasm  
	make  
	make install  

    安装libsodium  

	wget https://download.libsodium.org/libsodium/releases/libsodium-1.0.15.tar.gz  
	tar -zxvf libsodium-1.0.10.tar.gz  
	./augen.sh  
	./configure --prefix=/usr/local/libsodium  
	make  
	make install  

    安装protobuf  

	wget https://github.com/google/protobuf/releases/download/v3.5.0/protobuf-cpp-3.5.0.tar.gz  
	tar -zxvf protobuf-cpp-3.5.0.tar.gz  
	cd protobuf-3.5.0  
	./configure --prefix=/usr/local/protobuf  
	make  
	make intall  

    软链接

	ln -s /usr/local/gm/bin/* /usr/local/bin/  
	ln -s /usr/local/yasm/bin/* /usr/local/bin/  
	ln -s /usr/local/libsodium/bin/* /usr/local/bin/  
	ln -s /usr/local/protobuf/bin/* /usr/local/bin/  

    更新/etc/profile

	export PKG_CONFIG_PATH=/usr/local/pkg-config
	export PATH=$PKG_CONFIG_PATH:$PATH  

    安装libimobiledevice、ideviceinstaller  
       git clone https://github.com/libimobiledevice/libimobiledevice.git  
       cd libimobiledevice  
       ./autogen.sh --prefix=/opt/local --enable-debug  
       make  
       sudo make install  
       git clone https://github.com/libimobiledevice/ideviceinstaller.git  
       cd ideviceinstaller  
       ./autogen.sh  
       make  
       sudo make install  

3.  cd到目录执行cnpm install或者npm install + glup build



## 相关工具

-   [WebDriverAgent](https://github.com/EasilyTest/WebDriverAgent.git)
-   brew
-   xcode (<10.3)
-   nodejs (8)
-   python


## 测试使用版本  

-   macOS Catalina 10.15.6
-   CentOS Linux release 7.8.2003 (Core)
-   xcode (10.0)
-   nodejs (8.9.0)
-   python (3.7.6)


## 产品优势

-   开源：基于开源、只要你敢点赞，我就会一直迭代下去，遇到bug或建议请提issue；



## 技术栈

-   angular ，nodejs

## 致谢

-   [openstf](https://jmeter.apache.org/)：感谢 openstf  作为基础引擎
-   [stf](https://github.com/mrx1203/stf)：感谢 mrx1203 提供的iOS设计思路
-   [tidevice](https://github.com/alibaba/taobao-iphone-device)：感谢 阿里 开源的iOS设备通信工具


如果觉得好用的话，请给我点个star，推荐chrome游览器，显示体验更佳，开源不易且赞且珍惜。


## License & Copyright

Licensed under the Apache License, Version 2.0 (the "License");you may not use this file except in compliance with the License.
You may obtain a copy of the License at 
 
	http://www.apache.org/licenses/LICENSE-2.0  
	
Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.See the License for the specific language governing permissions and limitations under the License.
