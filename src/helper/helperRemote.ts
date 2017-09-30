import * as fs from "fs-extra";
import * as http from "http";
import * as utils from "../common/utils";
import { Code, Gate } from "../common/server";

type Input = {
    id?: number;
    type: string;
    data: any;
};

let inputCount: number = 0;
const inputs: Input[] = [];
const inputeds: Input[] = [];
const gate = new Gate();

gate.actions["/modify_spine_textureatlas"] = (request, response) => {
    let jsonString = "";

    request.addListener("data", (data: any) => {
        jsonString += data;
    });

    request.addListener("end", () => {
        request.removeAllListeners();

        let result: Input;
        try {
            result = JSON.parse(jsonString);
        }
        catch (error) {
            gate.responseEnd(response, Code.JSONError, Code[Code.JSONError]);
            return;
        }

        const input = getAndRemoveInputs(result.id as number);
        const textureData = new Buffer(result.data.texture, "base64");
        fs.writeFileSync(input.data.file, textureData);
        gate.responseEnd(response, Code.Success, Code[Code.Success], false);

        console.log("Modify texture atlas.", input.data.file);
        if (inputs.length === 0 && inputeds.length === 0) {
            stop();
        }
    });
};

gate.actions["/get_input"] = (request, response) => {
    let jsonString = "";

    request.addListener("data", (data: any) => {
        jsonString += data;
    });

    request.addListener("end", () => {
        request.removeAllListeners();

        // let result: Input;
        // try {
        //     result = JSON.parse(jsonString);
        // }
        // catch (error) {
        //     gate.responseEnd(response, Code.JSONError, Code[Code.JSONError]);
        //     return;
        // }

        if (inputs.length > 0) {
            const input = inputs.shift() as any;
            inputeds.push(input);
            gate.responseEnd(response, Code.Success, Code[Code.Success], input);
        }
        else {
            gate.responseEnd(response, Code.Success, Code[Code.Success], false);
        }
    });
};

export function start(): void {
    console.log("Helper start.");

    const portServer = http.createServer();
    portServer.listen(0, () => {
        const port = portServer.address().port;
        portServer.close();
        gate.start("dragonbones", port, "/dragonbones_helper");
        utils.open(`http://${utils.findIP()}:${port}/dragonbones_helper/resource/helper.html`);
    });
}

export function stop(): void {
    console.log("Helper stop.");
    gate.stop();
}

export function hasInput(): boolean {
    return inputs.length > 0 || inputeds.length > 0;
}

export function addInput(input: Input): void {
    input.id = inputCount++;
    inputs.push(input);
}

function getAndRemoveInputs(id: number): Input {
    for (let i = 0, l = inputeds.length; i < l; ++i) {
        const input = inputeds[i];
        if (input.id === id) {
            inputeds.splice(i, 1);
            return input;
        }
    }

    throw new Error("Never");
}