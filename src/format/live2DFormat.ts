/**
 * Live2D format.
 */
export interface ModelConfig {
    type: string;
    name: string;
    model: string;
    //
    physics?: string | {
        type: string;
        physics_hair: {
            label: string;
            comment: string;
            setup: {
                length: number;
                regist: number;
                mass: number;
            };
            src: {
                id: string;
                ptype: "x" | "y" | "angle";
                scale: number;
                weight: number;
            }[];
            targets: {
                id: string;
                ptype: "x" | "y" | "angle";
                scale: number;
                weight: number;
            }[];
        }[];
    };
    pose?: string;
    readonly layout?: { center_x: number, y: number, width: number };
    //
    readonly textures: (string | { file: string, width: number, height: number })[];
    readonly hit_areas?: { name: string, id: string }[];
    readonly expressions?: {
        name: string;
        file: string;
        //
        expression?: {
            fade_in?: number;
            fade_out?: number;
            params?: {
                id: string;
                val: number;
                def?: number;
                calc?: "add" | "mult";
            }[];
        };
    }[];
    readonly motions?: {
        [key: string]: {
            file: string;
            fade_in?: number;
            fade_out?: number;
            sound?: string;
            //
            motion?: {
                frameRate: number;
                fade_in: number;
                fade_out: number;
                values: { [key: string]: number[] };
                alphas: { [key: string]: number[] };
            } | null;
        }[];
    };
    //
    modelImpl: Model;
}

export function parseModel(buffer: ArrayBuffer): Model | null {
    const reader = new BinaryReader(buffer);
    const num = reader.readByte();
    const num2 = reader.readByte();
    const num3 = reader.readByte();

    if (((num !== 0x6d) || (num2 !== 0x6f)) || (num3 !== 0x63)) {
        console.log("Invalid model data.");
        return null;
    }

    const version = reader.readByte();
    reader.version = version;
    if (version > 11) {
        console.log("Invalid model version:", version);
        return null;
    }

    const model = reader.readObject() as Model;

    return model;
}

export function parseMotion(rawData: string) {
    let index = rawData.indexOf("# Live2D Animator Motion Data");
    if (index < 0) {
        console.log("Invalid motion data.");
        return null;
    }

    rawData = rawData.replace(/\n/g, "");
    rawData = rawData.replace(/\r\r/, "\r");
    rawData = rawData.replace(/\r\r/, "\r");

    const motion = { frameRate: 30, fade_in: 0, fade_out: 0, values: {} as any, alphas: {} as any };
    const lines = rawData.split(`\r`);

    for (let i = 1, l = lines.length; i < l; ++i) {
        let line = lines[i];
        if (line.indexOf("#") >= 0) {

        }
        else if (line.indexOf("$") >= 0) {
            line.replace("$", "");
            const kv = line.split("=");
            if (kv.length < 2) {
                continue;
            }

            if (kv[0] === "fps") {
                motion.frameRate = Number(kv[1]);
            }
            else if (kv[0] === "fadein") {
                motion.fade_in = Number(kv[1]);
            }
            else if (kv[0] === "fadeout") {
                motion.fade_out = Number(kv[1]);
            }
            else {
            }
        }
        else {
            const kv = line.split("=");
            if (kv.length < 2) {
                continue;
            }

            let key = kv[0];
            if (key.indexOf(":") < 0) {
                motion.values[key] = kv[1].split(",").map(value => Number(value));
            }
            else if (key.indexOf("visible") >= 0) {
                key = key.split(":").pop() as string;
                motion.alphas[key] = kv[1].split(",").map(value => Number(value));
            }
            else {
            }
        }
    }

    return motion;
}

export interface ISerializable {
    read(reader: BinaryReader): void;
}

export class Matrix {
    public m00: number;
    public m01: number;
    public m02: number;
    public m10: number;
    public m11: number;
    public m12: number;

    public constructor(v1: number, v2: number, v3: number, v4: number, v5: number, v6: number) {
        this.m00 = 1.0;
        this.m11 = 1.0;
        this.m00 = v1;
        this.m10 = v2;
        this.m01 = v3;
        this.m11 = v4;
        this.m02 = v5;
        this.m12 = v6;
    }
}

export class Transform implements ISerializable {
    private static _helper: Transform = new Transform();

    public reflectX = false;
    public reflectY = false;
    public x: number;
    public y: number;
    public rotate: number;
    public scaleX: number;
    public scaleY: number;

