import * as http from "http";
import * as object from "./common/object";
import * as nodeUtils from "./common/nodeUtils";
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
    to: "binary" | "new" | "v45" | "player" | "viewer" | "spine";
    data: string; // DragonBones JSON string | spine JSON string { data: string, textureAtlas: string }
    compress?: boolean;
    forPro?: boolean;
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
            gate.responseEnd(response, Code.JSONError, Code[Code.JSONError], jsonString);
            return;
        }

        try {
            if (input.from) {
                switch (input.from) {
                    case "spine": {
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
                        object.copyObjectFrom(JSON.parse(spineInput.data), spine, spft.copyConfig);
                        const result = fromSpine({ name: spineInput.name, data: spine, textureAtlas: spineInput.textureAtlas }, true);
                        format(result);
                        object.compress(result, dbft.compressConfig);
                        gate.responseEnd(response, Code.Success, Code[Code.Success], result);

                        // TODO
                        break;
                    }

                    case "cocos": {
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
                    gate.responseEnd(response, Code.DataError, Code[Code.DataError], input.data);
                    return;
                }

                const toOutput: Output[] = [];

                switch (input.to) {
                    case "binary": {
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

                    case "new": {
                        toNew(dragonBonesData, false);
                        format(dragonBonesData);

                        if (input.compress !== false) {
                            object.compress(dragonBonesData, dbft.compressConfig);
                        }

                        const result = JSON.stringify(dragonBonesData);
                        toOutput.push(
                            new Output(
                                result,
                                dragonBonesData.name,
                                "_ske.json",
                                "string"
                            )
                        );
                        // TODO
                        for (const armature of dragonBonesData.armature) {
                            if (armature.ik) {
                                for (const ik of armature.ik) {
                                    if (ik.bendPositive === false) {
                                        ik.bendPositive = "false" as any;
                                    }
                                }
                            }
                        }
                        break;
                    }

                    case "v45": {
                        toV45(dragonBonesData);
                        format(dragonBonesData);

                        if (input.compress !== false) {
                            object.compress(dragonBonesData, dbft.compressConfig);
                        }

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

                    case "player":
                    case "viewer": {
                        toNew(dragonBonesData, true);
                        format(dragonBonesData);
                        
                        const result = toWeb(
                            {
                                data: new Buffer(toBinary(dragonBonesData)),
                                textureAtlases: input.textureAtlases ? input.textureAtlases.map((v) => {
                                    return new Buffer(v, "base64");
                                }) : [],
                                config: input.config
                            },
                            input.to === "player"
                        );
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

                    case "spine": {
                        toNew(dragonBonesData, true);
                        format(dragonBonesData);
                        const result = toSpine(dragonBonesData, input.config, false);

                        for (const spine of result.spines) {
                            if (input.compress !== false) {
                                object.compress(spine, spft.compressConfig);
                            }

                            toOutput.push(
                                new Output(
                                    JSON.stringify(spine),
                                    result.spines.length > 1 ? `${dragonBonesData.name}_${spine.skeleton.name}` : dragonBonesData.name,
                                    ".json",
                                    "string"
                                )
                            );
                        }

                        if (result.textureAtlas) {
                            toOutput.push(
                                new Output(
                                    result.textureAtlas,
                                    dragonBonesData.name,
                                    ".atlas",
                                    "string"
                                )
                            );
                        }
                        break;
                    }

                    default:
                        gate.responseEnd(response, Code.DataError, Code[Code.DataError], input.to);
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

function execute(): void {
    if (process.argv.length > 1) {
        const port = Number(process.argv[2]);
        if (port === port && port >= 0 && port <= 65535) {
            const url = `http://${nodeUtils.findIP()}:${port}/dragonbones`;

            gate.actions["/working_directory"] = (request, response) => {
                // let jsonString = "";

                request.addListener("data", () => {
                    // jsonString += data;
                });

                request.addListener("end", () => {
                    request.removeAllListeners();
                    gate.responseEnd(response, Code.Success, Code[Code.Success], { url: url, workingDirectory: __dirname });
                });
            };

            gate.start("dragonbones", port, "/dragonbones");
            console.log(url);
            return;
        }
    }

    const portServer = http.createServer();
    portServer.listen(0, () => {
        const port = portServer.address().port;
        portServer.close();
        gate.start("dragonbones", port, "/dragonbones");
        console.log(`http://${nodeUtils.findIP()}:${port}/dragonbones`);
    });
}

execute();
