import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as http from "http";
import * as types from "./types";

export abstract class Server {
    public port: number;
    public host: string;
    public local: string;
    public readonly httpServer: http.Server = http.createServer(this._requestHandler.bind(this));

    protected _requestHandler(request: http.IncomingMessage, response: http.ServerResponse): boolean {
        response;
        if (!request.url) {
            return false;
        }

        return true;
    }

    public start(host: string, port: number, local: string): void {
        if (this.port) {
            return;
        }

        this.host = host;
        this.port = port;
        this.local = local;
        this.httpServer.listen(this.port, () => {
            // console.log("Listening on: " + this.host + ":" + this.port);
        });
        // this.server.addListener("error", () => {
        //     // process.exit(1501);
        // });
    }

    public stop(): void {
        process.exit(0);
    }
}

export enum Code {
    Success = 200,
    UnknownAction = 2000,
    DataError,
    JSONError,
    ActionError,
}

export interface Result { code: Code; message: string; data: any; }

export class Gate extends Server {
    public readonly actions: { [k: string]: (request: http.IncomingMessage, response: http.ServerResponse) => void } = {};

    protected _requestHandler(request: http.IncomingMessage, response: http.ServerResponse): boolean {
        if (!super._requestHandler(request, response)) {
            return false;
        }

        const pathName = (url.parse(request.url as string).pathname as string).replace(this.local, "");

        if (pathName in this.actions) {
            const action = this.actions[pathName as any];
            action(request, response);
        }
        else {
            const localPath = path.join(__dirname, "../", pathName);
            let extName = path.extname(pathName);
            extName = extName ? extName.slice(1) : "unknown";

            if (fs.existsSync(localPath) && !fs.statSync(localPath).isDirectory()) {
                const fileResult = fs.readFileSync(localPath, "binary");
                response.writeHead(200, { "Content-Type": types.MineContentTypes[extName] || "text/plain" });
                response.write(fileResult, "binary");
                response.end();
            }
            else {
                this.responseEnd(response, Code.UnknownAction, Code[Code.UnknownAction]);
            }
        }

        return true;
    }

    public responseEnd(response: http.ServerResponse, code: Code, message: string, data: any = null): void {
        const result: Result = { code: code, message: message, data: data };
        response.writeHead(200, { "Content-Type": "application/json" });
        response.write(JSON.stringify(result));
        response.end();
    }
}