#! /usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as nodeUtils from "../common/nodeUtils";
import * as dbft from "../format/dragonBonesFormat";
import * as resft from "../format/resFormat";
import * as dbUtils from "../format/utils";

const RESOURCE_PATH = "resource";
const RESOURCE_NAME = "base_test.res.json";
const PRELOAD_NAME = "baseTest";
const SEARCH_GROUP_NAME = "search";

function modifyResourcesPath(file: string): string {
    const index = file.indexOf(RESOURCE_PATH);
    if (index > 0) {
        file = file.substr(index + RESOURCE_PATH.length + 1);
    }

    file = file.replace(/\\/g, "/");

    return file;
}

function execute(): void {
    const args = process.argv.slice(2);
    const root = process.cwd();
    const include = args[0];
    const resourcesJSON = new resft.ResourceJSON();
    const files = nodeUtils.filterFileList(root, /\.(json)$/i);

    for (let i = 0, l = files.length; i < l; ++i) {
        const file = files[i];
        if (include && file.indexOf(include) < 0) {
            continue;
        }

        const fileDir = path.dirname(file);
        const fileName = path.basename(file, ".json");
        const fileString = fs.readFileSync(file).toString();
        if (!dbft.isDragonBonesString(fileString)) {
            continue;
        }

        const dragonBonesJSON = JSON.parse(fs.readFileSync(file).toString());
        const dataName = dragonBonesJSON.name;

        resourcesJSON.addResource(
            dataName,
            resft.ResourceType.JSON,
            modifyResourcesPath(file),
            PRELOAD_NAME, SEARCH_GROUP_NAME
        );

        // Binary
        const binaryFile = path.join(fileDir, fileName + ".dbbin");
        if (fs.existsSync(binaryFile)) {
            console.log(binaryFile);

            resourcesJSON.addResource(
                dataName + "_binary",
                resft.ResourceType.BIN,
                modifyResourcesPath(binaryFile),
                PRELOAD_NAME
            );
        }

        // // Movie
        // const movieFile = dragonBonesFile.replace(".json", ".dbmv");
        // if (fs.existsSync(movieFile)) {
        //     console.log(movieFile);

        //     resourcesJSON.addResource(
        //         dataName + "_mov",
        //         resft.ResourceType.BIN,
        //         modifyResourcesPath(movieFile),
        //         PRELOAD_NAME
        //     );
        // }

        const textureAtlass = dragonBonesJSON.textureAtlas as any[];
        if (textureAtlass) {
            for (let i = 0, l = textureAtlass.length; i < l; ++i) {
                const textureAtlas = textureAtlass[i];
                const textureAtlasFile = path.join(fileDir, textureAtlas.imagePath);
                resourcesJSON.addResource(
                    dataName + "_texture_" + i,
                    resft.ResourceType.Image,
                    modifyResourcesPath(textureAtlasFile),
                    PRELOAD_NAME
                );

                console.log(textureAtlasFile);
            }
        }
        else {
            const textureAtlass = dbUtils.getTextureAtlases(file); // TextureAtlas config and TextureAtlas.
            if (textureAtlass.length > 0) {
                for (let i = 0, l = textureAtlass.length; i < l; ++i) {
                    const textureAtlasConfig = textureAtlass[i];
                    const textureAtlas = textureAtlasConfig.replace(".json", ".png");

                    resourcesJSON.addResource(
                        dataName + "_texture_config_" + i,
                        resft.ResourceType.JSON,
                        modifyResourcesPath(textureAtlasConfig),
                        PRELOAD_NAME
                    );

                    resourcesJSON.addResource(
                        dataName + "_texture_" + i,
                        resft.ResourceType.Image,
                        modifyResourcesPath(textureAtlas),
                        PRELOAD_NAME
                    );

                    console.log(textureAtlasConfig);
                    console.log(textureAtlas);
                }
            }
        }
    }

    if (resourcesJSON.resources.length > 0) {
        let file = root;
        if (file.indexOf(RESOURCE_PATH) >= 0) {
            file = path.join(file, RESOURCE_NAME);
        }
        else {
            file = path.join(file, RESOURCE_PATH, RESOURCE_NAME);
        }

        fs.writeFileSync(file, new Buffer(JSON.stringify(resourcesJSON)));
        console.log(file);
    }

    console.log("Complete.");
}

execute();