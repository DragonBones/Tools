# DragonBones tools

## JSON format
* [V 5.5](./doc/dragonbones_json_format_5.5.md)

## Installation
$ `npm install dragonbones-tools --global`

## Help
* use `2db` convert other format files to DragonBones json format files.
    
    $ `2db --help`
* use `db2` convert DragonBones json format files to other format files.
    
    $ `db2 --help`

## How to use
* Convert old DragonBones json format files to new DragonBones json format files in current path.
    
    $ `2db -t new`
* Convert Spine json format files to DragonBones json format files in current path.
    
    $ `2db -t spine`
* Convert DragonBones json format files to Spine json format files in current path.
    
    $ `db2 -t spine`
* Convert DragonBones json format files (file path contains "hero" key word) to DragonBones binary format files in current path.
    
    $ `db2 -t binary -f hero`
* Convert DragonBones json format files to DragonBones binary format files from input path to output path and delete raw files.
    
    $ `db2 -t binary -i d:/input -o d:/output -d`

## Notice
* Make sure you have installed [nodeJS](https://nodejs.org/).
* Make sure you have installed a browser that supports html5.
* Make sure backup your raw resources before convert.

## How to build
* $ `npm install`
* $ `npm install typescript --global`
* $ `tsc`