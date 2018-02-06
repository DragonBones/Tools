import { Map } from "../common/types";
import * as utils from "../common/utils";
import { Matrix, Transform, ColorTransform, Point, Rectangle, helpPointA } from "./geom";
import * as geom from "./geom";
import * as dbftV23 from "./dragonBonesFormatV23";
/**
 * DragonBones format.
 */
export const DATA_VERSION_2_3: string = "2.3";
export const DATA_VERSION_3_0: string = "3.0";
export const DATA_VERSION_4_0: string = "4.0";
export const DATA_VERSION_4_5: string = "4.5";
export const DATA_VERSION_5_0: string = "5.0";
export const DATA_VERSION_5_5: string = "5.5";
export const DATA_VERSION_5_6: string = "5.6";
export const DATA_VERSION: string = DATA_VERSION_5_6;
export const DATA_VERSIONS: Array<string> = [
    DATA_VERSION_2_3,
    DATA_VERSION_3_0,
    DATA_VERSION_4_0,
    DATA_VERSION_4_5,
    DATA_VERSION_5_0,
    DATA_VERSION_5_5,
    DATA_VERSION_5_6
];

export enum OffsetOrder {
    FrameInt = 0,
    FrameFloat = 1,
    Frame = 2
}

export enum BinaryOffset {
    WeigthBoneCount = 0,
    WeigthFloatOffset = 1,
    WeigthBoneIndices = 2,

    MeshVertexCount = 0,
    MeshTriangleCount = 1,
    MeshFloatOffset = 2,
    MeshWeightOffset = 3,
    MeshVertexIndices = 4,

    TimelineScale = 0,
    TimelineOffset = 1,
    TimelineKeyFrameCount = 2,
    TimelineFrameValueCount = 3,
    TimelineFrameValueOffset = 4,
    TimelineFrameOffset = 5,

    FramePosition = 0,
    FrameTweenType = 1,
    FrameTweenEasingOrCurveSampleCount = 2,
    FrameCurveSamples = 3,

    ActionFrameActionCount = 1,
    ActionFrameActionIndices = 2,

    DeformMeshOffset = 0,
    DeformCount = 1,
    DeformValueCount = 2,
    DeformValueOffset = 3,
    DeformFloatOffset = 4
}

export enum ArmatureType {
    Armature = 0,
    MovieClip = 1,
    Stage = 2,
    ImageSequences = 3
}

export enum BoneType {
    Bone = 0,
    Surface = 1
}

export enum DisplayType {
    Image = 0,
    Armature = 1,
    Mesh = 2,
    BoundingBox = 3,
    Path = 4
}

export enum BoundingBoxType {
    Rectangle = 0,
    Ellipse = 1,
    Polygon = 2
}

export enum ActionType {
    Play = 0,
    Frame = 10,
    Sound = 11
}

export enum BlendMode {
    Normal = 0,
    Add = 1,
    Alpha = 2,
    Darken = 3,
    Difference = 4,
    Erase = 5,
    HardLight = 6,
    Invert = 7,
    Layer = 8,
    Lighten = 9,
    Multiply = 10,
    Overlay = 11,
    Screen = 12,
    Subtract = 13
}

export enum TimelineType {
    Action = 0,
    ZOrder = 1,

    BoneAll = 10,
    BoneTranslate = 11,
    BoneRotate = 12,
    BoneScale = 13,

    Surface = 50,

    SlotDisplay = 20,
    SlotColor = 21,
    MeshDeform = 22,

    IKConstraint = 30,

    AnimationTime = 40,
    AnimationWeight = 41
}

export enum TweenType {
    None = 0,
    Line = 1,
    Curve = 2,
    QuadIn = 3,
    QuadOut = 4,
    QuadInOut = 5
}

export function isDragonBonesString(string: string): boolean {
    const testString = string.substr(0, Math.min(200, string.length));
    return testString.indexOf("armature") > 0 || testString.indexOf("textureAtlas") > 0;
}

export function getFrameByPosition<T extends Frame>(frames: T[], position: number): T {
    let index = 0;
    let currentPosition = 0;

    for (const frame of frames) {
        if (frame._position >= 0) {
            if (frame._position === position) {
                return frame;
            }
            else if (frame._position > position) {
                return frames[index - 1];
            }
        }
        else {
            if (currentPosition === position) {
                return frame;
            }
            else if (currentPosition > position) {
                return frames[index - 1];
            }

            currentPosition += frame.duration;
        }

        index++;
    }

    return frames[0];
}

export function getTextureFormTextureAtlases(name: string, textureAtlases: TextureAtlas[]): Texture | null {
    for (const textureAtlas of textureAtlases) {
        const texture = textureAtlas.getTexture(name);
        if (texture !== null) {
            return texture;
        }
    }

    return null;
}

export function getCurvePoint(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, t: number, result: Point): void {
    const l_t = 1 - t;
    const powA = l_t * l_t;
    const powB = t * t;
    const kA = l_t * powA;
    const kB = 3.0 * t * powA;
    const kC = 3.0 * l_t * powB;
    const kD = t * powB;

    result.x = kA * x1 + kB * x2 + kC * x3 + kD * x4;
    result.y = kA * y1 + kB * y2 + kC * y3 + kD * y4;
}

