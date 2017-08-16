import { Map } from "../common/types";
/**
 * Spine format.
 */
export type TransformType = "normal" | "onlyTranslation" | "noRotationOrReflection" | "noScale" | "noScaleOrReflection";
export type AttachmentType = "region" | "mesh" | "linkedmesh" | "boundingbox" | "path" | "point" | "clipping";
export type BlendMode = "normal" | "additive" | "multiply" | "screen";

export class Spine {
    readonly skeleton: Skeleton = new Skeleton();
    readonly bones: Bone[] = [];
    readonly slots: Slot[] = [];
    readonly ik: IKConstraint[] = [];
    readonly skins: Map<Map<Map<Attachment>>> = {};
    readonly animations: Map<Animation> = {};
    readonly events: Map<Event> = {};
}

export class Skeleton {
    width: number = 0.00;
    height: number = 0.00;
    fps: number = 30; // Nonessential.
    name: string = ""; // Keep armature name.
    version: string = "";
    spine: string = "";
    hash: string = ""; // Nonessential.
    images: string = "./images/"; // Nonessential.
}

export class Bone {
    inheritRotation: boolean = true;
    inheritScale: boolean = true;
    length: number = 0;
    color: number = 0x989898FF; // Nonessential.
    x: number = 0.00;
    y: number = 0.00;
    rotation: number = 0.00;
    shearX: number = 0.00;
    shearY: number = 0.00;
    scaleX: number = 1.00;
    scaleY: number = 1.00;
    name: string = "";
    parent: string = "";
    transform: TransformType = "normal";
}

export class Slot {
    name: string = "";
    bone: string = "";
    color: string = "FFFFFFFF";
    dark: string = "FFFFFF";
    blend: BlendMode = "normal";
    attachment: string = "";
}

export class IKConstraint {
    bendPositive: boolean = false;
    order: number = 0;
    mix: number = 1.00;
    name: string = "";
    target: string = "";
    readonly bones: string[] = [];
}

export abstract class Attachment {
    type: AttachmentType;
    color: string = "FFFFFFFF";
    name: string = "";
}

export class RegionAttachment extends Attachment {
    width: number = 0;
    height: number = 0;
    x: number = 0.00;
    y: number = 0.00;
    rotation: number = 0.00;
    scaleX: number = 1.00;
    scaleY: number = 1.00;
    path: string = "";

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = "region";
        }
    }
}

export class MeshAttachment extends Attachment {
    width: number = 0; // Nonessential.
    height: number = 0; // Nonessential.
    hull: number = 0;
    path: string = "";
    triangles: number[] = [];
    uvs: number[] = [];
    edges: number[] = []; // Nonessential.
    vertices: number[] = [];

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = "mesh";
        }
    }
}

export class LinkedMeshAttachment extends Attachment {
    type: AttachmentType = "linkedmesh";
    deform: boolean = true;
    width: number = 0; // Nonessential.
    height: number = 0; // Nonessential.
    skin: string = "";
    parent: string = "";

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = "linkedmesh";
        }
    }
}

export class BoundingBoxAttachment extends Attachment {
    type: AttachmentType = "boundingbox";
    vertexCount: number = 0;
    color: string = "60F000FF";
    vertices: number[] = [];

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = "boundingbox";
        }
    }
}

export class PathAttachment extends Attachment {
    type: AttachmentType = "path";
    color: string = "FF7F00FF";
    closed: boolean = false;
    constantSpeed: boolean = true;
    vertexCount: number = 0;
    lengths: number[] = [];
    vertices: number[] = [];

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = "path";
        }
    }
}

export class PointAttachment extends Attachment {
    type: AttachmentType = "point";
    x: number = 0.0;
    y: number = 0.0;
    color: string = "F1F100FF";
    rotation: number = 0.0;

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = "point";
        }
    }
}

export class ClippingAttachment extends Attachment {
    type: AttachmentType = "clipping";
    vertexCount: number = 0.0;
    end: string = "";
    color: string = "CE3A3AFF";
    vertices: number[] = [];

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = "clipping";
        }
    }
}

export class Event {
    int: number = 0;
    float: number = 0.0;
    string: string = "";
    name: string = ""; // Keep to alive.
}

export class Animation {
    readonly bones: Map<BoneTimelines> = {};
    readonly slots: Map<SlotTimelines> = {};
    readonly ik: Map<IKConstraintFrame[]> = {};
    readonly transform: Map<TransformConstraintFrame[]> = {};
    readonly deform: Map<Map<Map<DeformFrame[]>>> = {};
    readonly events: EventFrame[] = [];
    readonly draworder: DrawOrderFrame[] = [];
}

export class BoneTimelines {
    readonly rotate: RotateFrame[] = [];
    readonly translate: TranslateFrame[] = [];
    readonly scale: ScaleFrame[] = [];
    readonly shear: ShearFrame[] = [];
}

export class SlotTimelines {
    readonly attachment: AttachmentFrame[] = [];
    readonly color: ColorFrame[] = [];
}

export class Frame {
    time: number = -1.0;
}

export class TweenFrame extends Frame {
    curve: number[] | "linear" | "stepped" = "linear";
}

export class TranslateFrame extends TweenFrame {
    x: number = 0.0;
    y: number = 0.0;
}

export class RotateFrame extends TweenFrame {
    angle: number = 0.0;

    constructor(isDefault: boolean = false) {
        super();
        if (isDefault) {
            this.angle = NaN; // Spine import data bug.
        }
    }
}

export class ShearFrame extends TweenFrame {
    x: number = 0.0;
    y: number = 0.0;
}

export class ScaleFrame extends TweenFrame {
    x: number = 1.0;
    y: number = 1.0;
}

export class AttachmentFrame extends Frame {
    name: string = "";

    constructor(isDefault: boolean = false) {
        super();
        if (isDefault) {
            this.name = null as any; // Spine import data bug.
        }
    }
}

export class ColorFrame extends TweenFrame {
    color: string = "FFFFFFFF";
}

export class IKConstraintFrame extends TweenFrame {
    bendPositive: boolean = true;
    mix: number = 1.0;
}

export class TransformConstraintFrame extends TweenFrame {
    rotateMix: number = 1.0;
    translateMix: number = 1.0;
    scaleMix: number = 1.0;
    shearMix: number = 1.0;
}

export class DeformFrame extends TweenFrame {
    offset: number = 0;
    vertices: number[] = [];
}

export class EventFrame extends Frame {
    int: number = 0;
    float: number = 0.0;
    string: string = "";
    name: string = "";
}

export class DrawOrderFrame extends Frame {
    offsets: { slot: string, offset: number }[] = [];
}

export const compressConfig = [
    new Spine(),
    new Skeleton(),
    new Bone(),
    new Slot(),
    new IKConstraint(),

    new RegionAttachment(true),
    new MeshAttachment(true),
    new LinkedMeshAttachment(true),
    new BoundingBoxAttachment(true),
    new PathAttachment(true),
    new PointAttachment(true),
    new ClippingAttachment(true),

    new Event(),

    new Animation(),
    new BoneTimelines(),
    new SlotTimelines(),
    new TranslateFrame(),
    new RotateFrame(true),
    new ShearFrame(),
    new ScaleFrame(),
    new AttachmentFrame(true),
    new ColorFrame(),
    new IKConstraintFrame(),
    new TransformConstraintFrame(),
    new DeformFrame(),
    new EventFrame(),
    new DrawOrderFrame(),
];