
/**
 * Live2D format.
 */
export class Live2dObjectTag {
    public static readonly MODEL: number = 0x88;//129
    public static readonly PARAM_DEF: number = 0x83;//129
    public static readonly PARAM_SET: number = 0x89;//129
    public static readonly PARTS_DATA: number = 0x85;//129
    public static readonly AVATAR_PARTS: number = 0x8e;//129
}

export interface ISerializable {
    read(reader: Live2DReader): void;
}
export class ParamDefFloat implements ISerializable {
    defaultValue: number;
    maxValue: number;
    minValue: number;
    paramID: string;

    public read(reader: Live2DReader): void {
        this.minValue = reader.readFloat();
        this.maxValue = reader.readFloat();
        this.defaultValue = reader.readFloat();
        this.paramID = reader.readObject();
    }
}

export class ParamDefSet implements ISerializable {
    readonly paramDefSet: ParamDefFloat[] = [];

    public read(reader: Live2DReader): void {
        const list = reader.readObject() as Array<any>;
        this.paramDefSet.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.paramDefSet[i] = list[i];
        }
    }
}

export class ParamPivots implements ISerializable {
    public static readonly PARAM_INDEX_NOT_INIT: number = -2;

    paramID: string;
    pivotCount: number;
    readonly pivotValue: number[] = [];

    public read(reader: Live2DReader): void {
        this.paramID = reader.readObject();
        this.pivotCount = reader.readInt();

        const list = reader.readObject() as number[];
        this.pivotValue.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.pivotValue[i] = list[i];
        }
    }
}

export class LDColor {
    color: number;

    public constructor(color: number, useAlpha: boolean) {
        if (!useAlpha) {
            color |= -16777216;
        }
        this.color = color;
    }
}

export class LDRect {
    x: number;
    y: number;
    width: number;
    height: number;

    public constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

export class LDPoint {
    x: number;
    y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export class LDMatrix {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
    mode: number;
    state: number;

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
    static helper: Transform = new Transform();

    originX = 0.0;
    originY = 0.0;
    reflectX = false;
    reflectY = false;
    rotateDeg = 0.0;
    scaleX = 1.0;
    scaleY = 1.0;

    public read(reader: Live2DReader): void {
        this.originX = reader.readFloat();
        this.originY = reader.readFloat();
        this.scaleX = reader.readFloat();
        this.scaleY = reader.readFloat();
        this.rotateDeg = reader.readFloat();

        if (reader.version >= 10) {
            this.reflectX = reader.readBool();
            this.reflectY = reader.readBool();
        }
    }

    public copyFrom(value: this): this {
        this.originX = value.originX;
        this.originY = value.originY;
        this.scaleX = value.scaleX;
        this.scaleY = value.scaleY;
        this.rotateDeg = value.rotateDeg;
        this.reflectX = value.reflectX;
        this.reflectY = value.reflectY;

        return this;
    }

    public add(value: this): this {
        this.originX += value.originX;
        this.originY += value.originY;
        this.scaleX += value.scaleX;
        this.scaleY += value.scaleY;
        this.rotateDeg += value.rotateDeg;

        return this;
    }

    public minus(value: this): this {
        this.originX -= value.originX;
        this.originY -= value.originY;
        this.scaleX -= value.scaleX;
        this.scaleY -= value.scaleY;
        this.rotateDeg -= value.rotateDeg;

        return this;
    }

    public interpolation(valueA: this, valueB: this, progress: number): this {
        Transform.helper.copyFrom(valueB).minus(valueA);
        Transform.helper.originX *= progress;
        Transform.helper.originY *= progress;
        Transform.helper.scaleX *= progress;
        Transform.helper.scaleY *= progress;
        Transform.helper.rotateDeg *= progress;
        this.copyFrom(valueA).add(Transform.helper as any); // 

        return this;
    }
}

export class UVInfo {
    convertedTextureNo: number = -1;
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    scaleX: number = 1.0;
    scaleY: number = 1.0;
    transposition: boolean;
}

export class PivotManager implements ISerializable {
    readonly paramPivotTable: ParamPivots[] = [];

