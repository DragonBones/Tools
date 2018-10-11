# 如何在 Egret 中使用 Live2D 的动画资源

* 使用[龙骨的运行库](https://github.com/DragonBones/DragonBonesJS/tree/master/Egret/4.x/out)取代 Egret 内置的龙骨运行库。
  * 该功能稍后会正式加入 Egret 内置库。
* 使用 Live2D 2.x 版本的模型动画工具制作模型动画并导出 JSON 模型动画数据。
* 使用 [DragonBones Tools](https://github.com/DragonBones/Tools) 将 Live2D 的 JSON 动画数据转换成龙骨动画数据。
* 参考下面的例子使用转换后的龙骨动画数据。
  * [例子源码](https://github.com/DragonBones/DragonBonesJS/blob/master/Egret/Demos/src/demo/EyeTracking.ts)
  * [在线演示](https://dragonbones.github.io/demo/EyeTracking/index.html)
  
* 如果在开发中对该功能有任何问题或建议，请戳[这里](https://github.com/DragonBones/DragonBonesJS/issues)提交你的问题或建议。
