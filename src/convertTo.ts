#! /usr/bin/env node
import * as fs from "fs-extra";
import * as path from "path";
import * as commander from "commander";
import * as object from "./common/object";
import * as nodeUtils from "./common/nodeUtils";
import * as dbft from "./format/dragonBonesFormat";
import * as spft from "./format/spineFormat";
import * as dbUtils from "./format/utils";
import toFormat from "./action/toFormat";
import toNew from "./action/toNew";
import toBinary from "./action/toBinary";
import toWeb from "./action/toWeb";
import toSpine from "./action/toSpine";
import format from "./action/formatFormat";

function execute(): void {
    const commands = commander
        .version("0.0.51")
        .option("-i, --input [path]", "Input path")
        .option("-o, --output [path]", "Output path")
        .option("-t, --type [type]", "Convert to type [binary, new, v45, player, viewer, spine]", /^(binary|new|v45|player|viewer|spine|none)$/i, "none")
        .option("-f, --filter [keyword]", "Filter")
        .option("-d, --delete", "Delete raw files after convert complete")
        .parse(process.argv);

    const input = path.resolve(path.normalize(commands["input"] as string || process.cwd()));
    const output = "output" in commands ? path.resolve(path.normalize(commands["output"])) : input;
    const type = commands["type"] as string || "";
    const filter = commands["filter"] as string || "";
    const deleteRaw = commands["delete"] as boolean || false;
    let loadTextureAtlasToData = false;
    let megreTextureAtlasToData = false;

    switch (type) {
        case "binary":
            break;

        case "new":
            break;

        case "v45":
            break;

        case "player":
        case "viewer":
            loadTextureAtlasToData = true;
            megreTextureAtlasToData = true;
            break;

        case "spine":
            loadTextureAtlasToData = true;
            megreTextureAtlasToData = true;
            break;

        default:
            console.log(`Unknown type: ${type}`);
            return;
    }

    const files = nodeUtils.filterFileList(input, /\.(json)$/i);
    for (const file of files) {
        if (filter && file.indexOf(filter) < 0) {
            continue;
        }

        const dirURL = path.dirname(file);
        const fileName = path.basename(file, ".json");
        const fileString = fs.readFileSync(file, "utf-8");
        let textureAtlasFiles: string[] | null = null;
        let textureAtlasImages: string[] | null = null;
        let textureAtlases: dbft.TextureAtlas[] | null = null;
        const dragonBonesData = toFormat(fileString, () => {
            textureAtlasFiles = dbUtils.getTextureAtlases(file);
            textureAtlases = textureAtlasFiles.map((v) => {
                return getTextureAtlas(v);
            });

            return textureAtlases;
        });

        if (!dragonBonesData) {
            continue;
        }

        if (dragonBonesData.textureAtlas.length > 0) {
            textureAtlasFiles = null;
            textureAtlasImages = dragonBonesData.textureAtlas.map((v) => {
                return v.imagePath;
            });
            textureAtlases = dragonBonesData.textureAtlas;
        }
        else {
            if (!textureAtlasFiles) {
                textureAtlasFiles = dbUtils.getTextureAtlases(file);
            }
            textureAtlasImages = textureAtlasFiles.map((v) => {
                return v.replace(".json", ".png");
            });

            if (loadTextureAtlasToData && textureAtlasFiles.length > 0) {
                textureAtlases = textureAtlasFiles.map((v) => {
                    return getTextureAtlas(v);
                });
            }
        }

        if (megreTextureAtlasToData && textureAtlases && dragonBonesData.textureAtlas.length === 0) {
            for (const textureAtals of textureAtlases) {
                dragonBonesData.textureAtlas.push(textureAtals);
            }

            textureAtlases = dragonBonesData.textureAtlas;
        }

        switch (type) {
            case "binary": {
                toNew(dragonBonesData, true);
                format(dragonBonesData);

                const outputDirURL = dirURL.replace(input, output);
                const outputURL = path.join(outputDirURL, fileName + ".dbbin");
                const result = toBinary(dragonBonesData);

                if (!fs.existsSync(outputDirURL)) {
                    fs.mkdirsSync(outputDirURL);
                }

                fs.writeFileSync(outputURL, new Buffer(result));
                console.log(outputURL);

                if (deleteRaw) {
                    fs.unlinkSync(file);
                }

                if (outputDirURL !== dirURL) {
                    if (textureAtlasFiles && !megreTextureAtlasToData) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            const outputURL = textureAtlasFile.replace(input, output);

                            if (deleteRaw) {
                                fs.moveSync(textureAtlasFile, outputURL);
                            }
                            else {
                                fs.copySync(textureAtlasFile, outputURL);
                            }

                            console.log(outputURL);
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputURL = textureAtlasImage.replace(input, output);

                        if (deleteRaw) {
                            fs.moveSync(textureAtlasImage, outputURL);
                        }
                        else {
                            fs.copySync(textureAtlasImage, outputURL);
                        }

                        console.log(outputURL);
                    }
                }
                else if (textureAtlasFiles && megreTextureAtlasToData) {
                    for (const textureAtlasFile of textureAtlasFiles) {
                        fs.removeSync(textureAtlasFile);
                    }
                }

                break;
            }

            case "new": {
                toNew(dragonBonesData, false);
                format(dragonBonesData);
                object.compress(dragonBonesData, dbft.compressConfig);

                const outputDirURL = dirURL.replace(input, output);
                const outputURL = path.join(outputDirURL, fileName + ".json");
                const result = JSON.stringify(dragonBonesData);

                if (!fs.existsSync(outputDirURL)) {
                    fs.mkdirsSync(outputDirURL);
                }

                fs.writeFileSync(outputURL, new Buffer(result));
                console.log(outputURL);

                if (outputDirURL !== dirURL) {
                    if (deleteRaw) {
                        fs.unlinkSync(file);
                    }

                    if (textureAtlasFiles && !megreTextureAtlasToData) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            const outputURL = textureAtlasFile.replace(input, output);

                            if (deleteRaw) {
                                fs.moveSync(textureAtlasFile, outputURL);
                            }
                            else {
                                fs.copySync(textureAtlasFile, outputURL);
                            }

                            console.log(outputURL);
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputURL = textureAtlasImage.replace(input, output);

                        if (deleteRaw) {
                            fs.moveSync(textureAtlasImage, outputURL);
                        }
                        else {
                            fs.copySync(textureAtlasImage, outputURL);
                        }

                        console.log(outputURL);
                    }
                }
                else if (textureAtlasFiles && megreTextureAtlasToData) {
                    for (const textureAtlasFile of textureAtlasFiles) {
                        fs.removeSync(textureAtlasFile);
                    }
                }

                break;
            }

            case "player":
            case "viewer": {
                toNew(dragonBonesData, true);
                format(dragonBonesData);

                const outputDirURL = dirURL.replace(input, output);
                const outputURL = path.join(outputDirURL, fileName + ".html");
                const result = toWeb({
                    data: new Buffer(toBinary(dragonBonesData)),
                    textureAtlases: textureAtlasImages.map((v) => {
                        if (fs.existsSync(v)) {
                            return fs.readFileSync(v);
                        }

                        return null;
                    }),
                    config: {
                        isLocal: true
                    }
                }, type === "player");

                if (!fs.existsSync(outputDirURL)) {
                    fs.mkdirsSync(outputDirURL);
                }

                fs.writeFileSync(outputURL, new Buffer(result));
                console.log(outputURL);

                if (deleteRaw) {
                    fs.unlinkSync(file);

                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            fs.unlinkSync(textureAtlasFile);
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        fs.unlinkSync(textureAtlasImage);
                    }
                }

                break;
            }

            case "spine": {
                toNew(dragonBonesData, true);
                format(dragonBonesData);

                const outputDirURL = dirURL.replace(input, output);
                const result = toSpine(dragonBonesData, "3.6.0", !output);
                const suffix = outputDirURL === dirURL ? "_spine" : "";
                dragonBonesData.name = fileName.replace("_ske", "");
                console.log(dragonBonesData.name);

                if (!fs.existsSync(outputDirURL)) {
                    fs.mkdirsSync(outputDirURL);
                }

                for (const spine of result.spines) {
                    object.compress(spine, spft.compressConfig);
                    const outputURL = path.join(outputDirURL, (result.spines.length > 1 ? dragonBonesData.name + "_" + spine.skeleton.name : dragonBonesData.name) + suffix + ".json");
                    delete spine.skeleton.name; // Delete keep name.
                    fs.writeFileSync(outputURL, JSON.stringify(spine));
                    console.log(outputURL);
                }

                const outputURL = path.join(outputDirURL, dragonBonesData.name + suffix + ".atlas");
                fs.writeFileSync(outputURL, result.textureAtlas);
                console.log(outputURL);

                if (deleteRaw) {
                    fs.unlinkSync(file);

                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            fs.unlinkSync(textureAtlasFile);
                        }
                    }
                }

                if (outputDirURL !== dirURL) {
                    let index = 0;
                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputURL = path.join(
                            path.dirname(textureAtlasImage.replace(input, output)),
                            dragonBonesData.name + suffix + (textureAtlasImages.length > 1 ? "_" + index : "") + ".png"
                        );

                        if (fs.existsSync(textureAtlasImage)) {
                            if (deleteRaw) {
                                fs.moveSync(textureAtlasImage, outputURL);
                            }
                            else {
                                fs.copySync(textureAtlasImage, outputURL);
                            }
                        }

                        console.log(outputURL);
                        index++;
                    }
                }
                break;
            }

            default:
                break;
        }
    }

    console.log("Convert complete.");
}

function getTextureAtlas(textureAtlasFile: string): dbft.TextureAtlas {
    const textureAtlas = new dbft.TextureAtlas();
    object.copyObjectFrom(JSON.parse(fs.readFileSync(textureAtlasFile, "utf-8")), textureAtlas, dbft.copyConfig);

    return textureAtlas;
}

execute();