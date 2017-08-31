#! /usr/bin/env node
import * as fs from "fs-extra";
import * as path from "path";
import * as commander from "commander";
import * as utils from "./common/utils";
import * as dbft from "./format/dragonBonesFormat";
import * as spft from "./format/spineFormat";
import fromSpine from "./action/fromSpine";
import format from "./action/formatFormat";

function execute(): void {
    const commands = commander
        .version("0.0.12")
        .option("-i, --input [path]", "Input path")
        .option("-o, --output [path]", "Output path")
        .option("-t, --type [type]", "Convert from type [spine, cocos]", /^(binary|cocos)$/i, "none")
        .option("-f, --filter [keyword]", "Filter")
        .option("-d, --delete-raw", "Delete raw files after convert complete.")
        .parse(process.argv);

    const input = commands["input"] as string || process.cwd();
    const output = commands["output"] as string || "";
    const type = commands["type"] as string || "";
    const filter = commands["filter"] as string || "";
    const deleteRaw = commands["delete-raw"] as boolean || false;
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
                    format(result.data);
                    utils.compress(result, dbft.compressConfig);
                    fs.writeFileSync(
                        outputFile,
                        JSON.stringify(result.data)
                    );
                    console.log(outputFile);

                    if (deleteRaw) {
                        fs.removeSync(file);
                        fs.removeSync(textureAtlasFile);
                    }

                    let index = 0;
                    for (const textureAtlas of result.textureAtlases) {
                        const pageName = `_tex${result.textureAtlases.length > 1 ? index++ : ""}`;
                        const outputFile = (output ? file.replace(input, output) : file).replace(".json", pageName + ".json");
                        console.log(outputFile);

                        if (output) {
                            const textureAtlasImage = path.join(path.dirname(file), textureAtlas.imagePath);
                            const outputFile = path.join(file.replace(input, output), textureAtlas.imagePath);
                            textureAtlas.imagePath = pageName + ".png";

                            if (deleteRaw) {
                                fs.moveSync(textureAtlasImage, outputFile);
                            }
                            else {
                                fs.copySync(textureAtlasImage, outputFile);
                            }

                            console.log(outputFile);
                        }

                        utils.compress(textureAtlas, dbft.compressConfig);
                        fs.writeFileSync(
                            outputFile,
                            JSON.stringify(textureAtlas)
                        );
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
}

// function modifyTextureAtlas(file: string, configFile: string, textureAtlas: dbft.TextureAtlas): void {
//     let image = gm(file);
//     // for (const texture of textureAtlas.SubTexture) {
//     //     if (texture.rotated) {
//     //         image = image.draw(`image Over ${texture.x},${texture.y} ${texture.width},${texture.height} ${file}`);
//     //     }
//     // }

//     const outputFile = configFile.replace(".json", ".png");
//     textureAtlas.imagePath = path.basename(outputFile);
//     image.write(outputFile, (...args: any[]) => {
//         console.log(args);
//     });
// }

execute();