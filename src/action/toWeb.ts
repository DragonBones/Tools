import * as fs from "fs";
import * as path from "path";
// import * as zlib from "zlib";

const DATA_TAG = "data";

type Input = {
    data: Buffer | any;
    textureAtlases: (Buffer | null)[];
    config?: {
        isLocal?: boolean;
        showFPS?: boolean;
        frameRate?: number;
        backgroundColor?: number;
        orientation?: string;
        scaleMode?: string;
    };
};

type ZipData = {
    data: string;
    textureAtlases: string[];
};

export default function (data: Input, isPlayer: boolean): string {
    const isLocal = data.config ? data.config.isLocal : false;
    const zipData = {
        data: data.data instanceof Buffer ? data.data.toString("base64") : data.data,
        textureAtlases: data.textureAtlases.map((v) => {
            return v ? v.toString("base64") : "";
        })
    } as ZipData;
    // const compressed = zlib.gzipSync(new Buffer(JSON.stringify(zipData))).toString("base64");
    // let htmlString = fs.readFileSync(path.join(__dirname, isPlayer ? "../resource/player.html" : "../resource/viewer.html"), "utf-8");
    // htmlString = replaceHTMLCommentTag(htmlString, DATA_TAG, `<b id="data">${compressed}</b>`, false);

    let htmlString = fs.readFileSync(path.join(__dirname, `../resource/${isPlayer ? "player" : "viewer"}/${isLocal ? "local" : "index"}.html`), "utf-8");
    htmlString = replaceHTMLCommentTag(htmlString, DATA_TAG, `<b id="data">${JSON.stringify(zipData)}</b>`, false);


    if (data.config) {
        if (data.config.showFPS) {
            htmlString = htmlString.replace(`data-show-fps="false"`, `data-show-fps="${data.config.showFPS}"`);
        }

        if (data.config.frameRate) {
            htmlString = htmlString.replace(`data-frame-rate="60"`, `data-frame-rate="${data.config.frameRate}"`);
        }

        if (data.config.backgroundColor || data.config.backgroundColor === 0) {
            htmlString = htmlString.replace(`background: #333333;`, `background: #${data.config.backgroundColor.toString(16)};`);
        }

        if (data.config.orientation) {
            htmlString = htmlString.replace(`data-orientation="auto"`, `data-orientation="${data.config.orientation}"`);
        }

        if (data.config.scaleMode) {
            htmlString = htmlString.replace(`data-scale-mode="showAll"`, `data-scale-mode="${data.config.scaleMode}"`);
        }
    }

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