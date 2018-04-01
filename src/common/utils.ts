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