export function getCurveEasingValue(t: number, curve: number[]): number {
    const curveCount = curve.length;

    let stepIndex = -2;
    while ((stepIndex + 6 < curveCount ? curve[stepIndex + 6] : 1) < t) { // stepIndex + 3 * 2
        stepIndex += 6;
    }

    const isInCurve = stepIndex >= 0 && stepIndex + 6 < curveCount;
    const x1 = isInCurve ? curve[stepIndex] : 0.0;
    const y1 = isInCurve ? curve[stepIndex + 1] : 0.0;
    const x2 = curve[stepIndex + 2];
    const y2 = curve[stepIndex + 3];
    const x3 = curve[stepIndex + 4];
    const y3 = curve[stepIndex + 5];
    const x4 = isInCurve ? curve[stepIndex + 6] : 1.0;
    const y4 = isInCurve ? curve[stepIndex + 7] : 1.0;

    let lower = 0.0;
    let higher = 1.0;
    while (higher - lower > 0.01) {
        const percentage = (higher + lower) / 2.0;
        getCurvePoint(x1, y1, x2, y2, x3, y3, x4, y4, percentage, helpPointA);
        if (t - helpPointA.x > 0.0) {
            lower = percentage;
        }
        else {
            higher = percentage;
        }
    }

    return helpPointA.y;
}

export function samplingEasingCurve(curve: Array<number>, samples: Array<number>): void {
    const curveCount = curve.length;
    const result = new Point();

    let stepIndex = -2;
    for (let i = 0, l = samples.length; i < l; ++i) {
        let t = (i + 1) / (l + 1);
        while ((stepIndex + 6 < curveCount ? curve[stepIndex + 6] : 1) < t) { // stepIndex + 3 * 2
            stepIndex += 6;
        }

        const isInCurve = stepIndex >= 0 && stepIndex + 6 < curveCount;
        const x1 = isInCurve ? curve[stepIndex] : 0.0;
        const y1 = isInCurve ? curve[stepIndex + 1] : 0.0;
        const x2 = curve[stepIndex + 2];
        const y2 = curve[stepIndex + 3];
        const x3 = curve[stepIndex + 4];
        const y3 = curve[stepIndex + 5];
        const x4 = isInCurve ? curve[stepIndex + 6] : 1.0;
        const y4 = isInCurve ? curve[stepIndex + 7] : 1.0;

        let lower = 0.0;
        let higher = 1.0;
        while (higher - lower > 0.0001) {
            const percentage = (higher + lower) / 2.0;
            getCurvePoint(x1, y1, x2, y2, x3, y3, x4, y4, percentage, result);
            if (t - result.x > 0.0) {
                lower = percentage;
            }
            else {
                higher = percentage;
            }
        }

        samples[i] = result.y;
    }
}

export function getEasingValue(tweenType: TweenType, progress: number, easing: number): number {
    let value = progress;

    switch (tweenType) {
        case TweenType.QuadIn:
            value = Math.pow(progress, 2.0);
            break;

        case TweenType.QuadOut:
            value = 1.0 - Math.pow(1.0 - progress, 2.0);
            break;

        case TweenType.QuadInOut:
            value = 0.5 * (1.0 - Math.cos(progress * Math.PI));
            break;
    }

    return (value - progress) * easing + progress;
}

export function getEdgeFormTriangles(triangles: number[]): number[] {
    const edges: number[][] = [];
    const lines: { [k: string]: [number, number] | null } = {};
    const addLine = (a: number, b: number): void => {
        if (a > b) {
            const c = a;
            a = b;
            b = c;
        }

        const k = a + "_" + b;
        if (k in lines) {
            lines[k] = null;
        }
        else {
            lines[k] = [a, b];
        }
    };

    for (let i = 0, l = triangles.length; i < l; i += 3) {
        addLine(triangles[i + 0], triangles[i + 1]);
        addLine(triangles[i + 1], triangles[i + 2]);
        addLine(triangles[i + 2], triangles[i + 0]);
    }

    for (let k in lines) {
        const line = lines[k];
        if (line !== null) {
            edges.push(line);
        }
    }

    edges.sort((a, b) => {
        if (a[0] === b[0]) {
            return a[1] < b[1] ? -1 : 1;
        }

        return a[0] < b[0] ? -1 : 1;
    });

    const last = edges.splice(1, 1)[0];
    edges.push(last);
    const c = last[0];
    last[0] = last[1];
    last[1] = c;

    const result = new Array<number>();
    for (const line of edges) {
        result.push(line[0], line[1]);
    }

    return result;
}

export function oldActionToNewAction(oldAction: OldAction): Action {
    const newAction = new Action();
    newAction.type = ActionType.Play;
    newAction.name = oldAction.gotoAndPlay;
    return newAction;
}

export function mergeActionToAnimation(
    animation: Animation, frame: dbftV23.AllFrame | BoneAllFrame | SlotAllFrame | SlotDisplayFrame, framePosition: number,
    bone: Bone | null, slot: Slot | null,
    forRuntime: boolean
): void {
    const frames = animation.frame;
    const boneName = bone ? bone.name : "";
    const slotName = slot ? slot.name : "";
    if (frames.length === 0) {
        const beginFrame = new ActionFrame();
        beginFrame.duration = animation.duration;
        frames.push(beginFrame);
    }

    let position = 0;
    let frameIndex = 0;
    let insertFrame: ActionFrame | null = null;
    let prevFrame: ActionFrame | null = null;
    for (let i = 0, l = frames.length; i < l; ++i) {
        const eachFrame = frames[i];
        if (framePosition === position) {
            insertFrame = eachFrame;
            break;
        }
        else if (framePosition < position && prevFrame !== null) {
            prevFrame.duration = framePosition - (position - prevFrame.duration);
            insertFrame = new ActionFrame();
            insertFrame.duration = position - framePosition;
            frames.splice(i + 1, 0, insertFrame);
            break;
        }

        position += eachFrame.duration;
        prevFrame = eachFrame;
        frameIndex++;
    }

    if (insertFrame === null && prevFrame !== null) {
        prevFrame.duration = framePosition;
        insertFrame = new ActionFrame();
        insertFrame.duration = position - framePosition;
        frames.splice(frameIndex, 0, insertFrame);
    }

    if (insertFrame !== null) {
        if (frame instanceof dbftV23.AllFrame || frame instanceof BoneAllFrame) {
            if (frame.event) {
                const action = new Action();
                action.name = frame.event;
                action.bone = boneName;
                if (forRuntime) {
                    action.type = ActionType.Frame;
                    insertFrame.actions.push(action);
                }
                else {
                    insertFrame.events.push(action);
                }
            }

            if (frame.sound) {
                if (forRuntime) {
                    const action = new Action();
                    action.type = ActionType.Sound;
                    action.name = frame.sound;
                    action.bone = boneName;
                    insertFrame.actions.push(action);
                }
                else {
                    insertFrame.sound = frame.sound;
                }
            }

            if (frame.action) {
                if (forRuntime) {
                    const action = new Action();
                    action.type = ActionType.Play;
                    action.name = frame.action;
                    action.slot = slotName;
                    insertFrame.actions.push(action);
                }
            }
        }
        else if (forRuntime) {
            for (const action of frame.actions) {
                if (action instanceof OldAction) {
                    const newAction = new Action();
                    newAction.type = ActionType.Play;
                    newAction.name = action.gotoAndPlay;
                    newAction.slot = slotName;
                    insertFrame.actions.push(newAction);
                }
                else {
                    action.slot = slotName;
                    insertFrame.actions.push(action);
                }
            }
        }
    }
}