    public read(reader: BinaryReader): void {
        this.x = reader.readFloat();
        this.y = reader.readFloat();
        this.scaleX = reader.readFloat();
        this.scaleY = reader.readFloat();
        this.rotate = reader.readFloat();

        if (reader.version >= 10) { // TODO
            this.reflectX = reader.readBool();
            this.reflectY = reader.readBool();
        }
    }

    public copyFrom(value: this): this {
        this.x = value.x;
        this.y = value.y;
        this.scaleX = value.scaleX;
        this.scaleY = value.scaleY;
        this.rotate = value.rotate;
        this.reflectX = value.reflectX;
        this.reflectY = value.reflectY;

        return this;
    }

    public add(value: this): this {
        this.x += value.x;
        this.y += value.y;
        this.scaleX += value.scaleX;
        this.scaleY += value.scaleY;
        this.rotate += value.rotate;

        return this;
    }

    public minus(value: this): this {
        this.x -= value.x;
        this.y -= value.y;
        this.scaleX -= value.scaleX;
        this.scaleY -= value.scaleY;
        this.rotate -= value.rotate;

        return this;
    }

    public interpolation(valueA: this, valueB: this, t: number): this {
        Transform._helper.copyFrom(valueB).minus(valueA);
        Transform._helper.x *= t;
        Transform._helper.y *= t;
        Transform._helper.scaleX *= t;
        Transform._helper.scaleY *= t;
        Transform._helper.rotate *= t;
        this.copyFrom(valueA).add(Transform._helper as any); // 

        return this;
    }
}

export class Point {
    public constructor(public x: number, public y: number) {
    }
}

export class Rectangle {
    public constructor(public x: number, public y: number, public width: number, public height: number) {
    }
}

export class Color {
    public constructor(public color: number, useAlpha: boolean) {
        if (!useAlpha) {
            this.color |= -16777216;
        }
    }
}

export class UVInfo {
    convertedTextureIndex: number = -1;
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    scaleX: number = 1.0;
    scaleY: number = 1.0;
    transposition: boolean;
}

export class Model implements ISerializable {
    public stageWidth: number;
    public stageHeight: number;
    public animations: AnimationInfo;
    public parts: Part[];
    //
    public frameCount: number = 120;
    public readonly displays: BaseDisplay[] = [];

    public read(reader: BinaryReader): void {
        this.animations = reader.readObject();
        this.parts = reader.readObject();
        this.stageWidth = reader.readInt();
        this.stageHeight = reader.readInt();

        for (const part of this.parts) {
            for (const bone of part.bones) {
                for (const timeline of bone.animation.timelines) {
                    const timelineInfo = this.getTimelineInfo(timeline.name);
                    if (!timelineInfo) {
                        continue;
                    }

                    let internal = 999999.0;
                    for (let i = 0, l = timeline.frames.length; i < l; ++i) {
                        if (i !== 0) {
                            internal = Math.min(Math.abs(timeline.frames[i] - timeline.frames[i - 1]), internal);
                        }
                    }

                    this.frameCount = Math.max(
                        Math.ceil((timelineInfo.maximum - timelineInfo.minimum) / internal) * 3,
                        this.frameCount
                    );
                }
            }

            let index = 0;
            for (const display of part.displays) {
                display.index = index++;
                this.displays.push(display);
            }
        }

        //sort by pose order
        this.displays.sort((a, b) => {
            if (a instanceof Display && b instanceof Display) {
                return a.zOrder * 1000 + a.index > b.zOrder * 1000 + b.index ? 1 : -1;
            }

            return -1;
        });
    }

    public getPart(name: string) {
        for (const part of this.parts) {
            if (part.name === name) {
                return part;
            }
        }

        return null;
    }

    public getBone(name: string) {
        for (const part of this.parts) {
            for (const bone of part.bones) {
                if (bone.name === name) {
                    return bone;
                }
            }
        }

        return null;
    }

    public getDisplay(name: string) {
        for (const part of this.parts) {
            for (const display of part.displays) {
                if (display.name === name) {
                    return display;
                }
            }
        }

        return null;
    }

    public getTimelineInfo(name: string): TimelineInfo | null {
        for (const timelineInfo of this.animations.timelines) {
            if (timelineInfo.name === name) {
                return timelineInfo;
            }
        }

        return null;
    }
}

