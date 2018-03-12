let defaultMaxCount: number = 3000;
let hashCode: number = 0;
const instances: Map<Function, any> = new Map();
const maxCountMap: Map<Function, number> = new Map();
const poolsMap: Map<Function, BaseObject[]> = new Map();

export function copyObjectFrom(from: any, to: any, config: any[] | null): void {
    let dataConfig: any = null;
    if (config !== null) {
        const index = config.indexOf(to.constructor);
        if (index >= 0 && index < config.length - 1) {
            dataConfig = config[index + 1];
        }
    }

    for (let k in to) {
        if (!(k in from)) {
            continue;
        }

        _copyObjectFrom(to, k, to[k], from[k], dataConfig ? dataConfig[k] : null, config);
    }
}

function _copyObjectFrom(parent: any, key: string | number, data: any, object: any, creater: any, config: any[] | null): any {
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
            console.warn(`${key}: ${objectType} is not a boolean.`);
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
            console.warn(`${key}: ${objectType} is not a number.`);
            if (object === "NaN" || object === null) {
                parent[key] = NaN;
            }
            else {
                parent[key] = Number(object);
            }
        }
        else if (dataType === "string") {
            console.warn(`${key}: ${objectType} is not a string.`);
            if (object || object === object) {
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
            console.warn(`${key}: ${dataType} is not an array.`);
            parent[key] = data = [];
        }

        if (data instanceof Array) {
            data.length = object.length;
            for (let i = 0, l = data.length; i < l; ++i) {
                _copyObjectFrom(data, i, data[i], object[i], creater, config);
            }
        }
    }
    else {
        if (data !== null && data !== undefined && dataType === "object") {
            if (creater instanceof Array) {
                for (let k in object) {
                    _copyObjectFrom(data, k, data[k], object[k], creater[0], config);
                }
            }
            else {
                copyObjectFrom(data, object, config);
            }
        }
        else if (creater) {
            if (creater instanceof Array) {
                if (creater[1] === Function) {
                    const clazz = creater[0](object);
                    parent[key] = data = new clazz();
                    copyObjectFrom(data, object, config);
                }
                else {
                    parent[key] = data = creater[1] === Array ? [] : {};
                    for (let k in object) {
                        _copyObjectFrom(data, k, data[k], object[k], creater[0], config);
                    }
                }
            }
            else if (creater) {
                parent[key] = data = new creater();
                copyObjectFrom(data, object, config);
            }
            else {
                console.warn(`${key}: shallow copy.`);
                parent[key] = object;
            }
        }
        else {
            console.warn(`${key}: shallow copy.`);
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
            if (item !== null) {
                compress(item, config);
            }
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
                        if ((value instanceof Array) ? !(data["_" + k]) : true) {
                            delete data[k];
                        }

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

export function getInstance<T extends BaseObject>(clazz: { new(): T }, arg: any = undefined): T {
    let instance = instances.get(clazz);
    if (!instance) {
        instance = create(clazz, arg);
        instances.set(clazz, instance);
    }

    return instance;
}

export function create<T extends BaseObject>(clazz: { new(...arg: any[]): T }, arg: any = undefined): T {
    const pool = poolsMap.get(clazz);
    if (pool && pool.length > 0) {
        const object = pool.pop() as T;

        return object;
    }

    const object = arg !== undefined ? new clazz(arg) : new clazz();
    (object as any)._onClear(); // protected.

    return object;
}

export function setMaxCount(clazz: { new(): BaseObject }, maxCount: number): void {
    if (maxCount < 0 || maxCount !== maxCount) {
        maxCount = 0;
    }

    if (clazz) {
        const pool = poolsMap.get(clazz);
        maxCountMap.set(clazz, maxCount);

        if (pool && pool.length > maxCount) {
            pool.length = maxCount;
        }
    }
    else {
        defaultMaxCount = maxCount;

        for (const pair of poolsMap) {
            const pool = poolsMap.get(pair[0]);
            if (!pool) {
                throw new Error();
            }

            if (pool.length > maxCount) {
                pool.length = maxCount;
            }

            if (maxCountMap.has(pair[0])) {
                maxCountMap.set(pair[0], maxCount);
            }
        }
    }
}

export function clear(clazz: { new(): BaseObject } | null): void {
    if (clazz) {
        const pool = poolsMap.get(clazz);
        if (pool && pool.length) {
            pool.length = 0;
        }
    }
    else {
        for (const pair of poolsMap) {
            pair[1].length = 0;
        }
    }
}

export abstract class BaseObject {
    public static toString(): string {
        throw new Error();
    }

    public readonly hashCode: number = hashCode++;

    protected abstract _onClear(): void;

    public release(): void {
        this._onClear();

        const clazz = this.constructor;
        const maxCount = maxCountMap.has(clazz) ? maxCountMap.get(clazz) as number : defaultMaxCount;

        if (!poolsMap.has(clazz)) {
            poolsMap.set(clazz, []);
        }

        const pool = poolsMap.get(clazz);

        if (!pool) {
            throw new Error();
        }

        if (pool.length < maxCount) {
            console.assert(pool.indexOf(this) < 0);
            pool.push(this);
        }
    }

    public dispose(): void {
        this._onClear();
    }
}