export class DragonBones {
    frameRate: number = 0;
    name: string = "";
    stage: string = "";
    version: string = "";
    compatibleVersion: string = "";
    readonly armature: Armature[] = [];
    readonly offset: number[] = []; // Binary.
    readonly textureAtlas: TextureAtlas[] = [];
    userData: UserData | null = null;
}

export class UserData {
    readonly ints: number[] = [];
    readonly floats: number[] = [];
    readonly strings: string[] = [];
}

export class OldAction {
    gotoAndPlay: string = "";
}

export class Action extends UserData {
    type: number = ActionType.Play;
    name: string = "";
    bone: string = "";
    slot: string = "";
}

export class Canvas {
    hasBackground: boolean = false;
    color: number = -1;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
}

export class Armature {
    type: ArmatureType | string = ArmatureType[ArmatureType.Armature].toLowerCase();
    frameRate: number = 0;
    name: string = "";
    readonly aabb: Rectangle = new Rectangle();
    readonly bone: Bone[] = [];
    readonly slot: Slot[] = [];
    readonly ik: IKConstraint[] = [];
    readonly path: PathConstraint[] = [];
    readonly skin: Skin[] = [];
    readonly animation: (Animation | AnimationBinary)[] = []; // Binary.
    readonly defaultActions: (OldAction | Action)[] = [];
    readonly actions: Action[] = [];
    canvas: Canvas | null = null;
    userData: UserData | null = null;

    sortBones(): void {
        const total = this.bone.length;
        if (total <= 0) {
            return;
        }

        const sortHelper = this.bone.concat();
        let index = 0;
        let count = 0;
        this.bone.length = 0;
        while (count < total) {
            const bone = sortHelper[index++];
            if (index >= total) {
                index = 0;
            }

            if (this.bone.indexOf(bone) >= 0) {
                continue;
            }

            // TODO constraint.

            if (bone.parent) {
                const parent = this.getBone(bone.parent);
                if (!parent || this.bone.indexOf(parent) < 0) {
                    continue;
                }
            }

            this.bone.push(bone);
            count++;
        }
    }

    getBone(name: string): Bone | null {
        for (const bone of this.bone) {
            if (bone.name === name) {
                return bone;
            }
        }

        return null;
    }

    getSlot(name: string): Slot | null {
        for (const slot of this.slot) {
            if (slot.name === name) {
                return slot;
            }
        }

        return null;
    }

    getSkin(name: string): Skin | null {
        for (const skin of this.skin) {
            if (skin.name === name) {
                return skin;
            }
        }

        return null;
    }

    getMesh(skinName: string, slotName: string, displayName: string): MeshDisplay | null {
        const skin = this.getSkin(skinName);
        if (skin) {
            const slot = skin.getSlot(slotName);
            if (slot) {
                return slot.getDisplay(displayName) as MeshDisplay;
            }
        }

        return null;
    }

    localToGlobal(): void {
        this.sortBones();

        const helpMatrixA = new Matrix();
        const helpMatrixB = new Matrix();

        for (const bone of this.bone) {
            if (!bone._global) {
                bone._global = new Transform();
            }

            bone._global.copyFrom(bone.transform);

            if (bone.parent) {
                const parent = this.getBone(bone.parent);
                if (parent && parent._global) {
                    parent._global.toMatrix(helpMatrixA);
                    if (bone.inheritScale) {
                        if (!bone.inheritRotation) {
                            bone._global.skX -= parent._global.skY;
                            bone._global.skY -= parent._global.skY;
                        }

                        bone._global.toMatrix(helpMatrixB);
                        helpMatrixB.concat(helpMatrixA);
                        bone._global.fromMatrix(helpMatrixB);

                        if (!bone.inheritTranslation) {
                            bone._global.x = bone.transform.x;
                            bone._global.y = bone.transform.y;
                        }
                    }
                    else {
                        if (bone.inheritTranslation) {
                            helpMatrixA.transformPoint(bone._global.x, bone._global.y, bone._global, true);
                        }

                        if (bone.inheritRotation) {
                            let dR = parent._global.skY;
                            if (parent._global.scX < 0.0) {
                                dR += Math.PI;
                            }

                            if (helpMatrixA.a * helpMatrixA.d - helpMatrixA.b * helpMatrixA.c < 0.0) {
                                dR -= bone._global.skY * 2.0;
                                if (bone.inheritReflection) {
                                    bone._global.skX += Math.PI;
                                }
                            }

                            bone._global.skX += dR;
                            bone._global.skY += dR;
                        }
                    }
                }
            }
        }
    }
}

export class Bone {
    type: BoneType | string = BoneType[BoneType.Bone].toLowerCase();
    inheritTranslation: boolean = true;
    inheritRotation: boolean = true;
    inheritScale: boolean = true;
    inheritReflection: boolean = true;
    length: number = 0.0;
    name: string = "";
    parent: string = "";
    readonly transform: Transform = new Transform();
    userData: UserData | null = null;