export class Part implements ISerializable {
    public locked: boolean;
    public visible: boolean;
    public name: string;
    public bones: BaseBone[];
    public displays: BaseDisplay[];

    public read(reader: BinaryReader): void {
        this.locked = reader.readBit();
        this.visible = reader.readBit();
        this.name = reader.readObject();
        this.bones = reader.readObject();
        this.displays = reader.readObject();
    }
}

export abstract class BaseBone implements ISerializable {
    public static readonly BASE_INDEX_NOT_INIT: number = -2;
    public static readonly TYPE_BD_AFFINE: number = 1;
    public static readonly TYPE_BD_BOX_GRID: number = 2;

    public name: string;
    public parent: string;
    public animation: Animation;
    public alphaFrames: number[] | null = null;

    public read(reader: BinaryReader): void {
        this.name = reader.readObject();
        this.parent = reader.readObject();
    }

    protected _readOpacity(reader: BinaryReader): void {
        if (reader.version >= 10) {
            this.alphaFrames = reader.readArrayFloat();
        }
    }
}

export abstract class BaseDisplay implements ISerializable {
    public index: number;
    public name: string;
    public parent: string;
    public animation: Animation;

    public abstract read(reader: BinaryReader): void;
}

export class Bone extends BaseBone {
    public transformFrames: Transform[];

    public read(reader: BinaryReader): void {
        super.read(reader);

        this.animation = reader.readObject();
        this.transformFrames = reader.readObject();
        this._readOpacity(reader);
    }
}

export class Surface extends BaseBone {
    public segmentY: number;
    public segmentX: number;
    public deformFrames: number[][];

    public read(reader: BinaryReader): void {
        super.read(reader);

        this.segmentY = reader.readInt();
        this.segmentX = reader.readInt();
        this.animation = reader.readObject();
        this.deformFrames = reader.readObject();
        this._readOpacity(reader);
    }
}

export abstract class Display extends BaseDisplay {
    public static readonly BASE_INDEX_NOT_INIT = -2;
    public static readonly DEFAULT_ORDER = 500;
    public static readonly totalMaxOrder = 500;
    public static readonly totalMinOrder = 500;
    public static readonly TYPE_DD_TEXTURE = 2;
    public static readonly TYPE_DD_PATH = 3;
    public static readonly TYPE_DD_PATH_STROKE = 4;

    public zOrder: number;
    public alphaFrames: number[];
    public zOrderFrames: number[];
    public clipedNames: string[] | null = null;

    public read(reader: BinaryReader): void {
        this.name = reader.readObject();
        this.parent = reader.readObject();
        this.animation = reader.readObject();
        this.zOrder = reader.readInt();
        this.zOrderFrames = reader.readArrayInt();
        this.alphaFrames = reader.readArrayFloat();

        if (reader.version >= 11) {
            this.clipedNames = reader.readObject();
        }
    }
}

export class Mesh extends Display {
    public static readonly COLOR_COMPOSITION_NORMAL = 0;
    public static readonly COLOR_COMPOSITION_SCREEN = 1;
    public static readonly COLOR_COMPOSITION_MULTIPLY = 2;
    public static readonly MASK_COLOR_COMPOSITION = 30;

    public culling: boolean = false;
    public vertexCount: number;
    public triangleCount: number;
    public textureIndex: number;
    public colorCompositionType: number = 0;
    public colorGroupIndex: number = -1;
    public optionFlag: number;

    public indices: number[];
    public deformFrames: number[][] = [];
    public uvs: number[] = [];
    public optionData: any = {};

    // public readonly uvInfo = new UVInfo();// TODO

    public read(reader: BinaryReader): void {
        super.read(reader);

        this.textureIndex = reader.readInt();
        this.vertexCount = reader.readInt();
        this.triangleCount = reader.readInt();
        this.indices = reader.readObject().reverse();
        this.deformFrames = reader.readObject();
        this.uvs = reader.readObject();

        if (reader.version >= 8) {
            this.optionFlag = reader.readInt();
            if (this.optionFlag !== 0) {
                if ((this.optionFlag & 1) !== 0) {
                    this.colorGroupIndex = reader.readInt();
                    this.optionData["BK_OPTION_COLOR"] = this.colorGroupIndex;
                }

                if ((this.optionFlag & 30) !== 0) {
                    this.colorCompositionType = (this.optionFlag & 30) >> 1;
                }
                else {
                    this.colorCompositionType = 0;
                }

                if ((this.optionFlag & 0x20) !== 0) {
                    this.culling = false;
                }
            }
        }
        else {
            this.optionFlag = 0;
        }
    }
}