    public read(reader: Live2DReader): void {
        const list = reader.readObject() as Array<any>;
        this.paramPivotTable.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.paramPivotTable[i] = list[i];
        }
    }
}

export abstract class IBaseData implements ISerializable {
    public static readonly BASE_INDEX_NOT_INIT: number = -2;
    public static readonly TYPE_BD_AFFINE: number = 1;
    public static readonly TYPE_BD_BOX_GRID: number = 2;

    baseDataID: string;
    targetBaseDataID: string;
    dirty: boolean;
    pivotManager: PivotManager;

    readonly pivotOpacity: number[] = [];

    public read(reader: Live2DReader): void {
        this.baseDataID = reader.readObject();
        this.targetBaseDataID = reader.readObject();


    }

    protected readOpacity(reader: Live2DReader): void {
        if (reader.version >= 10) {
            const list = reader.readArrayFloat();
            this.pivotOpacity.length = list.length;
            for (let i = 0, l = list.length; i < l; i++) {
                this.pivotOpacity[i] = list[i];
            }

        }
    }
}

export abstract class IDrawData implements ISerializable {
    drawDataID: string;
    targetBaseDataID: string;
    pivotManager: PivotManager;

    public read(reader: Live2DReader): void {
        // tslint:disable-next-line:no-unused-expression
        reader;
    }
}

export class AffineData extends IBaseData {
    readonly affines: Transform[] = [];

    public read(reader: Live2DReader): void {
        super.read(reader);

        this.pivotManager = reader.readObject();
        const list = reader.readObject() as Array<any>;
        this.affines.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.affines[i] = list[i];
        }

        super.readOpacity(reader);
    }
}

export class BoxGridData extends IBaseData {
    col: number;
    row: number;

    readonly pivotPoints: number[][] = [];

    public read(reader: Live2DReader): void {
        super.read(reader);

        this.row = reader.readInt();
        this.col = reader.readInt();
        this.pivotManager = reader.readObject();

        const list = reader.readObject() as Array<any>;
        this.pivotPoints.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.pivotPoints[i] = list[i];
        }

        super.readOpacity(reader);
    }
}

export abstract class DisplayData extends IDrawData {
    public static readonly BASE_INDEX_NOT_INIT = -2;
    public static readonly DEFAULT_ORDER = 500;
    public static readonly totalMaxOrder = 500;
    public static readonly totalMinOrder = 500;
    public static readonly TYPE_DD_TEXTURE = 2;
    public static readonly TYPE_DD_PATH = 3;
    public static readonly TYPE_DD_PATH_STROKE = 4;

    averageDrawOrder: number;
    readonly clipIDList: string[] = [];
    readonly pivotDrawOrder: number[] = [];
    readonly pivotOpacity: number[] = [];

    public read(reader: Live2DReader): void {
        this.drawDataID = reader.readObject();
        this.targetBaseDataID = reader.readObject();
        this.pivotManager = reader.readObject();
        this.averageDrawOrder = reader.readInt();

        let list = reader.readArrayInt();
        this.pivotDrawOrder.length = list.length;
        for (let i = 0, l = list.length; i < l; i++) {
            this.pivotDrawOrder[i] = list[i];
        }

        list = reader.readArrayFloat();
        this.pivotOpacity.length = list.length;
        for (let i = 0, l = list.length; i < l; i++) {
            this.pivotOpacity[i] = list[i];
        }

        if (reader.version >= 11) {
            const aid = reader.readObject();

            // this.clipIDList = aid;
        }
    }
}

export class MeshData extends DisplayData {
    public static readonly COLOR_COMPOSITION_NORMAL = 0;
    public static readonly COLOR_COMPOSITION_SCREEN = 1;
    public static readonly COLOR_COMPOSITION_MULTIPLY = 2;
    public static readonly MASK_COLOR_COMPOSITION = 30;

    colorCompositionType: number;
    colorGroupNo: number;
    culling: boolean;
    numPolygons: number;
    numPts: number;
    optionFlag: number;
    textureNo: number = -1;

