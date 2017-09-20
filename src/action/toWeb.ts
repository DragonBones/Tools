import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const DATA_TAG = "data";
// const REMOTE = "http://www.dragonbones.com/player/v2/";
// const PUBLISH_PATH = "../bin-release/web/publish";
// const INDEX_FILE = PUBLISH_PATH + "/index.html";
// const PUBLISH_FILE = PUBLISH_PATH + "/dragonbones_player.html";
// const PUBLISH_ALONE_FILE = PUBLISH_PATH + "/dragonbones_player_alone.html";

type Input = {
    config: any;
    data: Buffer;
    textureAtlases: (Buffer | null)[];
};

type ZipData = {
    data: string;
    textureAtlases: string[];
};

type WebData = {
    config: any;
    data: string;
};

export default function (data: Input): string {
    const zipData = {
        data: data.data.toString("base64"),
        textureAtlases: data.textureAtlases.map((v) => {
            return v ? v.toString("base64") : "";
        })
    } as ZipData;

    const webData: WebData = {
        config: data.config,
        data: zlib.gzipSync(new Buffer(JSON.stringify(zipData))).toString("base64")
    };

    let htmlString = fs.readFileSync(path.join(__dirname, "../resource/preview_b.html"), "utf-8");
    htmlString = replaceHTMLCommentTag(htmlString, DATA_TAG, `<b id="data">${JSON.stringify(webData)}</b>`, false);

    return htmlString;
}

function replaceHTMLCommentTag(htmlString: string, tag: string, string: string, keepTag: boolean): string {
    const startTag = "<!--" + tag + "_begin-->";
    const endTag = "<!--" + tag + "_end-->";
    const startIndex = htmlString.indexOf(startTag);
    const endIndex = htmlString.indexOf(endTag);

    if (startIndex >= 0 && endIndex >= 0) {
        let replaceString: string;
        if (keepTag) {
            replaceString = htmlString.substring(startIndex + startTag.length, endIndex);
        } else {
            replaceString = htmlString.substring(startIndex, endIndex + endTag.length);
        }

        return htmlString.replace(replaceString, string);
    }

    return htmlString;
}