export class AvatarTextureInfo {
    public textureIndex: number = -1;
    public colorGroupIndex: number = -1;
    public scaleX: number = 1.0;
    public scaleY: number = 1.0;
}

export class AvatarPartsItem implements ISerializable {
    public index: number;
    public name: string;
    public linkTo: string;

    public bones: BaseBone[];
    public displays: BaseDisplay[];
    public readonly textureInfoList: AvatarTextureInfo[] = [];

    public read(reader: BinaryReader): void {
        this.name = reader.readObject();
        this.displays = reader.readObject();
        this.bones = reader.readObject();
    }
}

export class AnimationInfo implements ISerializable {
    public timelines: TimelineInfo[];

    public read(reader: BinaryReader): void {
        this.timelines = reader.readObject();
    }
}

export class TimelineInfo implements ISerializable {
    public default: number;
    public maximum: number;
    public minimum: number;
    public name: string;

    public read(reader: BinaryReader): void {
        this.minimum = reader.readFloat();
        this.maximum = reader.readFloat();
        this.default = reader.readFloat();
        this.name = reader.readObject();
    }
}

export class Animation implements ISerializable {
    public timelines: Timeline[];

    public read(reader: BinaryReader): void {
        this.timelines = reader.readObject();
    }
}

export class Timeline implements ISerializable {
    public name: string;
    public frameCount: number;
    public frames: number[];

    public read(reader: BinaryReader): void {
        this.name = reader.readObject();
        this.frameCount = reader.readInt();
        this.frames = reader.readObject();
    }
}
/**
 * Binary reader.
 */
export class BinaryReader {
    public version: number = 0;

    private _offset: number = 0;
    private _bitCount: number = 0;
    private _bitBuffer: number = 0;
    private readonly _dataView: DataView;
    private readonly _readedObjects: Array<any> = new Array<any>();

    public constructor(buffer: ArrayBuffer) {
        this._dataView = new DataView(buffer);
    }

    private _bytesToNumber(): number {
        const num = this.readByte();
        let num2 = 0;
        let num3 = 0;
        let num4 = 0;

        if ((num & 0x80) === 0) {
            return (num & 0xff);
        }

        if (((num2 = this.readByte()) & 0x80) === 0) {
            return (((num & 0x7f) << 7) | (num2 & 0x7f));
        }

        if (((num3 = this.readByte()) & 0x80) === 0) {
            return ((((num & 0x7f) << 14) | ((num2 & 0x7f) << 7)) | (num3 & 0xff));
        }

        if (((num4 = this.readByte()) & 0x80) !== 0) {
            throw new Error();
        }

        return (((((num & 0x7f) << 0x15) | ((num2 & 0x7f) << 14)) | ((num3 & 0x7f) << 7)) | (num4 & 0xff));
    }

    private _readObjectA(tag: number) {
        if (tag === 0) {
            return null;
        }

        if (tag === 50) {
            return this.readUTF8();
        }

        if (tag === 0x33) {
            return this.readUTF8();
        }

        if (tag === 0x86) {
            return this.readUTF8();
        }

        if (tag === 60) {
            return this.readUTF8();
        }

        if (tag >= 0x30) {
            const ev = this._readObjectB(tag);
            if (ev !== null) {
                ev.read(this);

                return ev;
            }

            return null;
        }

        switch (tag) {
            case 1:
                return this.readUTF8();

            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 0x12:
            case 0x13:
            case 20:
            case 0x18:
            case 0x1c:
                throw new Error();

            case 10:
                return new Color(this.readInt(), true);

            case 11:
                return new Rectangle(this.readDouble(), this.readDouble(), this.readDouble(), this.readDouble());

            case 12:
                return new Rectangle(this.readFloat(), this.readFloat(), this.readFloat(), this.readFloat());

            case 13:
                return new Point(this.readDouble(), this.readDouble());

            case 14:
                return new Point(this.readFloat(), this.readFloat());

            case 15: {
                const count = this.readNumber();
                const result = new Array<any>();
                for (let i = 0; i < count; i++) {
                    result[i] = this.readObject();
                }

                return result;
            }

            case 0x10:
            case 0x19:
                return this.readArrayInt();

            case 0x11:
                return new Matrix(this.readDouble(), this.readDouble(), this.readDouble(), this.readDouble(), this.readDouble(), this.readDouble());

            case 0x15:
                return new Rectangle(this.readInt(), this.readInt(), this.readInt(), this.readInt());

            case 0x16:
                return new Point(this.readInt(), this.readInt());

            case 0x17:
                throw new Error();

            case 0x1a:
                return this.readArrayDouble();

            case 0x1b:
                return this.readArrayFloat();

            default:
                throw new Error();
        }
    }

