#! /usr/bin/env node
import * as fs from "fs-extra";
import * as path from "path";
import * as commander from "commander";
import * as object from "./common/object";
import * as utils from "./common/utils";
import * as nodeUtils from "./common/nodeUtils";
import * as dbft from "./format/dragonBonesFormat";
import * as spft from "./format/spineFormat";
import * as l2ft from "./format/live2DFormat";
import fromSpine from "./action/fromSpine";
import fromLive2D from "./action/fromLive2D";
import format from "./action/formatFormat";
import * as helper from "./helper/helperRemote";

function execute(): void {
    const commands = commander
        .version("0.0.51")
        .option("-i, --input [path]", "Input path")
        .option("-o, --output [path]", "Output path")
        .option("-t, --type [type]", "Convert from type [spine, live2d]", /^(spine|live2d)$/i, "none")
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
        case "spine": {
            const files = nodeUtils.filterFileList(input, /\.(json)$/i);

            for (const file of files) {
                if (filter && file.indexOf(filter) < 0) {
                    continue;
                }

                const fileString = fs.readFileSync(file, "utf-8");
                if (!spft.isSpineString(fileString)) {
                    continue;
                }

                const fileName = path.basename(file, ".json");
                const textureAtlasFile = path.join(path.dirname(file), fileName + ".atlas");
                let textureAtlasString = "";
                if (fs.existsSync(textureAtlasFile)) {
                    textureAtlasString = fs.readFileSync(textureAtlasFile, "utf-8");
                }

                const spine = new spft.Spine();
                object.copyObjectFrom(JSON.parse(fileString), spine, spft.copyConfig);
                const result = fromSpine({ name: fileName, data: spine, textureAtlas: textureAtlasString });
                const outputFile = (output ? file.replace(input, output) : file).replace(".json", "_ske.json");
                format(result);

                const textureAtlases = result.textureAtlas.concat(); // TODO
                result.textureAtlas.length = 0;

                object.compress(result, dbft.compressConfig);
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

                    object.compress(textureAtlas, dbft.compressConfig);
                    if (!fs.existsSync(path.dirname(outputFile))) {
                        fs.mkdirsSync(path.dirname(outputFile));
                    }

                    fs.writeFileSync(
                        outputFile,
                        JSON.stringify(textureAtlas)
                    );

                    if (deleteRaw) {
                        fs.moveSync(textureAtlasImage, imageOutputFile);
                    }
                    else {
                        fs.copySync(textureAtlasImage, imageOutputFile);
                    }

                    let hasRotated = false;
                    for (const texture of textureAtlas.SubTexture) {
                        if (texture.rotated) {
                            hasRotated = true;
                        }
                    }

                    if (hasRotated) {
                        const helperInput = {
                            type: "modify_spine_textureatlas",
                            data: {
                                file: imageOutputFile,
                                config: textureAtlas,
                                texture: fs.readFileSync(imageOutputFile, "base64")
                            }
                        };

                        helper.addInput(helperInput);
                    }

                    console.log(outputFile);
                    console.log(imageOutputFile);
                }
            }

            break;
        }

        case "live2d": {
            const files = nodeUtils.filterFileList(input, /\.(model.json)$/i);

            for (const file of files) {
                if (filter && file.indexOf(filter) < 0) {
                    continue;
                }
                // Parse config.
                const fileDir = path.dirname(file);
                const fileName = path.basename(file, ".model.json");
                const fileString = fs.readFileSync(file, "utf-8");
                const modelConfig = JSON.parse(fileString) as l2ft.ModelConfig;
                modelConfig.name = modelConfig.name || fileName;
                // Parse model.
                const modelURL = path.join(fileDir, modelConfig.model);
                if (fs.existsSync(modelURL)) {
                    const fileBuffer = fs.readFileSync(modelURL);
                    const model = l2ft.parseModel(fileBuffer.buffer as ArrayBuffer);
                    if (!model) {
                        console.log("Model parse error.", modelURL);
                        continue;
                    }

                    modelConfig.modelImpl = model;
                }
                else {
                    console.log("File does not exist.", modelURL);
                    continue;
                }

                for (let i = 0, l = modelConfig.textures.length; i < l; ++i) { // Parse textures.
                    const textureURI = modelConfig.textures[i] as string;
                    const textureURL = path.join(fileDir, textureURI);

                    if (fs.existsSync(textureURL)) {
                        const texture = { file: textureURI, width: 0, height: 0 };
                        const textureAtlasBuffer = fs.readFileSync(textureURL);
                        modelConfig.textures[i] = texture;

                        if (textureAtlasBuffer.toString('ascii', 12, 16) === "CgBI") {
                            texture.width = textureAtlasBuffer.readUInt32BE(32);
                            texture.height = textureAtlasBuffer.readUInt32BE(36);
                        }
                        else {
                            texture.width = textureAtlasBuffer.readUInt32BE(16);
                            texture.height = textureAtlasBuffer.readUInt32BE(20);
                        }
                    }
                    else {
                        console.log("File does not exist.", textureURL);
                    }
                }

                if (modelConfig.motions) { // Parse animation.
                    for (const k in modelConfig.motions) {
                        const motionConfigs = modelConfig.motions[k];
                        for (const motionConfig of motionConfigs) {
                            const motionURL = path.join(fileDir, motionConfig.file);
                            if (fs.existsSync(motionURL)) {
                                motionConfig.motion = l2ft.parseMotion(fs.readFileSync(motionURL, "utf-8"));
                            }
                            else {
                                console.log("File does not exist.", motionURL);
                            }
                        }
                    }
                }

                if (modelConfig.expressions) {
                    for (const k in modelConfig.expressions) {
                        const expressionConfig = modelConfig.expressions[k];
                        const expressionURL = path.join(fileDir, expressionConfig.file);
                        if (fs.existsSync(expressionURL)) {
                            expressionConfig.expression = JSON.parse(utils.formatJSONString(fs.readFileSync(expressionURL, "utf-8")));
                        }
                        else {
                            console.log("File does not exist.", expressionURL);
                        }
                    }
                }

                const result = fromLive2D(modelConfig);
                if (result === null) {
                    continue;
                }

                const outputDir = output ? fileDir.replace(input, output) : fileDir;
                const outputFile = path.join(outputDir, fileName + "_ske.json");
                format(result);
                console.log(outputFile);

                for (const textureAtlas of result.textureAtlas) {
                    const textureAtlasImageFile = path.join(fileDir, textureAtlas.imagePath);
                    const textureAtlasImageOutputFile = path.join(
                        path.dirname((output ? file.replace(input, output) : file)),
                        textureAtlas.imagePath
                    );

                    console.log(textureAtlasImageOutputFile);
                    if (textureAtlasImageFile === textureAtlasImageOutputFile) {
                        continue;
                    }

                    if (!fs.existsSync(path.dirname(textureAtlasImageOutputFile))) {
                        fs.mkdirsSync(path.dirname(textureAtlasImageOutputFile));
                    }

                    if (deleteRaw) {
                        fs.moveSync(textureAtlasImageFile, textureAtlasImageOutputFile);
                    }
                    else {
                        fs.copySync(textureAtlasImageFile, textureAtlasImageOutputFile);
                    }
                }

                object.compress(result, dbft.compressConfig);

                if (!fs.existsSync(path.dirname(outputFile))) {
                    fs.mkdirsSync(path.dirname(outputFile));
                }

                fs.writeFileSync(
                    outputFile,
                    JSON.stringify(result)
                );

                if (deleteRaw && file !== outputFile) {
                    fs.removeSync(file);
                }
            }

            break;
        }

        case "cocos":
        // loadTextureAtlasToData = true;
        // megreTextureAtlasToData = true;
        // break;

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