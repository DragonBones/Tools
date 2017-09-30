import { Map } from "../common/types";
/**
 * Spine format.
 */
export type TransformType = "normal" | "onlyTranslation" | "noRotationOrReflection" | "noScale" | "noScaleOrReflection";
export type AttachmentType = "region" | "mesh" | "linkedmesh" | "boundingbox" | "path" | "point" | "clipping" | "skinnedmesh";
export type BlendMode = "normal" | "additive" | "multiply" | "screen";

export function isSpineString(string: string): boolean {
    const testString = string.substr(0, Math.min(200, string.length));
    return testString.indexOf('"spine"') > 0;
}

export class Spine {
    readonly skeleton: Skeleton = new Skeleton();
    readonly bones: Bone[] = [];
    readonly slots: Slot[] = [];
    readonly ik: IKConstraint[] = [];
    readonly transform: TransformConstraint[] = [];
    readonly path: PathConstraint[] = [];
    readonly skins: Map<Map<Map<Attachment>>> = {};
    readonly animations: Map<Animation> = {};
    readonly events: Map<Event> = {};
}

export class Skeleton {
    width: number = 0.00;
    height: number = 0.00;
    fps: number = 30; // Nonessential.
    spine: string = "";
    hash: string = ""; // Nonessential.
    images: string = "./images/"; // Nonessential.
    name: string = ""; // Keep DragonBones armature name.
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
    bendPositive: boolean = true;
    order: number = 0;
    mix: number = 1.00;
    name: string = "";
    target: string = "";
    readonly bones: string[] = [];
}

export class TransformConstraint {
    local: boolean = false;
    relative: boolean = false;
    order: number = 0;
    x: number = 0.00;
    y: number = 0.00;
    rotation: number = 0.00;
    shearX: number = 0.00;
    shearY: number = 0.00;
    scaleX: number = 0.00;
    scaleY: number = 0.00;
    translateMix: number = 1.00;
    rotateMix: number = 1.00;
    scaleMix: number = 1.00;
    shearMix: number = 1.00;
    name: string = "";
    bone: string = "";
    target: string = "";
}

export class PathConstraint {
    positionMode: "fixed" | "percent" = "percent";
    spacingMode: "length" | "fixed" | "percent" = "length";
    rotateMode: "tangent" | "chain" | "chain scale" = "tangent";
    order: number = 0;
    rotation: number = 0.00;
    position: number = 0.00;
    spacing: number = 0.00;
    translateMix: number = 1.00;
    rotateMix: number = 1.00;
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
            // this.type = "region";
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
    path: string = "";
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
    readonly ffd: Map<Map<Map<DeformFrame[]>>> = {}; // Deprecated.
    readonly events: EventFrame[] = [];
    readonly draworder: DrawOrderFrame[] = [];
}

export class BoneTimelines {
    readonly translate: TranslateFrame[] = [];
    readonly rotate: RotateFrame[] = [];
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

    constructor(isDefault: boolean = false) {
        super();
        if (isDefault) {
            this.x = NaN; // spine import data bug
            this.y = NaN; // spine import data bug
        }
    }
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

    constructor(isDefault: boolean = false) {
        super();
        if (isDefault) {
            this.color = ""; // Spine import data bug.
        }
    }
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

export const copyConfig = [
    Spine, {
        bones: Bone,
        slots: Slot,
        ik: IKConstraint,
        transform: TransformConstraint,
        path: PathConstraint,
        skins: [[[[
            function (attachment: any): { new(): Attachment } | null {
                const type: AttachmentType = attachment.type || "region";
                switch (type) {
                    case "region":
                        return RegionAttachment;

                    case "mesh":
                    case "skinnedmesh":
                        return MeshAttachment;

                    case "linkedmesh":
                        return LinkedMeshAttachment;

                    case "boundingbox":
                        return BoundingBoxAttachment;

                    case "path":
                        return PathAttachment;

                    case "point":
                        return PointAttachment;

                    case "clipping":
                        return ClippingAttachment;

                    default:
                        return null;
                }
            },
            Function
        ]]]],
        animations: [Animation],
        events: [Event],
    },
    Animation, {
        bones: [BoneTimelines],
        slots: [SlotTimelines],
        ik: [
            IKConstraintFrame,
            Array
        ],
        transform: [
            TransformConstraintFrame,
            Array
        ],
        deform: [[[
            DeformFrame,
            Array
        ]]],
        ffd: [[[
            DeformFrame,
            Array
        ]]],
        events: EventFrame,
        draworder: DrawOrderFrame,
    },
    BoneTimelines, {
        rotate: RotateFrame,
        translate: TranslateFrame,
        scale: ScaleFrame,
        shear: ShearFrame
    },
    SlotTimelines, {
        attachment: AttachmentFrame,
        color: ColorFrame
    }
];

export const compressConfig = [
    new Spine(),
    new Skeleton(),
    new Bone(),
    new Slot(),
    new IKConstraint(),
    new TransformConstraint(),
    new PathConstraint(),

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
    new ScaleFrame(true),
    new AttachmentFrame(true),
    new ColorFrame(true),
    new IKConstraintFrame(),
    new TransformConstraintFrame(),
    new DeformFrame(),
    new EventFrame(),
    new DrawOrderFrame(),
];