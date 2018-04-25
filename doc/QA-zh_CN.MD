* 问：龙骨的官网在哪里？
* 答：
    * 龙骨官网：http://dragonbones.com/ （仅仅做为官网，暂时没人维护）
    * github 龙骨官网：https://github.com/DragonBones/ （源码和例子都在这里，维护良好，建议以此为准）

* 问：为什么 PS 导出插件会报各种莫名其妙的错误？
* 答：建议使用完整版的 PS 而不是各种精简版的 PS。

* 问：为什么无法导出文件或无法预览？
* 答：看看浏览器是否是大牌浏览器，尽量不要使用山寨杂牌浏览器。

* 问：为什么浏览器是大牌的仍然无法导出文件或无法预览？
* 答：有可能是 DragonBonesPro 的缓存损坏造成的，建议删除缓存文件夹 `C:\Users\你的用户名\AppData\Roaming\DragonBonesPro\Local Store`。

* 问：为什么导入的 Spine 文件不太正确？
* 答：DragonBonesPro 的导入插件做的不好，可以尝试我们提供的全新转换方式 [DragonBones Tools](https://github.com/DragonBones/Tools) ，这个全新的转换插件需要依赖 NodeJS 和 npm。转换后的文件可以在 [DragonBones Viewer](https://dbplayer.egret-labs.org/viewer/v1/index.html) 中查看（将转换出来的文件全选，然后拖拽到窗口即可），这些文件可以在龙骨运行时中良好的运行，但是无法在 DragonBones Pro 中运行，因为 DragonBones Pro 开发的不完善。

* 问：为什么修改项目的 library 后，会出现各种错误？比如找不到图片等？
* 答：因为 DragonBonesPro 的 library 功能开发的不好，为了你的工程安全，最好还是乖乖的用默认。

* 问：为什么我修改了图片名后，可能出现找不到图片的情况？
* 答：因为 DragonBonesPro 的资源管理的功能开发的不好，为了你的工程安全，请谨慎的修改图片名称。
