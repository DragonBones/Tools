import * as url from "url";
import * as http from "http";

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

    public stopServer(): void {
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

export type Result = { code: Code, message: string, data: any };

export class Gate extends Server {
    public readonly actions: { [k: string]: (request: http.IncomingMessage, response: http.ServerResponse) => void } = {};

    protected _onClear(): void {
    }

    protected _requestHandler(request: http.IncomingMessage, response: http.ServerResponse): boolean {
        if (!super._requestHandler(request, response)) {
            return false;
        }

        const pathname = (url.parse(request.url as string).pathname as string).replace(this.local, "");
        const action = this.actions[pathname as any];
        if (action) {
            action(request, response);
        }
        else {
            this.responseEnd(response, Code.UnknownAction, Code[Code.UnknownAction]);
        }

        return true;
    }

    public responseEnd(response: http.ServerResponse, code: Code, message: string, data: any = null): void {
        response.writeHead(200, {
            "Content-Type": "application/json"
        });

        const result: Result = { code: code, message: message, data: data };
        response.write(JSON.stringify(result));
        response.end();
    }
}