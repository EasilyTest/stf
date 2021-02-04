# Batch control management platform based on openstf secondary development



| This project is based on openstf and openstf IOS secondary development. It also supports Android / IOS single control and group control.  
| This project can be compatible with Linux / Mac, using the latest open source tidevice to achieve WDA fast compile run, does not necessarily need the support of MAC devices, experience different openstf

-   Single control: Based on the original openstf, it is easy to operate, and can use file installation, shell, clipboard, log and other functions;  
-   Batch control: batch support of machine display on the same screen, one click home / remove and other functions;  

![ScreenShot](https://github.com/EasilyTest/stf/blob/master/batch.png)

## Quick start

Quick installation in two steps ：

- Mac

1.  Prepare a Mac host. If you do not wang to use IOS , Linux can also be used；

2.  install brew and nodejs，Run the command:  
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
    
3.  cd this folder,run cnpm install or npm install

4.  if use ios，configure WebDriverAgent,clone and cd，run ./Scripts/bootstrap.sh Download the dependency library for WDA
    install xcode（version< 10.3）,test WebDriverAgent 

5.  If the operation is wrong, check STF doctor
 
- Linux（centos）

1.environment 
    pip3 install -U tidevice  
    sudo -s  
	yum update  
	yum install git  
	yum install yum  
	yum -y install gcc  
	yum install gcc-c++  
	yum install gcc-gfortran  
	yum install zeromq-devel  


2.install rethinkdb  

	wget http://download.rethinkdb.com/centos/7/`uname -m`/rethinkdb.repo \  
          -O /etc/yum.repos.d/rethinkdb.repo  
	yum install rethinkdb  

  install GraphicsMagick  

	wget https://iweb.dl.sourceforge.net/project/graphicsmagick/graphicsmagick/1.3.26/GraphicsMagick-1.3.26.tar.gz  
	tar -zxvf GraphicsMagick-1.3.25.tar.gz  
	cd GraphicsMagick-1.3.25  
	./configure --prefix=/usr/local/gm  
	make  
	make install  

  install zeromq  

	wget https://github.com/zeromq/libzmq/releases/download/v4.2.2/zeromq-4.2.2.tar.gz  
	tar zxvf zeromq-4.2.2.tar.gz  
	cd zeromq-4.2.2  
	./configure --prefix=/usr/local/zeromq  
	make  
	make install  

  install pkg-config  

	wget http://pkgconfig.freedesktop.org/releases/pkg-config-0.29.2.tar.gz  
	tar -zxvf pkg-config-0.29.2.tar.gz  
	cd pkg-config-0.29.2  
	./configure --prefix=/usr/local/pkg-config --with-internal-glib  
	make  
	make intall  


  install yasm  

	wget http://www.tortall.net/projects/yasm/releases/yasm-1.3.0.tar.gz  
	tar -zxvf yasm-1.3.0.tar.gz  
	cd yasm-1.3.0  
	./configure --prefix=/usr/local/yasm  
	make  
	make install  


  install libsodium  

	wget https://download.libsodium.org/libsodium/releases/libsodium-1.0.15.tar.gz  
	tar -zxvf libsodium-1.0.10.tar.gz  
	./augen.sh  
	./configure --prefix=/usr/local/libsodium  
	make  
	make install  

  install protobuf  

	wget https://github.com/google/protobuf/releases/download/v3.5.0/protobuf-cpp-3.5.0.tar.gz  
	tar -zxvf protobuf-cpp-3.5.0.tar.gz  
	cd protobuf-3.5.0  
	./configure --prefix=/usr/local/protobuf  
	make  
	make intall  
  install libimobiledevice&ideviceinstaller  
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

	ln -s /usr/local/gm/bin/* /usr/local/bin/
	ln -s /usr/local/yasm/bin/* /usr/local/bin/
	ln -s /usr/local/libsodium/bin/* /usr/local/bin/
	ln -s /usr/local/protobuf/bin/* /usr/local/bin


  update /etc/profile

	export PKG_CONFIG_PATH=/usr/local/pkg-config
	export PATH=$PKG_CONFIG_PATH:$PATH


3.run cnpm install


## Related tools

-   [WebDriverAgent](https://github.com/EasilyTest/WebDriverAgent.git)
-   brew
-   xcode (<10.3)
-   nodejs (8)
-   python (3.7.6)


## Product advantages

-   Open Source: Based on open source, as long as you like it, I will continue to iterate. If you encounter bugs or suggestions, please commit issue;  



## Technology stack

-   angular ，nodejs

## Thanks

-   [openstf](https://jmeter.apache.org/)：Thanks to openstf as the basic engine  
-   [mrx1203](https://github.com/mrx1203/stf)：Thank you for the IOS design ideas provided by mrx1203  


If you think it's easy to use, please give me a star. recommend chrome viewer. The display experience is better. Open source is not easy and you like it and cherish it.


## License & Copyright

Licensed under the Apache License, Version 2.0 (the "License");you may not use this file except in compliance with the License.
You may obtain a copy of the License at 
 
	http://www.apache.org/licenses/LICENSE-2.0  
	
Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.See the License for the specific language governing permissions and limitations under the License.
