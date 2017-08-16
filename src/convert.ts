#! /usr/bin/env node
import * as fs from "fs";
// import * as path from "path";
import * as commander from "commander";
import * as utils from "./common/utils";
import * as dbft from "./format/dragonBonesFormat";
import * as spft from "./format/spineFormat";
import * as dbUtils from "./format/utils";
import jsonToFormat from "./action/jsonToFormat";
import toV45 from "./action/toV45";
import toNew from "./action/toNew";
import toBinary from "./action/toBinary";
import toSpine from "./action/toSpine";

function execute(): void {
    const commands = commander
        .version("0.0.7")
        .option("-i, --input [value]", "Input path")
        .option("-o, --output [value]", "Output path")
        .option("-t, --type [value]", "Convert type")
        .option("-f, --filter [value]", "Filter")
        .option("-d, --deleteRaw", "Delete raw")
        .parse(process.argv);

    const input = commands["input"] as string || process.cwd();
    const output = commands["output"] as string || "";
    const type = commands["type"] as string || "";
    const filter = commands["filter"] as string || "";
    const deleteRaw = commands["deleteRaw"] as boolean || false;
    let loadTextureAtlas = false;

    switch (type) {
        case "binary":
            break;

        case "new":
            break;

        case "v45":
            break;

        case "spine":
            loadTextureAtlas = true;
            break;

        default:
            return;
    }

    const files = utils.filterFileList(input, /\.(json)$/i);
    for (const file of files) {
        if (filter && file.indexOf(filter) < 0) {
            continue;
        }

        const fileString = fs.readFileSync(file, "utf-8");
        const textureAtlasFiles = new Array<string>();
        const dragonBonesData = jsonToFormat(fileString, () => {
            return getTextureAtlases(file, textureAtlasFiles);
        });

        if (!dragonBonesData) {
            continue;
        }

        if (loadTextureAtlas && dragonBonesData.textureAtlas.length === 0) {
            dragonBonesData.textureAtlas = getTextureAtlases(file, textureAtlasFiles);
        }

        switch (type) {
            case "binary":
                {
                    toV45(dragonBonesData, true);
                    const result = toBinary(dragonBonesData);
                    const outputFile = (output ? file.replace(input, output) : file).replace(".json", ".dbbin");
                    fs.writeFileSync(outputFile, new Buffer(result));
                    console.log(outputFile);
                    break;
                }

            case "new":
                break;

            case "v45":
                {
                    toV45(dragonBonesData, false);
                    utils.compress(dragonBonesData, dbft.compressConfig);
                    const result = JSON.stringify(dragonBonesData);
                    const outputFile = output ? file.replace(input, output) : file;
                    fs.writeFileSync(outputFile, result);
                    console.log(outputFile);
                    break;
                }

            case "spine":
                {
                    toNew(dragonBonesData, true);
                    let base = file.replace("_ske.json", ".json");
                    base = (output ? base.replace(input, output) : base).replace(".json", "");
                    const result = toSpine(dragonBonesData, "3.6");
                    for (const spine of result.spines) {
                        utils.compress(spine, spft.compressConfig);
                        const outputFile = (result.spines.length > 1 ? base + "_" + spine.skeleton.name : base) + ".json";
                        fs.writeFileSync(outputFile, JSON.stringify(spine));
                        console.log(outputFile);
                    }

                    const outputFile = base + ".atlas";
                    fs.writeFileSync(outputFile, result.textureAtlas);
                    console.log(outputFile);
                }
                break;

            default:
                break;
        }

        if (deleteRaw) {
            fs.unlinkSync(file);
            for (const textureAtlasFile of textureAtlasFiles) {
                fs.unlinkSync(textureAtlasFile);
            }
        }
    }

    console.log("Complete.");
}

function getTextureAtlases(file: string, textureAtlasFiles: string[]): dbft.TextureAtlas[] {
    const textureAtlases = [];
    for (const textureAtlasFile of dbUtils.getTextureAtlases(file)) {
        const textureAtlas = new dbft.TextureAtlas();
        utils.copyFromObject(textureAtlas, JSON.parse(fs.readFileSync(textureAtlasFile, "utf-8")), dbft.copyConfig);
        textureAtlases.push(textureAtlas);
        textureAtlasFiles.push(textureAtlasFile);
    }

    return textureAtlases;
}

execute();