    _global: Transform | null = null;
}

export class Surface extends Bone {
    segmentX: number = 0;
    segmentY: number = 0;
    readonly vertices: number[] = [];

    constructor() {
        super();

        this.type = BoneType[BoneType.Surface].toLowerCase();
    }
}

export class Slot {
    blendMode: BlendMode | string = BlendMode[BlendMode.Normal].toLowerCase();
    displayIndex: number = 0;
    name: string = "";
    parent: string = "";
    readonly color: ColorTransform = new ColorTransform();
    readonly actions: OldAction[] = []; // Deprecated.
    userData: UserData | null = null;
}

export class IKConstraint {
    bendPositive: boolean = true;
    chain: number = 0;
    weight: number = 1.00;
    name: string = "";
    bone: string = "";
    target: string = "";
}

export class PathConstraint {
    name: string = "";
    target: string = "";
    bones: string[] = [];

    positionMode: "fixed" | "percent" = "percent";
    spacingMode: "length" | "fixed" | "percent" = "length";
    rotateMode: "tangent" | "chain" | "chain scale" = "tangent";

    position: number;
    spacing: number;
    rotateOffset: number;
    rotateMix: number;
    translateMix: number;
}

export class Skin {
    name: string = "default";
    readonly slot: SkinSlot[] = [];
    userData: UserData | null = null;

    getSlot(name: string): SkinSlot | null {
        for (const slot of this.slot) {
            if (slot.name === name) {
                return slot;
            }
        }

        return null;
    }
}

export class SkinSlot {
    name: string = "";
    readonly display: (Display | null)[] = [];
    readonly actions: OldAction[] = []; // Deprecated.

    getDisplay(name: string): Display | null {
        for (const display of this.display) {
            if (display && display.name === name) {
                return display;
            }
        }

        return null;
    }
}

export abstract class Display {
    type: DisplayType | string = DisplayType[DisplayType.Image].toLowerCase();
    name: string = "";
    readonly transform: Transform = new Transform();
}

export abstract class BoundingBoxDisplay extends Display {
    subType: BoundingBoxType | string = BoundingBoxType[BoundingBoxType.Rectangle].toLowerCase();
    color: number = 0x000000;
}

export class ImageDisplay extends Display {
    path: string = "";
    readonly pivot: Point = new Point(0.5, 0.5);

    constructor(isDefault: boolean = false) {
        super();

        if (!isDefault) {
            this.type = DisplayType[DisplayType.Image].toLowerCase();
        }
    }
}

export class ArmatureDisplay extends Display {
    inheritAnimation: boolean = true;
    path: string = "";
    readonly actions: Action[] = [];

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = DisplayType[DisplayType.Armature].toLowerCase();
        }
    }
}

export class MeshDisplay extends Display {
    offset: number = -1; // Binary.
    width: number = 0;
    height: number = 0;
    path: string = "";

    readonly vertices: number[] = [];
    readonly uvs: number[] = [];
    readonly triangles: number[] = [];
    readonly weights: number[] = [];
    readonly slotPose: number[] = [];
    readonly bonePose: number[] = [];
    readonly glueWeights: number[] = [];
    readonly glueMeshes: string[] = [];

    edges: number[] = []; // Nonessential.
    userEdges: number[] = []; // Nonessential.

    _boneCount: number = 0;
    _weightCount: number = 0;
    _userEdges: boolean = true; // TODO

    constructor(isDefault: boolean = false) {
        super();

        if (!isDefault) {
            this.type = DisplayType[DisplayType.Mesh].toLowerCase();
        }
    }

    clearToBinary(): void {
        this.width = 0;
        this.height = 0;
        this.vertices.length = 0;
        this.uvs.length = 0;
        this.triangles.length = 0;
        this.weights.length = 0;
        this.slotPose.length = 0;
        this.bonePose.length = 0;
        this.edges.length = 0;
        this.userEdges.length = 0;
    }

    getBonePoseOffset(boneIndex: number): number {
        for (let i = 0, l = this.bonePose.length; i < l; i += 7) {
            if (boneIndex === this.bonePose[i]) {
                return i;
            }
        }

        // Impossible.
        return -1;
    }
}

export class SharedMeshDisplay extends Display {
    inheritDeform: boolean = true;
    path: string = "";
    share: string = "";
    skin: string = "default";

    constructor(isDefault: boolean = false) {
        super();

        if (!isDefault) {
            this.type = DisplayType[DisplayType.Mesh].toLowerCase();
        }
    }
}

export class PathDisplay extends Display {
    offset: number = -1; // Binary.

    closed: boolean;
    constantSpeed: boolean;
    vertexCount: number;
    readonly vertices: number[] = [];
    readonly slotPose: number[] = [];
    readonly bonePose: number[] = [];
    lengths: number[] = [];
    readonly weights: number[] = [];

    constructor(isDefault: boolean = false) {
        super();

        if (!isDefault) {
            this.type = DisplayType[DisplayType.Path].toLowerCase();
        }
    }
}

export class RectangleBoundingBoxDisplay extends BoundingBoxDisplay {
    width: number = 0.00;
    height: number = 0.00;

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = DisplayType[DisplayType.BoundingBox].toLowerCase();
            this.subType = BoundingBoxType[BoundingBoxType.Rectangle].toLowerCase();
        }
    }
}

export class EllipseBoundingBoxDisplay extends BoundingBoxDisplay {
    width: number = 0.00;
    height: number = 0.00;

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = DisplayType[DisplayType.BoundingBox].toLowerCase();
            this.subType = BoundingBoxType[BoundingBoxType.Ellipse].toLowerCase();
        }
    }
}

