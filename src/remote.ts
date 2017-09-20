import * as http from "http";
import * as utils from "./common/utils";
import { Code, Gate } from "./common/server";
import * as dbft from "./format/dragonBonesFormat";
import * as spft from "./format/spineFormat";
import fromSpine from "./action/fromSpine";
import toFormat from "./action/toFormat";
import toV45 from "./action/toV45";
import toNew from "./action/toNew";
import toBinary from "./action/toBinary";
import toWeb from "./action/toWeb";
import toSpine from "./action/toSpine";
import format from "./action/formatFormat";

type Input = {
    from: "spine" | "cocos";
    to: "binary" | "web" | "new" | "v45" | "spine";
    data: string; // DragonBones JSON string | spine JSON string { data: string, textureAtlas: string }
    textureAtlases?: string[]; // PNG Base64 string.
    config?: any; // { web: web config, spine: spine verison }
};

type FormatType = "string" | "base64" | "binary";

class Output {
    public format: FormatType;
    public name: string;
    public suffix: string;
    public data: any;

    public constructor(data: any, name: string = "", suffix: string = "", format: FormatType = "string") {
        this.data = data;
        this.format = format;
        this.name = name;
        this.suffix = suffix;
    }
}

const gate = new Gate();
gate.actions["/convert"] = (request, response) => {
    let jsonString = "";

    request.addListener("data", (data: any) => {
        jsonString += data;
    });

    request.addListener("end", () => {
        request.removeAllListeners();

        let input: Input;
        try {
            input = JSON.parse(jsonString);
        }
        catch (error) {
            gate.responseEnd(response, Code.JSONError, Code[Code.JSONError]);
            return;
        }

        try {
            if (input.from) {
                switch (input.from) {
                    case "cocos":
                        {
                            break;
                        }
                    case "spine":
                        {
                            let spineInput: { name: string, data: string, textureAtlas: string } | null = null;
                            try {
                                spineInput = JSON.parse(input.data);
                            }
                            catch (error) {
                            }

                            if (!spineInput) {
                                gate.responseEnd(response, Code.DataError, Code[Code.DataError]);
                                return;
                            }

                            const spine = new spft.Spine();
                            utils.copyFromObject(spine, JSON.parse(spineInput.data), spft.copyConfig);
                            const result = fromSpine({ name: spineInput.name, data: spine, textureAtlas: spineInput.textureAtlas });
                            format(result);
                            utils.compress(result, dbft.compressConfig);
                            gate.responseEnd(response, Code.Success, Code[Code.Success], result);

                            // TODO
                            break;
                        }
                }
            }
            else if (input.to) {
                let dragonBonesData: dbft.DragonBones | null = null;
                try {
                    dragonBonesData = toFormat(
                        input.data,
                        () => {
                            return [];
                        }
                    );
                }
                catch (error) {
                }

                if (!dragonBonesData) {
                    gate.responseEnd(response, Code.DataError, Code[Code.DataError]);
                    return;
                }

                const toOutput: Output[] = [];

                switch (input.to) {
                    case "binary":
                        {
                            toNew(dragonBonesData, true);
                            format(dragonBonesData);
                            const result = new Buffer(toBinary(dragonBonesData)).toString("base64");

                            toOutput.push(
                                new Output(
                                    result,
                                    dragonBonesData.name,
                                    "_ske.dbbin",
                                    "base64"
                                )
                            );
                            break;
                        }

                    case "new":
                        {
                            toNew(dragonBonesData, false);
                            format(dragonBonesData);
                            utils.compress(dragonBonesData, dbft.compressConfig);
                            const result = JSON.stringify(dragonBonesData);

                            toOutput.push(
                                new Output(
                                    result,
                                    dragonBonesData.name,
                                    "_ske.json",
                                    "string"
                                )
                            );
                            break;
                        }

                    case "v45":
                        {
                            toV45(dragonBonesData, false);
                            format(dragonBonesData);
                            utils.compress(dragonBonesData, dbft.compressConfig);
                            const result = JSON.stringify(dragonBonesData);

                            toOutput.push(
                                new Output(
                                    result,
                                    dragonBonesData.name,
                                    "_ske.json",
                                    "string"
                                )
                            );
                            break;
                        }

                    case "web":
                        {
                            toV45(dragonBonesData, true);
                            const result = toWeb({
                                config: input.config,
                                data: new Buffer(toBinary(dragonBonesData)),
                                textureAtlases: input.textureAtlases ? input.textureAtlases.map((v) => {
                                    return new Buffer(v, "base64");
                                }) : []
                            });

                            toOutput.push(
                                new Output(
                                    result,
                                    dragonBonesData.name,
                                    ".html",
                                    "string"
                                )
                            );
                            break;
                        }

                    case "spine":
                        {
                            toNew(dragonBonesData, true);
                            format(dragonBonesData);
                            const result = toSpine(dragonBonesData, input.config);
                            for (const spine of result.spines) {
                                utils.compress(spine, spft.compressConfig);
                                toOutput.push(
                                    new Output(
                                        JSON.stringify(spine),
                                        result.spines.length > 0 ? `${dragonBonesData.name}_${spine.skeleton.name}` : dragonBonesData.name,
                                        ".json",
                                        "string"
                                    )
                                );
                            }

                            toOutput.push(
                                new Output(
                                    JSON.stringify(result.textureAtlas),
                                    dragonBonesData.name,
                                    ".atlas",
                                    "string"
                                )
                            );
                        }
                        break;

                    default:
                        gate.responseEnd(response, Code.DataError, Code[Code.DataError]);
                        return;
                }

                gate.responseEnd(response, Code.Success, Code[Code.Success], toOutput);
            }
        }
        catch (error) {
            gate.responseEnd(response, Code.ActionError, Code[Code.ActionError]);
            return;
        }
    });
};

const portServer = http.createServer();
portServer.listen(0, () => {
    const port = portServer.address().port;
    portServer.close();
    gate.start("dragonbones", port, "/dragonbones");
    console.log(`http://${utils.findIP()}:${port}/dragonbones`);
});