    private _readObjectB(tag: number) {
        if (tag < 40) {
            return null;
        }

        if (tag < 50) {
            return null;
        }

        if (tag < 60) {
            return null;
        }

        if (tag < 100) {
            switch (tag) {
                case 0x41:
                    return new Surface();

                case 0x42:
                    return new Animation();

                case 0x43:
                    return new Timeline();

                case 0x44:
                    return new Bone();

                case 0x45:
                    return new Transform();

                case 70:
                    return new Mesh();

                default:
                    return null;
            }
        }

        if (tag < 150) {
            switch (tag) {
                case 0x83:
                    return new TimelineInfo();

                case 0x85:
                    return new Part();

                case 0x88:
                    return new Model();

                case 0x89:
                    return new AnimationInfo();

                case 0x8e:
                    return new AvatarPartsItem();

                default:
                    return null;
            }
        }

        return null;
    }

    public readBit(): boolean {
        if (this._bitCount === 0) {
            this._bitBuffer = this.readByte();
        }
        else if (this._bitCount === 8) {
            this._bitBuffer = this.readByte();
            this._bitCount = 0;
        }

        const bitCount = this._bitCount++;
        // this._bitCount = bitCount + 1;

        return (((this._bitBuffer >> (7 - bitCount)) & 1) === 1);
    }

    public readBool(): boolean {
        const result = this.readByte();

        return result > 0;
    }

    public readByte(): number {
        this._bitCount = 0;
        const result = this._dataView.getUint8(this._offset);
        this._offset += Uint8Array.BYTES_PER_ELEMENT;

        return result;
    }

    public readUint16(): number {
        this._bitCount = 0;
        const result = this._dataView.getUint16(this._offset);
        this._offset += Uint16Array.BYTES_PER_ELEMENT;

        return result;
    }

    public readUint32(): number {
        this._bitCount = 0;
        const result = this._dataView.getUint32(this._offset);
        this._offset += Uint32Array.BYTES_PER_ELEMENT;

        return result;
    }

    public readInt8(): number {
        this._bitCount = 0;
        const result = this._dataView.getInt8(this._offset);
        this._offset += Int8Array.BYTES_PER_ELEMENT;

        return result;
    }

    public readInt16(): number {
        this._bitCount = 0;
        const result = this._dataView.getInt16(this._offset);
        this._offset += Int16Array.BYTES_PER_ELEMENT;

        return result;
    }

    public readInt(): number {
        this._bitCount = 0;
        const result = this._dataView.getInt32(this._offset);
        this._offset += Int32Array.BYTES_PER_ELEMENT;

        return result;
    }

    public readFloat(): number {
        this._bitCount = 0;
        const result = this._dataView.getFloat32(this._offset);
        this._offset += Float32Array.BYTES_PER_ELEMENT;

        return result;
    }

    public readDouble(): number {
        this._bitCount = 0;
        const result = this._dataView.getFloat64(this._offset);
        this._offset += Float64Array.BYTES_PER_ELEMENT;

        return result;
    }

    public readNumber(): number {
        return this._bytesToNumber();
    }

    public readUTF8(): string {
        this._bitCount = 0;
        const count = this.readNumber();
        const result = new Uint8Array(count);

        for (let i = 0; i < count; i++) {
            result[i] = this.readByte();
        }

        return this.decodeUTF8(result);
    }

    public readArrayInt(): number[] {
        this._bitCount = 0;
        const count = this.readNumber();
        const result = new Array<number>();

        for (let i = 0; i < count; i++) {
            result[i] = this.readInt();
        }

        return result;
    }

    public readArrayFloat(): number[] {
        this._bitCount = 0;
        const count = this.readNumber();
        const result = new Array<number>();

        for (let i = 0; i < count; i++) {
            result[i] = this.readFloat();
        }

        return result;
    }