export class PolygonBoundingBoxDisplay extends BoundingBoxDisplay {
    vertices: number[] = [];

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = DisplayType[DisplayType.BoundingBox].toLowerCase();
            this.subType = BoundingBoxType[BoundingBoxType.Polygon].toLowerCase();
        }
    }
}

export class Animation {
    duration: number = 1;
    playTimes: number = 1;
    scale: number = 1.0;
    fadeInTime: number = 0.0;
    name: string = "default";
    readonly frame: ActionFrame[] = [];
    readonly bone: BoneTimeline[] = [];
    readonly surface: SurfaceTimeline[] = [];
    readonly slot: SlotTimeline[] = [];
    readonly ffd: MeshDeformTimeline[] = [];
    readonly ik: IKConstraintTimeline[] = [];
    readonly animation: AnimationTimeline[] = [];
    zOrder: ZOrderTimeline | null = null;

    getSlotTimeline(name: string): SlotTimeline | null {
        for (const timeline of this.slot) {
            if (timeline.name === name) {
                return timeline;
            }
        }

        return null;
    }

    getBoneTimeline(name: string): BoneTimeline | null {
        for (const timeline of this.bone) {
            if (timeline.name === name) {
                return timeline;
            }
        }

        return null;
    }
}

export class AnimationBinary {
    duration: number = 0;
    playTimes: number = 1;
    scale: number = 1.0;
    fadeInTime: number = 0.0;
    name: string = "";

    action: number = -1;
    zOrder: number = -1;
    readonly offset: number[] = [];
    readonly bone: Map<number[]> = {};
    readonly surface: Map<number[]> = {};
    readonly slot: Map<number[]> = {};
    readonly constraint: Map<number[]> = {};
}

export abstract class Timeline {
    scale: number = 1.0;
    offset: number = 0.0;
    name: string = "";
}

export class ZOrderTimeline extends Timeline {
    readonly frame: ZOrderFrame[] = [];
}

export class BoneTimeline extends Timeline {
    readonly frame: BoneAllFrame[] = []; // Deprecated.
    readonly translateFrame: BoneTranslateFrame[] = [];
    readonly rotateFrame: BoneRotateFrame[] = [];
    readonly scaleFrame: BoneScaleFrame[] = [];

    insertFrame(frames: Frame[], position: number): number {
        let index = 0;
        let fromPosition = 0;
        let progress = 0.0;
        let from: Frame | null = null;
        let insert: Frame;
        let to: Frame | null = null;

        for (const frame of frames) {
            if (fromPosition === position) {
                return index;
            }
            else if (fromPosition < position && position <= fromPosition + frame.duration) {
                if (index === frames.length - 1) {
                }
                else if (position === fromPosition + frame.duration) {
                    return index + 1;
                }
                else {
                    to = frames[index + 1];
                }

                progress = (position - fromPosition) / frame.duration;
                from = frame;
                index++;
                break;
            }

            index++;
            fromPosition += frame.duration;
        }

        if (frames === this.frame) {
            if (!from) {
                from = new BoneAllFrame();
                frames.push(from);
            }
            insert = new BoneAllFrame();
        }
        else if (frames === this.translateFrame) {
            if (!from) {
                from = new BoneTranslateFrame();
                frames.push(from);
            }
            insert = new BoneTranslateFrame();
        }
        else if (frames === this.rotateFrame) {
            if (!from) {
                from = new BoneRotateFrame();
                frames.push(from);
            }
            insert = new BoneRotateFrame();
        }
        else if (frames === this.scaleFrame) {
            if (!from) {
                from = new BoneScaleFrame();
                frames.push(from);
            }
            insert = new BoneScaleFrame();
        }
        else {
            return -1;
        }

        insert.duration = from.duration - (position - fromPosition);
        from.duration -= insert.duration;
        frames.splice(index, 0, insert);

        if (from instanceof TweenFrame && insert instanceof TweenFrame) {
            // TODO
            insert.tweenEasing = from.tweenEasing;
            //to.curve; 
            progress = from.getTweenProgress(progress);
        }

        if (from instanceof BoneAllFrame && insert instanceof BoneAllFrame) {
            if (to instanceof BoneAllFrame) {
                insert.transform.x = from.transform.x + (to.transform.x - from.transform.x) * progress;
                insert.transform.y = from.transform.y + (to.transform.y - from.transform.y) * progress;
                insert.transform.scX = from.transform.scX + (to.transform.scX - from.transform.scX) * progress;
                insert.transform.scY = from.transform.scY + (to.transform.scY - from.transform.scY) * progress;

                if (from.tweenRotate === 0) {
                    insert.tweenRotate = 0;
                    insert.transform.skX = from.transform.skX + geom.normalizeDegree(to.transform.skX - from.transform.skX) * progress;
                    insert.transform.skY = from.transform.skY + geom.normalizeDegree(to.transform.skY - from.transform.skY) * progress;
                }
                else {
                    let tweenRotate = from.tweenRotate;
                    if (tweenRotate > 0 && tweenRotate < 2) {
                        insert.tweenRotate = 1;
                    }
                    else if (tweenRotate < 0 && tweenRotate > -2) {
                        insert.tweenRotate = -1;
                    }
                    else {
                        insert.tweenRotate = Math.floor(tweenRotate * progress);
                    }

                    if (tweenRotate > 0 ? to.transform.skY >= from.transform.skY : to.transform.skY <= from.transform.skY) {
                        tweenRotate = tweenRotate > 0 ? tweenRotate - 1 : tweenRotate + 1;
                    }

                    insert.transform.skX = from.transform.skX + geom.normalizeDegree(to.transform.skX - from.transform.skX + 360.0 * tweenRotate) * progress;
                    insert.transform.skY = from.transform.skY + geom.normalizeDegree(to.transform.skY - from.transform.skY + 360.0 * tweenRotate) * progress;
                }
            }
            else {
                insert.transform.copyFrom(from.transform);
            }
        }
        else if (from instanceof BoneTranslateFrame && insert instanceof BoneTranslateFrame) {
            if (to instanceof BoneTranslateFrame) {
                insert.x = from.x + (to.x - from.x) * progress;
                insert.y = from.y + (to.y - from.y) * progress;
            }
            else {
                insert.x = from.x;
                insert.y = from.y;
            }
        }
        else if (from instanceof BoneRotateFrame && insert instanceof BoneRotateFrame && to instanceof BoneRotateFrame) {
            if (to instanceof BoneRotateFrame) {
                if (from.clockwise === 0) {
                    insert.clockwise = 0;
                    insert.rotate = from.rotate + geom.normalizeDegree(to.rotate - from.rotate) * progress;
                }
                else {
                    let clockwise = from.clockwise;
                    if (clockwise > 0 && clockwise < 2) {
                        insert.clockwise = 1;
                    }
                    else if (clockwise < 0 && clockwise > -2) {
                        insert.clockwise = -1;
                    }
                    else {
                        insert.clockwise = Math.floor(clockwise * progress);
                    }

                    if (clockwise > 0 ? to.rotate >= from.rotate : to.rotate <= from.rotate) {
                        clockwise = clockwise > 0 ? clockwise - 1 : clockwise + 1;
                    }

                    insert.rotate = from.rotate + (to.rotate - from.rotate + 360.0 * clockwise) * progress;
                }

                insert.skew = from.skew + (to.skew - from.skew) * progress;
            }
            else {
                insert.rotate = from.rotate;
                insert.skew = from.skew;
            }
        }
        else if (from instanceof BoneScaleFrame && insert instanceof BoneScaleFrame) {
            if (to instanceof BoneScaleFrame) {
                insert.x = from.x + (to.x - from.x) * progress;
                insert.y = from.y + (to.y - from.y) * progress;
            }
            else {
                insert.x = from.x;
                insert.y = from.y;
            }
        }
        else {
            return -1;
        }

        return index;
    }
}

