* 问：龙骨的官网在哪里？
* 答：
    * 龙骨官网：http://dragonbones.com/ （仅仅做为官网，维护稍慢）
    * github 龙骨官网：https://github.com/DragonBones/ （源码和例子都在这里，维护良好，建议以此为准）

* 问：为什么 PS 导出插件会报各种莫名其妙的错误？
* 答：建议使用完整版的 PS 而不是各种精简版的 PS。

* 问：为什么无法导出文件或无法预览？
* 答：确保设备的浏览器是支持 html5 的浏览器。项目名称不可含有特殊符号等，例如空格、小数点。

* 问：文件、骨架、骨骼、插槽、显示资源、动画的命名有什么规范吗？
* 答：为了不给程序开发带来不必要的麻烦，尽量只使用英文，尽量不要使用奇怪的符号。

* 问：库的文件结构有什么特殊要求吗？
* 答：某些引擎可能不支持多级文件夹，而找不到贴图，这个时候将贴图资源都放到库的根目录可以解决这类问题。

* 问：为什么浏览器支持 html5 仍然无法导出文件或无法预览？
* 答：可能由于 DragonBones Pro 的缓存损坏造成的，建议删除缓存文件夹 `C:\Users\{你的用户名}\AppData\Roaming\DragonBonesPro\Local Store`。

* 问：为什么导入的 Spine 文件不太正确？
* 答：DragonBones Pro 的导入插件有一些兼容问题，可以尝试全新的转换方式 [DragonBones Tools](https://github.com/DragonBones/Tools) ，该转换插件需要依赖 NodeJS 和 npm。转换后的文件可以在 [DragonBones Viewer](https://dbplayer.egret-labs.org/viewer/v1/index.html) 中查看（将转换的文件全选，并拖拽到浏览器窗口即可），这些文件可以在龙骨运行时中良好的运行，但目前还无法在 DragonBones Pro 中运行，DragonBones Pro 有一些兼容问题。

* 问：为什么修改项目的 library 后，会出现各种错误？比如找不到图片等？
* 答：因为 DragonBonesPro 的 library 功能开发的不够完善，为了保证工程地安全，建议不要使用此功能。

* 问：为什么我修改了图片名后，可能出现找不到图片的情况？
* 答：因为 DragonBonesPro 的 library 功能开发的不够完善，为了保证工程地安全，建议不要使用此功能。

* 问：Flash 动画怎么导入 DragonBones Pro？
* 答：可部分参考[这篇文章](http://dragonbones.com/2015/getting_startedV20_cn.htmlhttp://dragonbones.com/2015/getting_startedV20_cn.html)，将插件导出的 JSON 导入到 DragonBones Pro 即可。

* 问：为什么导出的动画贴图在游戏引擎会有黑边？
* 答：Cocos Creater 的[解决办法](http://forum.cocos.com/t/creater-blend-premultiply-alpha/43260/3)，Unity 同理。
