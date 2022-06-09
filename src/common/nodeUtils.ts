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
        const arr = ipConfig[k]!;
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