export class SurfaceTimeline extends Timeline {
    readonly frame: DeformFrame[] = [];
}

export class SlotTimeline extends Timeline {
    readonly frame: SlotAllFrame[] = []; // Deprecated.
    readonly displayFrame: SlotDisplayFrame[] = [];
    readonly colorFrame: SlotColorFrame[] = [];

    insertFrame(frames: Frame[], position: number): number {
        let index = 0;
        let fromPosition = 0;
        let progress = 0.0;
        let from: Frame | null = null;
        let insert: Frame;
        let to: Frame | null = null;

        for (const frame of frames) {
            if (fromPosition === position) {
                return index;
            }
            else if (fromPosition < position && position <= fromPosition + frame.duration) {
                if (index === frames.length - 1) {
                }
                else if (position === fromPosition + frame.duration) {
                    return index + 1;
                }
                else {
                    to = frames[index + 1];
                }

                progress = (position - fromPosition) / frame.duration;
                from = frame;
                index++;
                break;
            }

            index++;
            fromPosition += frame.duration;
        }

        if (frames === this.frame) {
            if (!from) {
                from = new SlotAllFrame();
                frames.push(from);
            }
            insert = new SlotAllFrame();
        }
        else if (frames === this.displayFrame) {
            if (!from) {
                from = new SlotDisplayFrame();
                frames.push(from);
            }
            insert = new SlotDisplayFrame();
        }
        else if (frames === this.colorFrame) {
            if (!from) {
                from = new SlotColorFrame();
                frames.push(from);
            }
            insert = new SlotColorFrame();
        }
        else {
            return -1;
        }

        insert.duration = from.duration - (position - fromPosition);
        from.duration -= insert.duration;
        frames.splice(index, 0, insert);

        if (from instanceof TweenFrame && insert instanceof TweenFrame) {
            // TODO
            insert.tweenEasing = from.tweenEasing;
            //insert.curve; 
            progress = from.getTweenProgress(progress);
        }

        if (from instanceof SlotAllFrame && insert instanceof SlotAllFrame) {
            insert.displayIndex = from.displayIndex;

            if (to instanceof SlotAllFrame) {
                insert.color.aM = from.color.aM + (to.color.aM - from.color.aM) * progress;
                insert.color.rM = from.color.rM + (to.color.rM - from.color.rM) * progress;
                insert.color.gM = from.color.gM + (to.color.gM - from.color.gM) * progress;
                insert.color.bM = from.color.bM + (to.color.bM - from.color.bM) * progress;
                insert.color.aO = from.color.aO + (to.color.aO - from.color.aO) * progress;
                insert.color.rO = from.color.rO + (to.color.rO - from.color.rO) * progress;
                insert.color.gO = from.color.gO + (to.color.gO - from.color.gO) * progress;
                insert.color.bO = from.color.bO + (to.color.bO - from.color.bO) * progress;
            }
            else {
                insert.color.copyFrom(insert.color);
            }
        }
        else if (from instanceof SlotDisplayFrame && insert instanceof SlotDisplayFrame) {
            insert.value = from.value;
        }
        else if (from instanceof SlotColorFrame && insert instanceof SlotColorFrame) {
            if (to instanceof SlotColorFrame) {
                insert.value.aM = from.value.aM + (to.value.aM - from.value.aM) * progress;
                insert.value.rM = from.value.rM + (to.value.rM - from.value.rM) * progress;
                insert.value.gM = from.value.gM + (to.value.gM - from.value.gM) * progress;
                insert.value.bM = from.value.bM + (to.value.bM - from.value.bM) * progress;
                insert.value.aO = from.value.aO + (to.value.aO - from.value.aO) * progress;
                insert.value.rO = from.value.rO + (to.value.rO - from.value.rO) * progress;
                insert.value.gO = from.value.gO + (to.value.gO - from.value.gO) * progress;
                insert.value.bO = from.value.bO + (to.value.bO - from.value.bO) * progress;
            }
            else {
                insert.value.copyFrom(insert.value);
            }
        }
        else {
            return -1;
        }

        return index;
    }
}

