export const PI_D: number = Math.PI * 2.0;
export const PI_H: number = Math.PI / 2.0;
export const PI_Q: number = Math.PI / 4.0;
export const RAD_DEG: number = 180.0 / Math.PI;
export const DEG_RAD: number = Math.PI / 180.0;

export interface Position {
    x: number;
    y: number;
}

export function normalizeRadian(value: number): number {
    value = (value + Math.PI) % (PI_D);
    value += value > 0.0 ? -Math.PI : Math.PI;

    return value;
}

export function normalizeDegree(value: number): number {
    value = (value + 180.0) % (180.0 * 2.0);
    value += value > 0.0 ? -180.0 : 180.0;

    return value;
}

export function distance(pA: Position, pB: Position): number {
    const dX = pB.x - pA.x;
    const dY = pB.y - pA.y;

    return Math.sqrt(dX * dX + dY * dY);
}

export function multiply(pA: Position, pB: Position, pC: Position): number {
    return ((pA.x - pC.x) * (pB.y - pC.y) - (pB.x - pC.x) * (pA.y - pC.y));
}

export class Matrix {
    public constructor(
        public a: number = 1.0, public b: number = 0.0,
        public c: number = 0.0, public d: number = 1.0,
        public tx: number = 0.0, public ty: number = 0.0
    ) {
    }

    public copyFrom(value: Matrix): Matrix {
        this.a = value.a;
        this.b = value.b;
        this.c = value.c;
        this.d = value.d;
        this.tx = value.tx;
        this.ty = value.ty;

        return this;
    }

    public copyFromArray(value: number[], offset: number = 0): Matrix {
        this.a = value[offset];
        this.b = value[offset + 1];
        this.c = value[offset + 2];
        this.d = value[offset + 3];
        this.tx = value[offset + 4];
        this.ty = value[offset + 5];

        return this;
    }

    public identity(): Matrix {
        this.a = this.d = 1.0;
        this.b = this.c = 0.0;
        this.tx = this.ty = 0.0;

        return this;
    }

    public concat(value: Matrix): Matrix {
        let aA = this.a * value.a;
        let bA = 0.0;
        let cA = 0.0;
        let dA = this.d * value.d;
        let txA = this.tx * value.a + value.tx;
        let tyA = this.ty * value.d + value.ty;

        if (this.b !== 0.0 || this.c !== 0.0) {
            aA += this.b * value.c;
            bA += this.b * value.d;
            cA += this.c * value.a;
            dA += this.c * value.b;
        }

        if (value.b !== 0.0 || value.c !== 0.0) {
            bA += this.a * value.b;
            cA += this.d * value.c;
            txA += this.ty * value.c;
            tyA += this.tx * value.b;
        }

        this.a = aA;
        this.b = bA;
        this.c = cA;
        this.d = dA;
        this.tx = txA;
        this.ty = tyA;

        return this;
    }

    public invert(): Matrix {
        let aA = this.a;
        let bA = this.b;
        let cA = this.c;
        let dA = this.d;
        const txA = this.tx;
        const tyA = this.ty;

        if (bA === 0.0 && cA === 0.0) {
            this.b = this.c = 0.0;
            if (aA === 0.0 || dA === 0.0) {
                this.a = this.b = this.tx = this.ty = 0.0;
            }
            else {
                aA = this.a = 1.0 / aA;
                dA = this.d = 1.0 / dA;
                this.tx = -aA * txA;
                this.ty = -dA * tyA;
            }

            return this;
        }

        let determinant = aA * dA - bA * cA;
        if (determinant === 0.0) {
            this.a = this.d = 1.0;
            this.b = this.c = 0.0;
            this.tx = this.ty = 0.0;

            return this;
        }

        determinant = 1.0 / determinant;
        let k = this.a = dA * determinant;
        bA = this.b = -bA * determinant;
        cA = this.c = -cA * determinant;
        dA = this.d = aA * determinant;
        this.tx = -(k * txA + cA * tyA);
        this.ty = -(bA * txA + dA * tyA);

        return this;
    }

    public transformPoint(x: number, y: number, result: Position, delta: boolean = false): void {
        result.x = this.a * x + this.c * y;
        result.y = this.b * x + this.d * y;

        if (!delta) {
            result.x += this.tx;
            result.y += this.ty;
        }
    }
}

export class Transform {

    public constructor(
        public x: number = 0.0,
        public y: number = 0.0,
        public skX: number = 0.0,
        public skY: number = 0.0,
        public scX: number = 1.0,
        public scY: number = 1.0,
        public pX: number = 0.0, // Deprecated.
        public pY: number = 0.0 // Deprecated.
    ) {
    }

    public toString(): string {
        return `${this.x}_${this.y}_${this.skX}_${this.skY}_${this.scX}_${this.scY}`;
    }

    public toFixed(): void {
        this.x = Number(this.x.toFixed(2));
        this.y = Number(this.y.toFixed(2));
        this.skX = Number(this.skX.toFixed(2));
        this.skY = Number(this.skY.toFixed(2));
        this.scX = Number(this.scX.toFixed(4));
        this.scY = Number(this.scY.toFixed(4));
    }

    public copyFrom(value: Transform): Transform {
        this.x = value.x;
        this.y = value.y;
        this.skX = value.skX;
        this.skY = value.skY;
        this.scX = value.scX;
        this.scY = value.scY;

        return this;
    }

    public equal(value: Transform): boolean {
        return this.x === value.x && this.y === value.y &&
            this.skX === value.skY && this.skY === value.skY &&
            this.scX === value.scX && this.scY === value.scY;
    }