    readonly indexArray: number[] = [];
    readonly pivotPoints: number[][] = [];
    readonly uvmap: number[] = [];
    readonly optionData: any = {};

    // readonly uvInfo: UVInfo = new UVInfo();

    public read(reader: Live2DReader): void {
        super.read(reader);

        this.textureNo = reader.readInt();
        this.numPts = reader.readInt();
        this.numPolygons = reader.readInt();

        const numArray = reader.readObject() as number[];
        this.indexArray.length = this.numPolygons * 3;
        for (let i = (this.numPolygons * 3) - 1; i >= 0; i--) {
            this.indexArray[i] = numArray[i];
        }

        const list = reader.readObject() as Array<any>;
        this.pivotPoints.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.pivotPoints[i] = list[i];
        }

        const list2 = reader.readObject() as number[];
        this.uvmap.length = list2.length;
        for (let i = 0, l = list2.length; i < l; i++) {
            this.uvmap[i] = list2[i];
        }

        if (reader.version >= 8) {
            this.optionFlag = reader.readInt();
            if (this.optionFlag !== 0) {
                if ((this.optionFlag & 1) !== 0) {
                    const num3 = reader.readInt();
                    this.colorGroupNo = num3;
                    this.optionData.Add("BK_OPTION_COLOR", num3);
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

export class PartsData implements ISerializable {
    locked: boolean;
    visible: boolean;
    partsID: string;
    readonly baseDataList: IBaseData[] = [];
    readonly drawDataList: IDrawData[] = [];

    public read(reader: Live2DReader): void {
        this.locked = reader.readBit();
        this.visible = reader.readBit();
        this.partsID = reader.readObject();

        let list = reader.readObject() as Array<any>;
        this.baseDataList.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.baseDataList[i] = list[i];
        }

        list = reader.readObject() as Array<any>;
        this.drawDataList.length = list.length;
        for (let i = 0, l = list.length; i < l; i++) {
            this.drawDataList[i] = list[i];
        }
    }
}

export class AvatarTextureInfo {
    colorGroupNo: number = -1;
    scaleW: number = 1.0;
    scaleH: number = 1.0;
    textureIndex: number = -1;
}

export class AvatarPartsItem implements ISerializable {
    appliedPartsID: string;
    partsID: string;
    partsNo: number;

    readonly baseDataList: IBaseData[] = [];
    readonly drawDataList: IDrawData[] = [];
    readonly textureInfoList: AvatarTextureInfo[] = [];

    public read(reader: Live2DReader): void {
        this.partsID = reader.readObject();
        let list = reader.readObject() as Array<any>;
        this.drawDataList.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.drawDataList[i] = list[i];
        }

        list = reader.readObject() as Array<any>;
        this.baseDataList.length = list.length;

        for (let i = 0, l = list.length; i < l; i++) {
            this.baseDataList[i] = list[i];
        }
    }
}

export class ModelImpl implements ISerializable {
    canvasWidth: number = 400;
    canvasHeight: number = 400;
    paramDefSet: ParamDefSet;
    readonly partsDataList: PartsData[] = [];

    //
    frameRate: number = 24;
    readonly tempDrawList: IDrawData[] = [];

    public read(reader: Live2DReader): void {
        this.paramDefSet = reader.readObject();
        const list = reader.readObject();
        this.partsDataList.length = list.length;
        for (let i = 0, l = list.length; i < l; i++) {
            this.partsDataList[i] = list[i];
        }

        this.canvasWidth = reader.readInt();
        this.canvasHeight = reader.readInt();

        this._init();
    }

    protected _init(): void {
        for (const partsData of this.partsDataList) {
            for (const baseData of partsData.baseDataList) {
                for (const paramPivots of baseData.pivotManager.paramPivotTable) {
                    const paramDef = this.getParamDef(paramPivots.paramID);
                    if (!paramDef) {
                        continue;
                    }

                    let internal = 999999.0;
                    for (let i = 0, l = paramPivots.pivotValue.length; i < l; ++i) {
                        if (i !== 0) {
                            internal = Math.min(Math.abs(paramPivots.pivotValue[i] - paramPivots.pivotValue[i - 1]), internal);
                        }
                    }

                    this.frameRate = Math.max(
                        Math.ceil((paramDef.maxValue - paramDef.minValue) / internal),
                        this.frameRate
                    );

                    if (this.frameRate % 2) {
                        this.frameRate++;
                    }
                }
            }

            for (const drawData of partsData.drawDataList) {
                this.tempDrawList.push(drawData);
            }
        }

        //sort by pose order
        this.tempDrawList.sort((a, b) => {
            if (a instanceof DisplayData && b instanceof DisplayData) {
                return a.pivotDrawOrder[0] > b.pivotDrawOrder[0] ? 1 : -1;
            }
            return -1;
        });
    }

    public isSurface(baseId: string): boolean {
        const baseData = this.getBaseData(baseId);

        return baseData !== null && baseData instanceof BoxGridData;
    }

    public getParamDef(paramId: string): ParamDefFloat | null {
        for (const param of this.paramDefSet.paramDefSet) {
            if (param.paramID === paramId) {
                return param;
            }
        }

        return null;
    }

    public getBaseData(baseId: string): IBaseData | null {
        for (const partsData of this.partsDataList) {
            for (const baseData of partsData.baseDataList) {
                if (baseData.baseDataID === baseId) {
                    return baseData;
                }
            }
        }

        return null;
    }

    public getDrawData(drawId: string): IDrawData | null {
        for (const drawData of this.tempDrawList) {
            if (drawData.drawDataID === drawId) {
                return drawData;
            }
        }

        return null;
    }
}

export class Live2DReader {
    protected offset: number = 0;
    protected dataView: DataView;
    protected bitCount: number;
    protected bitBuff: number;

    version: number;

    protected loadObjects: Array<any>;
    protected buffer: ArrayBuffer;
    public constructor(buffer: ArrayBuffer) {
        this.buffer = buffer;
        this.dataView = new DataView(buffer);
        this.offset = 0;
        this.loadObjects = new Array<any>();
        this.bitCount = 0;
    }

    private _bytesToNum(): number {
        let num2;
        let num3;
        let num4;
        let num = this.readByte();
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
            throw "未匹配";
        }
        return (((((num & 0x7f) << 0x15) | ((num2 & 0x7f) << 14)) | ((num3 & 0x7f) << 7)) | (num4 & 0xff));
    }

    public readBit(): boolean {
        if (this.bitCount === 0) {
            this.bitBuff = this.readByte();
        }
        else if (this.bitCount === 8) {
            this.bitBuff = this.readByte();
            this.bitCount = 0;
        }

        const bitCount = this.bitCount;
        this.bitCount = bitCount + 1;
        return (((this.bitBuff >> (7 - bitCount)) & 1) === 1);
    }

    public readBool(): boolean {

        const result = this.readByte();

        return result > 0;
    }

    public readByte(): number {
        this.bitCount = 0;
        const result = this.dataView.getUint8(this.offset);
        this.offset += Uint8Array.BYTES_PER_ELEMENT;
        return result;
    }

    public readUint16(): number {
        this.bitCount = 0;
        const result = this.dataView.getUint16(this.offset);
        this.offset += Uint16Array.BYTES_PER_ELEMENT;
        return result;
    }

    public readUint32(): number {
        this.bitCount = 0;
        const result = this.dataView.getUint32(this.offset);
        this.offset += Uint32Array.BYTES_PER_ELEMENT;
        return result;
    }

    public readInt8(): number {
        this.bitCount = 0;
        const result = this.dataView.getInt8(this.offset);
        this.offset += Int8Array.BYTES_PER_ELEMENT;
        return result;
    }

    public readInt16(): number {
        this.bitCount = 0;
        const result = this.dataView.getInt16(this.offset);
        this.offset += Int16Array.BYTES_PER_ELEMENT;
        return result;
    }

    public readInt(): number {
        this.bitCount = 0;
        const result = this.dataView.getInt32(this.offset);
        this.offset += Int32Array.BYTES_PER_ELEMENT;
        return result;
    }

    public readFloat(): number {
        this.bitCount = 0;
        const result = this.dataView.getFloat32(this.offset);
        this.offset += Float32Array.BYTES_PER_ELEMENT;
        return result;
    }

    public readDouble(): number {
        this.bitCount = 0;
        const result = this.dataView.getFloat64(this.offset);
        this.offset += Float64Array.BYTES_PER_ELEMENT;
        return result;
    }

    public readNum(): number {
        return this._bytesToNum();
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

    public readUTF8(): string {
        this.bitCount = 0;
        const count = this.readNum();

        const list: Uint8Array = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
            list[i] = this.readByte();
        }

        return this.decodeUTF8(list);
    }

    public readArrayInt(): number[] {
        this.bitCount = 0;
        const num = this.readNum();

        const numArray: number[] = [num];

        for (let i = 0; i < num; i++) {
            numArray[i] = this.readInt();
        }

        return numArray;
    }

    public readArrayFloat(): number[] {
        this.bitCount = 0;
        const num = this.readNum();

        const numArray: number[] = [num];

        for (let i = 0; i < num; i++) {
            numArray[i] = this.readFloat();
        }

        return numArray;
    }

    public readArrayDouble(): number[] {
        this.bitCount = 0;
        const num = this.readNum();

        const numArray: number[] = [num];

        for (let i = 0; i < num; i++) {
            numArray[i] = this.readDouble();
        }

        return numArray;
    }

    private _readObject2(tag: number): any {
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
                    return new BoxGridData();

                case 0x42:
                    return new PivotManager();

                case 0x43:
                    return new ParamPivots();

                case 0x44:
                    return new AffineData();

                case 0x45:
                    return new Transform();

                case 70:
                    return new MeshData();
            }
            return null;
        }

