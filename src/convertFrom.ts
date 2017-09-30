#! /usr/bin/env node
import * as fs from "fs-extra";
import * as path from "path";
import * as commander from "commander";
import * as utils from "./common/utils";
import * as dbft from "./format/dragonBonesFormat";
import * as spft from "./format/spineFormat";
import fromSpine from "./action/fromSpine";
import format from "./action/formatFormat";
import * as helper from "./helper/helperRemote";

function execute(): void {
    const commands = commander
        .version("0.0.14")
        .option("-i, --input [path]", "Input path")
        .option("-o, --output [path]", "Output path")
        .option("-t, --type [type]", "Convert from type [spine, cocos]", /^(spine|cocos)$/i, "none")
        .option("-f, --filter [keyword]", "Filter")
        .option("-d, --delete", "Delete raw files after convert complete.")
        .parse(process.argv);

    const input = path.resolve(commands["input"] as string || process.cwd());
    const output = path.resolve(commands["output"] as string || "");
    const type = commands["type"] as string || "";
    const filter = commands["filter"] as string || "";
    const deleteRaw = commands["delete"] as boolean || false;
    // let loadTextureAtlasToData = false;
    // let megreTextureAtlasToData = false;

    switch (type) {
        case "spine":
            {
                const files = utils.filterFileList(input, /\.(json)$/i);

                for (const file of files) {
                    if (filter && file.indexOf(filter) < 0) {
                        continue;
                    }

                    const fileString = fs.readFileSync(file, "utf-8");
                    if (!spft.isSpineString(fileString)) {
                        continue;
                    }

                    const fileName = path.basename(file).replace(".json", "");
                    const textureAtlasFile = path.join(path.dirname(file), fileName + ".atlas");
                    let textureAtlasString = "";
                    if (fs.existsSync(textureAtlasFile)) {
                        textureAtlasString = fs.readFileSync(textureAtlasFile, "utf-8");
                    }

                    const spine = new spft.Spine();
                    utils.copyFromObject(spine, JSON.parse(fileString), spft.copyConfig);
                    const result = fromSpine({ name: fileName, data: spine, textureAtlas: textureAtlasString });
                    const outputFile = (output ? file.replace(input, output) : file).replace(".json", "_ske.json");
                    format(result);

                    const textureAtlases = result.textureAtlas.concat(); // TODO
                    result.textureAtlas.length = 0;

                    utils.compress(result, dbft.compressConfig);
                    if (!fs.existsSync(path.dirname(outputFile))) {
                        fs.mkdirsSync(path.dirname(outputFile));
                    }
                    fs.writeFileSync(
                        outputFile,
                        JSON.stringify(result)
                    );
                    console.log(outputFile);

                    if (deleteRaw) {
                        fs.removeSync(file);
                        fs.removeSync(textureAtlasFile);
                    }

                    let index = 0;
                    for (const textureAtlas of textureAtlases) {
                        const pageName = `_tex${textureAtlases.length > 1 ? index++ : ""}`;
                        const outputFile = (output ? file.replace(input, output) : file).replace(".json", pageName + ".json");
                        const textureAtlasImage = path.join(path.dirname(file), textureAtlas.imagePath);

                        textureAtlas.imagePath = path.basename(outputFile).replace(".json", ".png");

                        const imageOutputFile = path.join(path.dirname(outputFile), textureAtlas.imagePath);
                        if (!fs.existsSync(path.dirname(imageOutputFile))) {
                            fs.mkdirsSync(path.dirname(imageOutputFile));
                        }

                        utils.compress(textureAtlas, dbft.compressConfig);
                        if (!fs.existsSync(path.dirname(outputFile))) {
                            fs.mkdirsSync(path.dirname(outputFile));
                        }

                        fs.writeFileSync(
                            outputFile,
                            JSON.stringify(textureAtlas)
                        );

                        let hasRotated = false;
                        for (const texture of textureAtlas.SubTexture) {
                            if (texture.rotated) {
                                hasRotated = true;
                            }
                        }

                        if (deleteRaw) {
                            fs.moveSync(textureAtlasImage, imageOutputFile);
                        }
                        else {
                            fs.copySync(textureAtlasImage, imageOutputFile);
                        }

                        if (hasRotated) {
                            const input = {
                                type: "modify_spine_textureatlas",
                                data: {
                                    file: imageOutputFile,
                                    config: textureAtlas,
                                    texture: fs.readFileSync(imageOutputFile, "base64")
                                }
                            };

                            helper.addInput(input);
                        }

                        console.log(outputFile);
                        console.log(imageOutputFile);
                    }
                }
                break;
            }

        case "cocos":
            // loadTextureAtlasToData = true;
            // megreTextureAtlasToData = true;
            break;

        default:
            console.log(`Unknown type: ${type}`);
            return;
    }

    console.log("Convert complete.");

    if (helper.hasInput()) {
        helper.start();
        console.log("Waitting for helper.");
    }
}

execute();