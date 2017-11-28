#! /usr/bin/env node
import * as fs from "fs-extra";
import * as path from "path";
import * as commander from "commander";
import * as utils from "./common/utils";
import * as dbft from "./format/dragonBonesFormat";
import * as spft from "./format/spineFormat";
import * as dbUtils from "./format/utils";
import toFormat from "./action/toFormat";
import toV45 from "./action/toV45";
import toNew from "./action/toNew";
import toBinary from "./action/toBinary";
import toWeb from "./action/toWeb";
import toSpine from "./action/toSpine";
import format from "./action/formatFormat";

function execute(): void {
    const commands = commander
        .version("0.0.14")
        .option("-i, --input [path]", "Input path")
        .option("-o, --output [path]", "Output path")
        .option("-t, --type [type]", "Convert to type [binary, new, v45, player, viewer, spine]", /^(binary|new|v45|player|viewer|spine|none)$/i, "none")
        .option("-f, --filter [keyword]", "Filter")
        .option("-d, --delete", "Delete raw files after convert complete")
        .parse(process.argv);

    const input = path.resolve(commands["input"] as string || process.cwd());
    const output = commands["output"] ? path.resolve(commands["output"] as string || "") : null;
    const type = commands["type"] as string || "";
    const filter = commands["filter"] as string || "";
    const deleteRaw = commands["delete"] as boolean || false;
    let loadTextureAtlasToData = false;
    let megreTextureAtlasToData = false;

    switch (type) {
        case "binary":
            break;

        case "new":
            if (!output) {
            }
            break;

        case "v45":
            if (!output) {
            }
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

    const files = utils.filterFileList(input, /\.(json)$/i);
    for (const file of files) {
        if (filter && file.indexOf(filter) < 0) {
            continue;
        }

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

                const result = toBinary(dragonBonesData);
                const outputFile = (output ? file.replace(input, output) : file).replace(".json", ".dbbin");

                if (!fs.existsSync(path.dirname(outputFile))) {
                    fs.mkdirsSync(path.dirname(outputFile));
                }
                fs.writeFileSync(outputFile, new Buffer(result));
                console.log(outputFile);

                if (deleteRaw && output) {
                    fs.unlinkSync(file);

                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            if (megreTextureAtlasToData) {
                                fs.removeSync(textureAtlasFile);
                            }
                            else {
                                const outputFile = textureAtlasFile.replace(input, output);
                                fs.moveSync(textureAtlasFile, outputFile);
                                console.log(outputFile);
                            }
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputFile = textureAtlasImage.replace(input, output);
                        fs.moveSync(textureAtlasImage, outputFile);
                        console.log(outputFile);
                    }
                }
                else if (deleteRaw) {
                    fs.unlinkSync(file);

                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            if (megreTextureAtlasToData) {
                                fs.removeSync(textureAtlasFile);
                            }
                        }
                    }
                }
                else if (output) {
                    if (textureAtlasFiles && !megreTextureAtlasToData) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            const outputFile = textureAtlasFile.replace(input, output);
                            fs.copySync(textureAtlasFile, outputFile);
                            console.log(outputFile);
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputFile = textureAtlasImage.replace(input, output);
                        fs.copySync(textureAtlasImage, outputFile);
                        console.log(outputFile);
                    }
                }

                break;
            }

            case "new": {
                toNew(dragonBonesData, false);
                format(dragonBonesData);
                utils.compress(dragonBonesData, dbft.compressConfig);

                const result = JSON.stringify(dragonBonesData);
                const outputFile = output ? file.replace(input, output) : file;

                if (!fs.existsSync(path.dirname(outputFile))) {
                    fs.mkdirsSync(path.dirname(outputFile));
                }
                fs.writeFileSync(outputFile, result);
                console.log(outputFile);

                if (deleteRaw && output) {
                    fs.unlinkSync(file);

                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            if (megreTextureAtlasToData) {
                                fs.removeSync(textureAtlasFile);
                            }
                            else {
                                const outputFile = textureAtlasFile.replace(input, output);
                                fs.moveSync(textureAtlasFile, outputFile);
                                console.log(outputFile);
                            }
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputFile = textureAtlasImage.replace(input, output);
                        fs.moveSync(textureAtlasImage, outputFile);
                        console.log(outputFile);
                    }
                }
                else if (deleteRaw) {
                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            if (megreTextureAtlasToData) {
                                fs.removeSync(textureAtlasFile);
                            }
                        }
                    }
                }
                else if (output) {
                    if (textureAtlasFiles && !megreTextureAtlasToData) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            const outputFile = textureAtlasFile.replace(input, output);
                            fs.copySync(textureAtlasFile, outputFile);
                            console.log(outputFile);
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputFile = textureAtlasImage.replace(input, output);
                        fs.copySync(textureAtlasImage, outputFile);
                        console.log(outputFile);
                    }
                }

                break;
            }

            case "v45": {
                toV45(dragonBonesData);
                format(dragonBonesData);
                utils.compress(dragonBonesData, dbft.compressConfig);

                const result = JSON.stringify(dragonBonesData);
                const outputFile = output ? file.replace(input, output) : file;

                if (!fs.existsSync(path.dirname(outputFile))) {
                    fs.mkdirsSync(path.dirname(outputFile));
                }
                fs.writeFileSync(outputFile, result);
                console.log(outputFile);

                if (deleteRaw && output) {
                    fs.unlinkSync(file);

                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            if (megreTextureAtlasToData) {
                                fs.removeSync(textureAtlasFile);
                            }
                            else {
                                const outputFile = textureAtlasFile.replace(input, output);
                                fs.moveSync(textureAtlasFile, outputFile);
                                console.log(outputFile);
                            }
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputFile = textureAtlasImage.replace(input, output);
                        fs.moveSync(textureAtlasImage, outputFile);
                        console.log(outputFile);
                    }
                }
                else if (deleteRaw) {
                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            if (megreTextureAtlasToData) {
                                fs.removeSync(textureAtlasFile);
                            }
                        }
                    }
                }
                else if (output) {
                    if (textureAtlasFiles && !megreTextureAtlasToData) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            const outputFile = textureAtlasFile.replace(input, output);
                            fs.copySync(textureAtlasFile, outputFile);
                            console.log(outputFile);
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        const outputFile = textureAtlasImage.replace(input, output);
                        fs.copySync(textureAtlasImage, outputFile);
                        console.log(outputFile);
                    }
                }

                break;
            }

            case "player":
            case "viewer": {
                toNew(dragonBonesData, true);
                format(dragonBonesData);

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
                const outputFile = (output ? file.replace(input, output) : file).replace(".json", ".html");

                if (!fs.existsSync(path.dirname(outputFile))) {
                    fs.mkdirsSync(path.dirname(outputFile));
                }
                fs.writeFileSync(outputFile, new Buffer(result));
                console.log(outputFile);

                if (deleteRaw) {
                    fs.unlinkSync(file);

                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            fs.removeSync(textureAtlasFile);
                        }
                    }

                    for (const textureAtlasImage of textureAtlasImages) {
                        fs.removeSync(textureAtlasImage);
                    }
                }
                break;
            }

            case "spine": {
                toNew(dragonBonesData, true);
                format(dragonBonesData);

                const result = toSpine(dragonBonesData, "3.6.0", !output);
                const base = (output ? file.replace(input, output) : file).replace("_ske.json", "");
                dragonBonesData.name = path.basename(base); // Modify name to file name.
                console.log(dragonBonesData.name);

                for (const spine of result.spines) {
                    utils.compress(spine, spft.compressConfig);
                    const outputFile = (result.spines.length > 1 ? base + "_" + spine.skeleton.name : base) + (output ? ".json" : "_spine.json");
                    delete spine.skeleton.name; // delete keep name.
                    if (!fs.existsSync(path.dirname(outputFile))) {
                        fs.mkdirsSync(path.dirname(outputFile));
                    }
                    fs.writeFileSync(outputFile, JSON.stringify(spine));
                    console.log(outputFile);
                }

                const outputFile = base + (output ? ".atlas" : "_spine.atlas");

                if (!fs.existsSync(path.dirname(outputFile))) {
                    fs.mkdirsSync(path.dirname(outputFile));
                }
                fs.writeFileSync(outputFile, result.textureAtlas);
                console.log(outputFile);

                if (deleteRaw) {
                    fs.unlinkSync(file);

                    if (textureAtlasFiles) {
                        for (const textureAtlasFile of textureAtlasFiles) {
                            fs.removeSync(textureAtlasFile);
                        }
                    }
                }

                let index = 0;
                for (const textureAtlasImage of textureAtlasImages) {
                    if (fs.existsSync(textureAtlasImage)) {
                        const outputFile = path.join(
                            path.dirname(output ? textureAtlasImage.replace(input, output) : textureAtlasImage),
                            dragonBonesData.name + (output ? "" : "_spine") + (textureAtlasImages.length > 1 ? "_" + index : "") + ".png"
                        );

                        if (deleteRaw) {
                            fs.moveSync(textureAtlasImage, outputFile);
                        }
                        else {
                            fs.copySync(textureAtlasImage, outputFile);
                        }

                        console.log(outputFile);
                    }
                    index++;
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
    utils.copyFromObject(textureAtlas, JSON.parse(fs.readFileSync(textureAtlasFile, "utf-8")), dbft.copyConfig);

    return textureAtlas;
}

execute();