export class MeshDeformTimeline extends Timeline {
    skin: string = "default";
    slot: string = "";
    readonly frame: DeformFrame[] = [];
}

export class IKConstraintTimeline extends Timeline {
    readonly frame: IKConstraintFrame[] = [];
}

export class AnimationTimeline extends Timeline {
    readonly frame: AnimationFrame[] = [];
}

export abstract class Frame {
    duration: number = 1;
    _position: number = -1;

    abstract equal(value: this): boolean;
}

export abstract class TweenFrame extends Frame {
    tweenEasing: number = NaN;
    curve: number[] = [];

    getTweenEnabled(): boolean {
        return this.curve.length > 0 || !isNaN(this.tweenEasing);
    }

    removeTween(): void {
        this.tweenEasing = NaN;
        this.curve.length = 0;
    }

    getTweenProgress(value: number): number {
        if (this.getTweenEnabled()) {
            if (this.curve.length > 0) {
                return getCurveEasingValue(value, this.curve);
            }
            else {
                if (this.tweenEasing === 0.0) {
                }
                else if (this.tweenEasing <= 0.0) {
                    return getEasingValue(TweenType.QuadOut, value, this.tweenEasing);
                }
                else if (this.tweenEasing <= 1.0) {
                    return getEasingValue(TweenType.QuadIn, value, this.tweenEasing);
                }
                else if (this.tweenEasing <= 2.0) {
                    return getEasingValue(TweenType.QuadInOut, value, this.tweenEasing);
                }

                return value;
            }
        }

        return 0.0;
    }
}

export class ActionFrame extends Frame {
    action: string = ""; // Deprecated.
    event: string = ""; // Deprecated.
    sound: string = ""; // Deprecated.
    readonly events: Action[] = []; // Deprecated.
    readonly actions: Action[] = [];

    equal(value: this): boolean {
        // tslint:disable-next-line:no-unused-expression
        value;
        return !value;
    }
}

export class ZOrderFrame extends Frame {
    readonly zOrder: number[] = [];

