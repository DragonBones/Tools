import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";

export function filterFileList(folderPath: string, filter?: RegExp, maxDepth: number = 0, currentDepth: number = 0): string[] {
    let fileFilteredList = [] as string[];

    if (folderPath && fs.existsSync(folderPath)) {
        for (const file of fs.readdirSync(folderPath)) {
            const filePath = path.resolve(folderPath, file);
            const fileStatus = fs.lstatSync(filePath);
            if (fileStatus.isDirectory()) {
                if (maxDepth === 0 || currentDepth <= maxDepth) {
                    fileFilteredList = fileFilteredList.concat(filterFileList(filePath, filter, currentDepth + 1));
                }
            }
            else if (!filter || filter.test(filePath)) {
                fileFilteredList.push(filePath);
            }
        }
    }

    return fileFilteredList;
}

export function open(target: string, appName: string | null = null, callback: ((error: any) => void) | null = null) {
    let command = "";

    switch (process.platform) {
        case "darwin":
            if (appName) {
                command = `open -a "${escape(appName)}"`;
            }
            else {
                command = `open`;
            }
            break;

        case "win32":
            // if the first parameter to start is quoted, it uses that as the title
            // so we pass a blank title so we can quote the file we are opening
            if (appName) {
                command = `start "" "${escape(appName)}"`;
            }
            else {
                command = `start ""`;
            }
            break;

        default:
            if (appName) {
                command = escape(appName);
            }
            else {
                // use Portlands xdg-open everywhere else
                command = path.join(__dirname, "xdg-open");
            }
            break;
    }

    const sudoUser = process.env["SUDO_USER"];
    if (sudoUser) {
        command = `sudo -u ${sudoUser} ${command}`;
    }

    command = `${command} "${escape(target)}"`;

    return exec(command, callback || undefined);
}

export function findIP(): string {
    const ipConfig = os.networkInterfaces();
    let ip = "localhost";
    for (const k in ipConfig) {
        const arr = ipConfig[k];
        for (let i = 0; i < arr.length; ++i) {
            const ipData = arr[i];
            if (!ipData.internal && ipData.family === "IPv4") {
                ip = ipData.address;

                return ip;
            }
        }
    }

    return ip;
}

function escape(string: string): string {
    return string.replace(/"/g, '\\\"');
}

export function getEnumFormString(enumerator: any, type: string | number, defaultType: number = -1): number {
    if (typeof type === "number") {
        return type;
    }

    for (let k in enumerator) {
        if (typeof k === "string") {
            if (k.toLowerCase() === type.toLowerCase()) {
                return enumerator[k];
            }
        }
    }

    return defaultType;
}

export function copyFromObject(data: any, object: any, config: any[] | null): void {
    let dataConfig: any = null;
    if (config !== null) {
        const index = config.indexOf(data.constructor);
        if (index >= 0 && index < config.length - 1) {
            dataConfig = config[index + 1];
        }
    }

    for (let k in data) {
        if (!(k in object)) {
            continue;
        }

        _copyFromObject(data, k, data[k], object[k], dataConfig ? dataConfig[k] : null, config);
    }
}

function _copyFromObject(parent: any, key: string | number, data: any, object: any, creater: any, config: any[] | null): any {
    const dataType = typeof data;
    const objectType = typeof object;
    if (objectType as any === "function") { //
        return;
    }

    if (object === null || object === undefined || objectType !== "object") {
        if (dataType === objectType) {
            parent[key] = object;
        }
        else if (dataType === "boolean") {
            // console.warn(`${key}: ${objectType} is not a boolean.`);
            switch (object) {
                case "0":
                case "NaN":
                case "":
                case "false":
                case "null":
                case "undefined":
                    parent[key] = false;
                    break;

                default:
                    parent[key] = Boolean(object);
                    break;
            }
        }
        else if (dataType === "number") {
            // console.warn(`${key}: ${objectType} is not a number.`);
            if (object === "NaN" || object === null) {
                parent[key] = NaN;
            }
            else {
                parent[key] = Number(object);
            }
        }
        else if (dataType === "string") {
            // console.warn(`${key}: ${objectType} is not a string.`);
            if (object) {
                parent[key] = String(object);
            }
            else {
                parent[key] = "";
            }
        }
        else {
            parent[key] = object;
        }
    }
    else if (object instanceof Array) {
        if (!(data instanceof Array)) {
            // console.warn(`${key}: ${dataType} is not an array.`);
            parent[key] = data = [];
        }

        if (data instanceof Array) {
            data.length = object.length;
            for (let i = 0, l = data.length; i < l; ++i) {
                _copyFromObject(data, i, data[i], object[i], creater, config);
            }
        }
    }
    else {
        if (data !== null && data !== undefined && dataType === "object") {
            if (creater instanceof Array) {
                for (let k in object) {
                    _copyFromObject(data, k, data[k], object[k], creater[0], config);
                }
            }
            else {
                copyFromObject(data, object, config);
            }
        }
        else if (creater) {
            if (creater instanceof Array) {
                if (creater[1] === Function) {
                    const clazz = creater[0](object);
                    parent[key] = data = new clazz();
                    copyFromObject(data, object, config);
                }
                else {
                    parent[key] = data = creater[1] === Array ? [] : {};
                    for (let k in object) {
                        _copyFromObject(data, k, data[k], object[k], creater[0], config);
                    }
                }
            }
            else if (creater) {
                parent[key] = data = new creater();
                copyFromObject(data, object, config);
            }
            else {
                // console.warn(`${key}: shallow copy.`);
                parent[key] = object;
            }
        }
        else {
            // console.warn(`${key}: shallow copy.`);
            parent[key] = object;
        }
    }
}

export function compress(data: any, config: any[]): boolean {
    if ((typeof data) !== "object") {
        return false;
    }

    if (data instanceof Array) {
        const array = data as any[];
        for (const item of array) {
            compress(item, config);
        }

        if (array.length === 0) {
            return true;
        }
    }
    else {
        let defaultData: any = null;
        for (defaultData of config) {
            if (data.constructor === defaultData.constructor) {
                break;
            }

            defaultData = null;
        }

        if (defaultData !== null || typeof data === "object") {
            let count = 0;
            for (let k in data) {
                if (k.charAt(0) === "_") { // Pass private value.
                    delete data[k];
                    continue;
                }

                const value = data[k];
                const valueType = typeof value;

                if (defaultData !== null && (value === null || valueType === "undefined" || valueType === "boolean" || valueType === "number" || valueType === "string")) {
                    const defaultValue = defaultData[k];
                    if (value === defaultValue || (valueType === "number" && isNaN(value) && isNaN(defaultValue))) {
                        delete data[k];
                        continue;
                    }
                }
                else if (valueType === "object") {
                    if (compress(value, config)) {
                        delete data[k];
                        continue;
                    }
                }
                else {
                    continue;
                }

                count++;
            }

            return count === 0;
        }
    }

    return false;
}