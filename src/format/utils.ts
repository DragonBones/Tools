import * as fs from "fs";
import * as path from "path";

export function getTextureAtlases(filePath: string, rawName: string | null = null, suffix: string = "texture", fileType: ".json" | ".png" = ".json"): string[] { // TODO
    const folder = path.dirname(filePath);
    let name = rawName !== null ? rawName : path.basename(filePath, path.extname(filePath));
    let index = 0;
    let textureAtlasName = "";
    let textureAtlas = "";
    let textureAtlases = new Array<string>();

    textureAtlasName = name ? name + (suffix ? "_" + suffix : suffix) : suffix;
    textureAtlas = path.join(folder, textureAtlasName + fileType);

    if (fs.existsSync(textureAtlas)) {
        textureAtlases.push(textureAtlas);

        return textureAtlases;
    }

    while (true) {
        textureAtlasName = (name ? name + (suffix ? "_" + suffix : suffix) : suffix) + "_" + (index++);
        textureAtlas = path.join(folder, textureAtlasName + fileType);

        if (fs.existsSync(textureAtlas)) {
            textureAtlases.push(textureAtlas);
        }
        else if (index > 1) {
            break;
        }
    }

    if (textureAtlases.length > 0 || rawName !== null) {
        return textureAtlases;
    }

    textureAtlases = getTextureAtlases(filePath, "", suffix);
    if (textureAtlases.length > 0) {
        return textureAtlases;
    }

    index = name.lastIndexOf("_");
    if (index >= 0) {
        name = name.substring(0, index);

        textureAtlases = getTextureAtlases(filePath, name, suffix);
        if (textureAtlases.length > 0) {
            return textureAtlases;
        }

        textureAtlases = getTextureAtlases(filePath, name, "");
        if (textureAtlases.length > 0) {
            return textureAtlases;
        }
    }

    if (suffix === "atlas") {
        return textureAtlases;
    }

    if (suffix !== "tex") {
        textureAtlases = getTextureAtlases(filePath, null, "tex");
    }
    else if (suffix !== "atlas" as any) {
        textureAtlases = getTextureAtlases(filePath, null, "atlas");
    }

    return textureAtlases;
}