    public readArrayDouble(): number[] {
        this._bitCount = 0;
        const count = this.readNumber();
        const result = new Array<number>();

        for (let i = 0; i < count; i++) {
            result[i] = this.readDouble();
        }

        return result;
    }

    public readObject() {
        this._bitCount = 0;
        const tag = this._bytesToNumber();

        if (tag === 0x21) {
            const index = this.readInt();
            if (index < 0 || index >= this._readedObjects.length) {
                throw new Error();
            }

            return this._readedObjects[index];
        }

        const object = this._readObjectA(tag);
        this._readedObjects.push(object);

        return object;
    }

    // TODO
    private decoderError(fatal: any, opt_code_point?: any): number {
        if (fatal) {
        }
        return opt_code_point || 0xFFFD;
    }

    /**
     * @private
     */
    private EOF_byte: number = -1;
    /**
     * @private
     */
    private EOF_code_point: number = -1;

    /**
     * @private
     * @param a
     * @param min
     * @param max
     */
    private inRange(a: number, min: number, max: number) {
        return min <= a && a <= max;
    }

    private decodeUTF8(data: Uint8Array): string {
        var fatal: boolean = false;
        var pos: number = 0;
        var result: string = "";
        var code_point: number;
        var utf8_code_point = 0;
        var utf8_bytes_needed = 0;
        var utf8_bytes_seen = 0;
        var utf8_lower_boundary = 0;

        while (data.length > pos) {

            var _byte = data[pos++];

            if (_byte === this.EOF_byte) {
                if (utf8_bytes_needed !== 0) {
                    code_point = this.decoderError(fatal);
                }
                else {
                    code_point = this.EOF_code_point;
                }
            }
            else {

                if (utf8_bytes_needed === 0) {
                    if (this.inRange(_byte, 0x00, 0x7F)) {
                        code_point = _byte;
                    }
                    else {
                        if (this.inRange(_byte, 0xC2, 0xDF)) {
                            utf8_bytes_needed = 1;
                            utf8_lower_boundary = 0x80;
                            utf8_code_point = _byte - 0xC0;
                        }
                        else if (this.inRange(_byte, 0xE0, 0xEF)) {
                            utf8_bytes_needed = 2;
                            utf8_lower_boundary = 0x800;
                            utf8_code_point = _byte - 0xE0;
                        }
                        else if (this.inRange(_byte, 0xF0, 0xF4)) {
                            utf8_bytes_needed = 3;
                            utf8_lower_boundary = 0x10000;
                            utf8_code_point = _byte - 0xF0;
                        }
                        else {
                            this.decoderError(fatal);
                        }
                        utf8_code_point = utf8_code_point * Math.pow(64, utf8_bytes_needed);
                        code_point = null as any;
                    }
                }
                else if (!this.inRange(_byte, 0x80, 0xBF)) {
                    utf8_code_point = 0;
                    utf8_bytes_needed = 0;
                    utf8_bytes_seen = 0;
                    utf8_lower_boundary = 0;
                    pos--;
                    code_point = this.decoderError(fatal, _byte);
                }
                else {

                    utf8_bytes_seen += 1;
                    utf8_code_point = utf8_code_point + (_byte - 0x80) * Math.pow(64, utf8_bytes_needed - utf8_bytes_seen);

                    if (utf8_bytes_seen !== utf8_bytes_needed) {
                        code_point = null as any;
                    }
                    else {

                        var cp = utf8_code_point;
                        var lower_boundary = utf8_lower_boundary;
                        utf8_code_point = 0;
                        utf8_bytes_needed = 0;
                        utf8_bytes_seen = 0;
                        utf8_lower_boundary = 0;
                        if (this.inRange(cp, lower_boundary, 0x10FFFF) && !this.inRange(cp, 0xD800, 0xDFFF)) {
                            code_point = cp;
                        }
                        else {
                            code_point = this.decoderError(fatal, _byte);
                        }
                    }

                }
            }
            //Decode string
            if (code_point !== null && code_point !== this.EOF_code_point) {
                if (code_point <= 0xFFFF) {
                    if (code_point > 0) result += String.fromCharCode(code_point);
                }
                else {
                    code_point -= 0x10000;
                    result += String.fromCharCode(0xD800 + ((code_point >> 10) & 0x3ff));
                    result += String.fromCharCode(0xDC00 + (code_point & 0x3ff));
                }
            }
        }
        return result;
    }
}