    public identity(): Transform {
        this.x = this.y = this.skX = this.skY = 0.0;
        this.scX = this.scY = 1.0;

        return this;
    }

    public fromMatrix(matrix: Matrix): Transform {

        this.x = matrix.tx;
        this.y = matrix.ty;
        const backupScaleX = this.scX, backupScaleY = this.scY;
        let skX = Math.atan(-matrix.c / matrix.d);
        let skY = Math.atan(matrix.b / matrix.a);
        this.scX = (skY > -PI_Q && skY < PI_Q) ? matrix.a / Math.cos(skY) : matrix.b / Math.sin(skY);
        this.scY = (skX > -PI_Q && skX < PI_Q) ? matrix.d / Math.cos(skX) : -matrix.c / Math.sin(skX);

        if (backupScaleX >= 0.0 && this.scX < 0.0) {
            this.scX = -this.scX;
            skY = normalizeRadian(skY - Math.PI);
        }

        if (backupScaleY >= 0.0 && this.scY < 0.0) {
            this.scY = -this.scY;
            skX = normalizeRadian(skX - Math.PI);
        }

        this.skX = skX * RAD_DEG;
        this.skY = skY * RAD_DEG;

        return this;
    }

    public toMatrix(matrix: Matrix): Transform {
        const skX = this.skX * DEG_RAD;
        const skY = this.skY * DEG_RAD;
        matrix.a = Math.cos(skY) * this.scX;
        matrix.b = Math.sin(skY) * this.scX;
        matrix.c = -Math.sin(skX) * this.scY;
        matrix.d = Math.cos(skX) * this.scY;
        matrix.tx = this.x;
        matrix.ty = this.y;

        return this;
    }
}

export class ColorTransform {
    public constructor(
        public aM: number = 100,
        public rM: number = 100, public gM: number = 100, public bM: number = 100,
        public aO: number = 0,
        public rO: number = 0, public gO: number = 0, public bO: number = 0
    ) {
    }

    public toString(): string {
        return `${this.aM}_${this.rM}_${this.gM}_${this.bM}_${this.aO}_${this.rO}_${this.gO}_${this.bO}`;
    }

    public toFixed(): void {
        this.aM = Math.round(this.aM);
        this.rM = Math.round(this.rM);
        this.gM = Math.round(this.gM);
        this.bM = Math.round(this.bM);
        this.aO = Math.round(this.aO);
        this.rO = Math.round(this.rO);
        this.gO = Math.round(this.gO);
        this.bO = Math.round(this.bO);
    }

    public copyFrom(value: ColorTransform): void {
        this.aM = value.aM;
        this.rM = value.rM;
        this.gM = value.gM;
        this.bM = value.bM;
        this.aO = value.aO;
        this.rO = value.rO;
        this.gO = value.gO;
        this.bO = value.bO;
    }

    public copyFromRGBA(value: number): void {
        this.rM = Math.round(((0xFF000000 & value) >>> 24) / 255 * 100);
        this.gM = Math.round(((0x00FF0000 & value) >>> 16) / 255 * 100);
        this.bM = Math.round(((0x0000FF00 & value) >>> 8) / 255 * 100);
        this.aM = Math.round((0x000000FF & value) / 255 * 100);
    }

    public identity(): void {
        this.aM = this.rM = this.gM = this.bM = 100;
        this.aO = this.rO = this.gO = this.bO = 0;
    }

    public equal(value: ColorTransform): boolean {
        return this.aM === value.aM && this.rM === value.rM && this.gM === value.gM && this.bM === value.bM &&
            this.aO === value.aO && this.rO === value.rO && this.gO === value.gO && this.bO === value.bO;
    }
}

export class Point implements Position {
    public constructor(
        public x: number = 0.0,
        public y: number = 0.0
    ) {
    }

    public toString(): string {
        return "[object Point x: " + this.x + " y: " + this.y + " ]";
    }

    public clear(): void {
        this.x = this.y = 0.0;
    }

    public copyFrom(value: Position): this {
        this.x = value.x;
        this.y = value.y;

        return this;
    }

    public setTo(x: number, y: number): this {
        this.x = x;
        this.y = y;

        return this;
    }

    public polar(length: number, radian: number): this {
        this.x = length * Math.cos(radian);
        this.y = length * Math.sin(radian);

        return this;
    }
}

export class Rectangle implements Position {
    public constructor(
        public x: number = 0.0,
        public y: number = 0.0,
        public width: number = 0.0,
        public height: number = 0.0
    ) {
    }

    public toString(): string {
        return "[object Rectangle x: " + this.x + " y: " + this.y + " width: " + this.width + " height: " + this.height + " ]";
    }

    public toFixed(): void {
        this.x = Number(this.x.toFixed(2));
        this.y = Number(this.y.toFixed(2));
        this.width = Number(this.width.toFixed(2));
        this.height = Number(this.height.toFixed(2));
    }

    public clear(): void {
        this.x = this.y = this.width = this.height = 0.0;
    }

    public copyFrom(value: this): this {
        this.x = value.x;
        this.y = value.y;
        this.width = value.width;
        this.height = value.height;

        return this;
    }

    public setTo(x: number, y: number, width: number, height: number): this {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        return this;
    }
}

export const helpMatrixA: Matrix = new Matrix();
export const helpMatrixB: Matrix = new Matrix();
export const helpTransformA: Transform = new Transform();
export const helpTransformB: Transform = new Transform();
export const helpPointA: Point = new Point();
export const helpPointB: Point = new Point();