    equal(value: this): boolean {
        if (this.zOrder.length === value.zOrder.length) {
            for (let i = 0, l = this.zOrder.length; i < l; ++i) {
                if (this.zOrder[i] !== value.zOrder[i]) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }
}

export class BoneAllFrame extends TweenFrame {
    tweenRotate: number = 0;
    action: string = ""; // Deprecated.
    event: string = ""; // Deprecated.
    sound: string = ""; // Deprecated.
    readonly transform: Transform = new Transform();

    equal(value: this): boolean {
        return this.tweenRotate === 0 && !this.action && !this.event && !this.sound && this.transform.equal(value.transform);
    }
}

export class BoneTranslateFrame extends TweenFrame {
    x: number = 0.0;
    y: number = 0.0;

    equal(value: this): boolean {
        return this.x === value.x && this.y === value.y;
    }
}

export class BoneRotateFrame extends TweenFrame {
    clockwise: number = 0;
    rotate: number = 0.0;
    skew: number = 0.0;

    equal(value: this): boolean {
        return this.clockwise === 0 && this.rotate === value.rotate && this.skew === value.skew;
    }

    getTweenFrame(to: this, progress: number): this {
        if (progress === 0.0 || this.getTweenEnabled()) {
            return this;
        }

        if (progress >= 1.0) {
            return to;
        }

        progress = this.getTweenProgress(progress);

        const frame = new BoneRotateFrame();

        if (this.clockwise === 0) {
            frame.rotate = this.rotate + geom.normalizeDegree(to.rotate - this.rotate) * progress;
        }
        else {
            let clockwise = this.clockwise;
            if (clockwise > 0 ? to.rotate >= this.rotate : to.rotate <= this.rotate) {
                clockwise = clockwise > 0 ? clockwise - 1 : clockwise + 1;
            }

            frame.rotate = this.rotate + (to.rotate - this.rotate + 360.0 * clockwise) * progress;
        }

        frame.skew = this.skew + (to.skew - this.skew) * progress;

        return frame as any;
    }
}

export class BoneScaleFrame extends TweenFrame {
    x: number = 1.0;
    y: number = 1.0;

    equal(value: this): boolean {
        return this.x === value.x && this.y === value.y;
    }
}

export class DeformFrame extends TweenFrame {
    offset: number = 0;
    vertices: number[] = [];

    equal(value: this): boolean {
        if (this.offset === value.offset && this.vertices.length === value.vertices.length) {
            for (let i = 0, l = this.vertices.length; i < l; ++i) {
                if (this.vertices[i] !== value.vertices[i]) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }
}

export class SlotAllFrame extends TweenFrame {
    displayIndex: number = 0;
    readonly color: ColorTransform = new ColorTransform();
    readonly actions: (OldAction | Action)[] = [];

    equal(value: this): boolean {
        return this.actions.length === 0 && this.displayIndex === value.displayIndex && this.color.equal(value.color);
    }
}

export class SlotDisplayFrame extends Frame {
    value: number = 0;
    readonly actions: (OldAction | Action)[] = [];

    equal(value: this): boolean {
        return this.actions.length === 0 && this.value === value.value;
    }
}

export class SlotColorFrame extends TweenFrame {
    readonly value: ColorTransform = new ColorTransform();
    readonly color: ColorTransform = new ColorTransform(); // Deprecated.

    equal(value: this): boolean {
        return this.value.equal(value.value);
    }
}

export class IKConstraintFrame extends TweenFrame {
    bendPositive: boolean = true;
    weight: number = 1.0;

    equal(value: this): boolean {
        return this.bendPositive === value.bendPositive && this.weight === value.weight;
    }
}

export class AnimationFrame extends TweenFrame {
    value: number = -1;
    weight: number = 1.0;

    equal(value: this): boolean {
        return this.value === value.value && this.weight === value.weight;
    }
}

export class TextureAtlas {
    width: number = 0;
    height: number = 0;
    scale: number = 1.00;
    name: string = "";
    imagePath: string = "";
    readonly SubTexture: Texture[] = [];

    getTexture(name: string): Texture | null {
        for (const texture of this.SubTexture) {
            if (texture.name === name) {
                return texture;
            }
        }

        return null;
    }
}

export class Texture {
    rotated: boolean = false;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    frameX: number = 0;
    frameY: number = 0;
    frameWidth: number = 0;
    frameHeight: number = 0;
    name: string = "";
}

export const copyConfig = [
    DragonBones, {
        armature: Armature,
        textureAtlas: TextureAtlas,
        userData: UserData
    },
    Armature, {
        bone: [
            function (bone: any): { new(): (Bone | Surface) } | null {
                let type = bone.type;
                if (type !== undefined) {
                    if (typeof type === "string") {
                        type = utils.getEnumFormString(BoneType, type, BoneType.Bone);
                    }
                }
                else {
                    type = BoneType.Bone;
                }

                switch (type) {
                    case BoneType.Bone:
                        return Bone;

                    case BoneType.Surface:
                        return Surface;
                }

                return null;
            },
            Function
        ],
        slot: Slot,
        ik: IKConstraint,
        path: PathConstraint,
        skin: Skin,
        animation: Animation,
        defaultActions: OldAction,
        canvas: Canvas,
        userData: UserData
    },
    Bone, {
        userData: UserData
    },
    Slot, {
        actions: OldAction,
        userData: UserData
    },
    Skin, {
        slot: SkinSlot,
        userData: UserData
    },
    SkinSlot, {
        display: [
            function (display: any): { new(): Display } | null {
                let type = display.type;
                if (type !== undefined) {
                    if (typeof type === "string") {
                        type = utils.getEnumFormString(DisplayType, type, DisplayType.Image);
                    }
                }
                else {
                    type = DisplayType.Image;
                }

                switch (type) {
                    case DisplayType.Image:
                        return ImageDisplay;

                    case DisplayType.Armature:
                        return ArmatureDisplay;

                    case DisplayType.Mesh:
                        if (display.share) {
                            return SharedMeshDisplay;
                        }
                        else {
                            return MeshDisplay;
                        }

                    case DisplayType.BoundingBox:
                        {
                            let subType = display.subType;
                            if (subType !== undefined) {
                                if (typeof subType === "string") {
                                    subType = utils.getEnumFormString(BoundingBoxType, subType, BoundingBoxType.Rectangle);
                                }
                            }
                            else {
                                subType = BoundingBoxType.Rectangle;
                            }

                            switch (subType) {
                                case BoundingBoxType.Rectangle:
                                    return RectangleBoundingBoxDisplay;

                                case BoundingBoxType.Ellipse:
                                    return EllipseBoundingBoxDisplay;

                                case BoundingBoxType.Polygon:
                                    return PolygonBoundingBoxDisplay;
                            }
                        }
                        break;

                }

                return null;
            },
            Function
        ]
    },
    ArmatureDisplay, {
        actions: Action
    },
    Animation, {
        frame: ActionFrame,
        zOrder: ZOrderTimeline,
        bone: BoneTimeline,
        surface: SurfaceTimeline,
        slot: SlotTimeline,
        ffd: MeshDeformTimeline,
        ik: IKConstraintTimeline,
        animation: AnimationTimeline
    },
    ZOrderTimeline, {
        frame: ZOrderFrame
    },
    BoneTimeline, {
        frame: BoneAllFrame,
        translateFrame: BoneTranslateFrame,
        rotateFrame: BoneRotateFrame,
        scaleFrame: BoneScaleFrame,
    },
    SurfaceTimeline, {
        frame: DeformFrame,
    },
    SlotTimeline, {
        frame: SlotAllFrame,
        displayFrame: SlotDisplayFrame,
        colorFrame: SlotColorFrame,
    },
    MeshDeformTimeline, {
        frame: DeformFrame
    },
    IKConstraintTimeline, {
        frame: IKConstraintFrame
    },
    AnimationTimeline, {
        frame: AnimationFrame
    },
    ActionFrame, {
        actions: Action,
        events: Action
    },
    SlotAllFrame, {
        actions: OldAction
    },
    SlotDisplayFrame, {
        actions: OldAction
    },
    TextureAtlas, {
        SubTexture: Texture,
    }
];

export const compressConfig = [
    new Point(0.5, 0.5),
    new Rectangle(),
    new Transform(),
    new ColorTransform(),

    new DragonBones(),
    new UserData(),
    new OldAction(),
    new Action(),
    new Canvas(),
    new Armature(),
    new Bone(),
    new Surface(),
    new Slot(),
    new IKConstraint(),
    new Skin(),
    new SkinSlot(),

    new ImageDisplay(true),
    new ArmatureDisplay(true),
    new MeshDisplay(true),
    new SharedMeshDisplay(true),
    new RectangleBoundingBoxDisplay(true),
    new EllipseBoundingBoxDisplay(true),
    new PolygonBoundingBoxDisplay(true),

    new Animation(),
    new AnimationBinary(),
    new ZOrderTimeline(),
    new BoneTimeline(),
    new SurfaceTimeline(),
    new SlotTimeline(),
    new MeshDeformTimeline(),
    new IKConstraintTimeline(),
    new AnimationTimeline(),
    new ActionFrame(),
    new ZOrderFrame(),
    new BoneAllFrame(),
    new BoneTranslateFrame(),
    new BoneRotateFrame(),
    new BoneScaleFrame(),
    new DeformFrame(),
    new SlotAllFrame(),
    new SlotDisplayFrame(),
    new SlotColorFrame(),
    new IKConstraintFrame(),
    new AnimationFrame(),

    new TextureAtlas(),
    new Texture()
];