# DragonBones tools

## Installation

```
$ npm install dragonbones-tools --global
```

## Help

* use `2db` convert other format files to DragonBones json format files.
* use `db2` convert DragonBones json format files to other format files.

```
$ 2db --help
$ db2 --help
```

## Examples
* Convert Spine json format files to DragonBones json format files in current path.
```
$ 2db -t spine
```
* Convert DragonBones json format files to Spine json format files in current path.
```
$ db2 -t spine
```
* Convert DragonBones json format files (file path contains "hero" key word) to DragonBones binary format files in current path.
```
$ db2 -t binary -f hero
```
* Convert DragonBones json format files to DragonBones binary format files from input path to output path and delete raw files.
```
$ db2 -t binary -i d:/input -o d:/output -d
```

## Notice
* Make sure you have installed a browser that supports html5.
* Make sure backup your raw resources before convert.

## Build
```
$ npm install
$ npm install typescript --global
$ tsc
```