        if (tag < 150) {
            switch (tag) {
                case 0x83:
                    return new ParamDefFloat();

                case 0x85:
                    return new PartsData();

                case 0x88:
                    return new ModelImpl();

                case 0x89:
                    return new ParamDefSet();

                case 0x8e:
                    return new AvatarPartsItem();
            }
        }

        return null;
    }

    private _readObject(tag: number): any {
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
            const ev: ISerializable = this._readObject2(tag);
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
                throw "not impl : readObject() of 2-9 ,18,19,20,24,28";

            case 10:
                return new LDColor(this.readInt(), true);

            case 11:
                return new LDRect(this.readDouble(), this.readDouble(), this.readDouble(), this.readDouble());

            case 12:
                return new LDRect(this.readFloat(), this.readFloat(), this.readFloat(), this.readFloat());

            case 13:
                return new LDPoint(this.readDouble(), this.readDouble());

            case 14:
                return new LDPoint(this.readFloat(), this.readFloat());

            case 15:
                {
                    const capacity = this.readNum();
                    const list: Array<object> = new Array<object>(capacity);
                    for (let i = 0; i < capacity; i++) {
                        list[i] = this.readObject();
                    }
                    return list;
                }
            case 0x10:
            case 0x19:
                return this.readArrayInt();

            case 0x11:
                return new LDMatrix(this.readDouble(), this.readDouble(), this.readDouble(), this.readDouble(), this.readDouble(), this.readDouble());

            case 0x15:
                return new LDRect(this.readInt(), this.readInt(), this.readInt(), this.readInt());

            case 0x16:
                return new LDPoint(this.readInt(), this.readInt());

            case 0x17:
                throw ("未実装 _");

            case 0x1a:
                return this.readArrayDouble();

            case 0x1b:
                return this.readArrayFloat();
        }

        throw ("not impl : readObject() NO DEF");
    }

    public readObject(): any {
        this.bitCount = 0;
        const tag = this._bytesToNum();

        if (tag === 0x21) {
            const num = this.readInt();
            if ((0 > num) || (num >= this.loadObjects.length)) {
                throw "Invalid";
            }

            return this.loadObjects[num];
        }

        const item = this._readObject(tag);
        this.loadObjects.push(item);

        return item;

    }
}