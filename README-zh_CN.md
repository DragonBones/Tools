# DragonBones tools

[README in English](./README.md)

## [常见问题](./doc/QA-zh_CN.md)

## JSON 格式文档

* [V 5.5](./doc/dragonbones_json_format_5.5-zh_CN.md)

## 如何安装

* 安装 [Node.JS](https://nodejs.org/)。

* 安装支持 html5 的浏览器，并且该浏览器是默认浏览器。

* 命令行执行如下命令：

    * $ `npm install dragonbones-tools --global`

## 帮助

* 使用 `2db` 命令将其他动画格式文件转换为龙骨 JSON 格式文件，使用 `--help` 命令查看 api 帮助。
    
    $ `2db --help`

* use `db2` 命令将龙骨 JSON 格式文件转换为其他动画格式文件，使用 `--help` 命令查看 api 帮助。
    
    $ `db2 --help`

## 如何使用

* 将当面目录下所有的 Spine JSON 格式文件转换为龙骨 JSON 格式文件。
    
    $ `2db -t spine`

* 将当面目录下所有的 Live2d JSON 格式文件转换为龙骨 JSON 格式文件。
    
    $ `2db -t live2d`

* 将当面目录下所有的龙骨 JSON 格式文件转换为最新的龙骨 JSON 格式文件。
    
    $ `db2 -t new`

* 将当面目录下所有的龙骨 JSON 格式文件转换为 Spine JSON 格式文件。
    
    $ `db2 -t spine`

* 将当面目录下所有包含 `hero` 关键字的龙骨 JSON 格式文件转换为龙骨二进制格式文件。
    
    $ `db2 -t binary -f hero`

* 将输入目录所有的龙骨 JSON 格式文件转换为龙骨二进制格式文件并输出到指定目录。
    
    $ `db2 -t binary -i d:/input -o d:/output -d`

## 注意事项

* 请确认在转换文件之前备份原始文件。

## 如何编译

* $ `npm install`

* $ `npm install typescript --global`

* $ `tsc`

* $ `npm link`