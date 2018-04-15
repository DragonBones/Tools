export function formatJSONString(string: string): string {
    let firstCode = string.charCodeAt(0);
    if (firstCode < 0x20 || firstCode > 0x7f) {
        string = string.substring(1); // 去除第一个字符  
    }

    return string;
}

export function rgbaToHex(r: number, g: number, b: number, a: number): string {
    let result = "";
    let s = Math.round(r).toString(16);
    if (s.length < 2) (s = "0" + s);
    result += s;

    s = Math.round(g).toString(16);
    if (s.length < 2) (s = "0" + s);
    result += s;

    s = Math.round(b).toString(16);
    if (s.length < 2) (s = "0" + s);
    result += s;

    s = Math.round(a).toString(16);
    if (s.length < 2) (s = "0" + s);
    result += s;

    return result;
}

if (!String.prototype.padStart) {
    String.prototype.padStart = function (maxLength: number, fillString: string = ' ') {
        const source = this;
        if (source.length >= maxLength) return String(source);

        const fillLength = maxLength - source.length;
        let times = Math.ceil(fillLength / fillString.length);

        while (times >>= 1) {
            fillString += fillString;
            if (times === 1) {
                fillString += fillString;
            }
        }

        return fillString.slice(0, fillLength) + source;
    };
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