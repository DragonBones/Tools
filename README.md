# DragonBones tools

## Installation

```
$ npm install dragonbones-tools --global
```

## Help
```
$ db2 --help
```

## Examples
* Convert current path DragonBones json file to spine file.
```
$ db2 -t spine
```
* Convert current path DragonBones json file (file path contains "hero" key word) to DragonBones binary file.
```
$ db2 -t binary -f hero
```
* Convert DragonBones json file from input path to output path and delete raw file.
```
$ db2 -t binary -i d:/input -o d:/output -d
```