import { Map } from "../common/types";
import * as utils from "../common/utils";
import { normalizeDegree, Transform, ColorTransform, Point, Rectangle, helpPoint } from "./geom";
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
export const DATA_VERSION: string = DATA_VERSION_5_5;
export const DATA_VERSIONS: Array<string> = [
    DATA_VERSION_2_3,
    DATA_VERSION_3_0,
    DATA_VERSION_4_0,
    DATA_VERSION_4_5,
    DATA_VERSION_5_0,
    DATA_VERSION_5_5
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

    FFDTimelineMeshOffset = 0,
    FFDTimelineFFDCount = 1,
    FFDTimelineValueCount = 2,
    FFDTimelineValueOffset = 3,
    FFDTimelineFloatOffset = 4
}

export enum ArmatureType {
    Armature = 0,
    MovieClip = 1,
    Stage = 2,
    ImageSequences = 3
}

export enum DisplayType {
    Image = 0,
    Armature = 1,
    Mesh = 2,
    BoundingBox = 3
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
    BoneT = 11,
    BoneR = 12,
    BoneS = 13,
    BoneX = 14,
    BoneY = 15,
    BoneRotate = 16,
    BoneSkew = 17,
    BoneScaleX = 18,
    BoneScaleY = 19,

    SlotDisplay = 20,
    SlotColor = 21,
    SlotFFD = 22,

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
    return testString.indexOf("armature") > 0;
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
        getCurvePoint(x1, y1, x2, y2, x3, y3, x4, y4, percentage, helpPoint);
        if (t - helpPoint.x > 0.0) {
            lower = percentage;
        }
        else {
            higher = percentage;
        }
    }

    return helpPoint.y;
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

export function cleanTimeline(timelines: Timeline[], armature: Armature): void {
    for (let i = 0, l = timelines.length; i < l; ++i) {
        const timeline = timelines[i];
        if (!timeline.format(armature)) {
            timelines.splice(i, 1);
            i--;
            l--;
        }
    }
}

export function cleanFrame(frames: Frame[]): void {
    let prevFrame: Frame | null = null;
    for (let i = 0, l = frames.length; i < l; ++i) {
        const frame = frames[i];
        if (
            prevFrame && frame.equal(prevFrame) &&
            (i === l - 1 || frame.equal(frames[i + 1]))
        ) {
            prevFrame.duration += frame.duration;
            if (i === l - 1 && prevFrame instanceof TweenFrame) {
                prevFrame.removeTween();
            }

            frames.splice(i, 1);
            i--;
            l--;
        }
        else {
            prevFrame = frame;
        }
    }
}

export function oldActionToNewAction(oldAction: OldAction): Action {
    const newAction = new Action();
    newAction.type = ActionType.Play;
    newAction.name = oldAction.gotoAndPlay;
    return newAction;
}

export function mergeActionToAnimation(animation: Animation, frame: dbftV23.AllFrame | BoneAllFrame | SlotAllFrame | SlotDisplayFrame, framePosition: number, bone: Bone | null, slot: Slot | null, forRuntime: boolean): void {
    const frames = animation.frame;
    const boneName = bone ? bone.name : "";
    const slotName = slot ? slot.name : "";
    if (frames.length === 0) {
        const beginFrame = new ActionFrame();
        beginFrame.duration = animation.duration;
        frames.push(beginFrame);
    }

    let position = 0;
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
    version: string = "";
    compatibleVersion: string = "";
    readonly armature: Armature[] = [];
    readonly offset: number[] = []; // Binary.
    textureAtlas: TextureAtlas[] = [];
    userData: UserData | null = null;

    format(): void {
        for (const armature of this.armature) {
            armature.format(this);
        }

        for (const textureAtlas of this.textureAtlas) {
            textureAtlas.format(this);
        }
    }
}

export class UserData {
    readonly ints: number[] = [];
    readonly floats: number[] = [];
    readonly strings: string[] = [];
}

export class Action extends UserData {
    type: number = ActionType.Play;
    name: string = "";
    bone: string = "";
    slot: string = "";
}

export class Armature {
    type: ArmatureType | string = ArmatureType[ArmatureType.Armature].toLowerCase();
    frameRate: number = 0;
    name: string = "";
    readonly aabb: Rectangle = new Rectangle();
    readonly bone: Bone[] = [];
    readonly slot: Slot[] = [];
    readonly ik: IKConstraint[] = [];
    readonly skin: Skin[] = [];
    readonly animation: (Animation | AnimationBinary)[] = []; // Binary.
    readonly defaultActions: (OldAction | Action)[] = [];
    readonly actions: Action[] = [];
    userData: UserData | null = null;

    format(dragonBones: DragonBones): void {
        dragonBones;
        // if (typeof this.type === "string") { // LowerCase bug. (If fix the bug, some third-party plugins may go wrong)
        //     this.type = this.type.toLowerCase();
        // }
        this.aabb.toFixed();

        for (const bone of this.bone) {
            bone.transform.skX = normalizeDegree(bone.transform.skX);
            bone.transform.skY = normalizeDegree(bone.transform.skY);
            if (bone.transform.scX === 0.0) {
                bone.transform.scX = 0.0001;
            }

            if (bone.transform.scY === 0.0) {
                bone.transform.scY = 0.0001;
            }

            bone.transform.toFixed();
        }

        for (const skin of this.skin) {
            skin.name = skin.name || "default";

            for (const skinSlot of skin.slot) {
                for (const display of skinSlot.display) {
                    display.transform.skX = normalizeDegree(display.transform.skX);
                    display.transform.skY = normalizeDegree(display.transform.skY);
                    display.transform.toFixed();

                    if (display instanceof ImageDisplay || display instanceof MeshDisplay || display instanceof SharedMeshDisplay) {
                        if (display.path === display.name) {
                            display.path = "";
                        }
                    }
                }
            }
        }

        for (const animation of this.animation) {
            if (animation instanceof Animation) {
                animation.format(this);
            }
        }
    }

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
                const parent = this.getBone(bone.parent); // Parent 一定不能非法。
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
}

export class Bone {
    inheritTranslation: boolean = true;
    inheritRotation: boolean = true;
    inheritScale: boolean = true;
    inheritReflection: boolean = true;
    length: number = 0.0;
    name: string = "";
    parent: string = "";
    readonly transform: Transform = new Transform();
    userData: UserData | null = null;
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
    readonly display: Display[] = [];

    getDisplay(name: string): Display | null {
        for (const display of this.display) {
            if (display.name === name) {
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
    path: string = "";

    readonly vertices: number[] = [];
    readonly uvs: number[] = [];
    readonly triangles: number[] = [];
    readonly weights: number[] = [];
    readonly slotPose: number[] = [];
    readonly bonePose: number[] = [];

    readonly edges: number[] = []; // Nonessential.
    readonly userEdges: number[] = []; // Nonessential.

    _boneCount: number = 0;
    _weightCount: number = 0;

    constructor(isDefault: boolean = false) {
        super();

        if (!isDefault) {
            this.type = DisplayType[DisplayType.Mesh].toLowerCase();
        }
    }

    public clearToBinary(): void {
        this.vertices.length = 0;
        this.uvs.length = 0;
        this.triangles.length = 0;
        this.weights.length = 0;
        this.slotPose.length = 0;
        this.bonePose.length = 0;
        this.edges.length = 0;
        this.userEdges.length = 0;
    }

    public getBonePoseOffset(boneIndex: number): number {
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
    inheritFFD: boolean = true;
    path: string = "";
    share: string = "";

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = DisplayType[DisplayType.Mesh].toLowerCase();
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
    offset: number = -1;
    readonly vertices: number[] = [];

    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = DisplayType[DisplayType.BoundingBox].toLowerCase();
            this.subType = BoundingBoxType[BoundingBoxType.Polygon].toLowerCase();
        }
    }

    public clearToBinary(): void {
        this.vertices.length = 0;
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
    readonly slot: SlotTimeline[] = [];
    readonly ffd: FFDTimeline[] = [];
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

    format(armature: Armature): boolean {
        cleanTimeline(this.bone, armature);
        cleanTimeline(this.slot, armature);
        cleanTimeline(this.ffd, armature);

        if (this.zOrder && !this.zOrder.format(armature)) {
            this.zOrder = null;
        }

        return false;
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
    readonly slot: Map<number[]> = {};
}

export abstract class Timeline {
    scale: number = 1.0;
    offset: number = 0.0;
    name: string = "";

    abstract format(armature: Armature): boolean;
}

export class ZOrderTimeline extends Timeline {
    readonly frame: ZOrderFrame[] = [];

    format(armature: Armature): boolean {
        armature;
        cleanFrame(this.frame);

        return this.frame.length > 0;
    }
}

export class BoneTimeline extends Timeline {
    readonly frame: BoneAllFrame[] = []; // Deprecated.
    readonly translateFrame: BoneTranslateFrame[] = [];
    readonly rotateFrame: BoneRotateFrame[] = [];
    readonly scaleFrame: BoneScaleFrame[] = [];

    format(armature: Armature): boolean {
        const bone = armature.getBone(this.name);
        if (!bone) {
            this.frame.length = 0;
            this.translateFrame.length = 0;
            this.rotateFrame.length = 0;
            this.scaleFrame.length = 0;

            return false;
        }

        cleanFrame(this.frame);
        cleanFrame(this.translateFrame);
        cleanFrame(this.rotateFrame);
        cleanFrame(this.scaleFrame);

        if (this.frame.length === 1) {
            const frame = this.frame[0];
            if (
                frame.transform.x === 0.0 &&
                frame.transform.y === 0.0 &&
                frame.transform.skX === 0.0 &&
                frame.transform.skY === 0.0 &&
                frame.transform.scX === 1.0 &&
                frame.transform.scY === 1.0
            ) {
                this.frame.length = 0;
            }
        }

        if (this.translateFrame.length === 1) {
            const frame = this.translateFrame[0];
            if (frame.x === 0.0 && frame.y === 0.0) {
                this.translateFrame.length = 0;
            }
        }

        if (this.rotateFrame.length === 1) {
            const frame = this.rotateFrame[0];
            if (frame.rotate === 0.0 && frame.skew === 0.0) {
                this.rotateFrame.length = 0;
            }
        }

        if (this.scaleFrame.length === 1) {
            const frame = this.scaleFrame[0];
            if (frame.x === 1.0 && frame.y === 1.0) {
                this.scaleFrame.length = 0;
            }
        }

        return this.frame.length > 0 || this.translateFrame.length > 0 || this.rotateFrame.length > 0 || this.scaleFrame.length > 0;
    }
}

export class SlotTimeline extends Timeline {
    readonly frame: SlotAllFrame[] = []; // Deprecated.
    readonly displayFrame: SlotDisplayFrame[] = [];
    readonly colorFrame: SlotColorFrame[] = [];

    format(armature: Armature): boolean {
        const slot = armature.getSlot(this.name);
        if (!slot) {
            this.frame.length = 0;
            this.displayFrame.length = 0;
            this.colorFrame.length = 0;

            return false;
        }

        cleanFrame(this.frame);
        cleanFrame(this.displayFrame);
        cleanFrame(this.colorFrame);

        if (this.frame.length === 1) {
            const frame = this.frame[0];
            if (
                frame.displayIndex === slot.displayIndex &&
                frame.color.equal(slot.color)
            ) {
                this.frame.length = 0;
            }
        }

        if (this.displayFrame.length === 1) {
            const frame = this.displayFrame[0];
            if (frame.value === slot.displayIndex) {
                this.displayFrame.length = 0;
            }
        }

        if (this.colorFrame.length === 1) {
            const frame = this.colorFrame[0];
            if (frame.value.equal(slot.color)) {
                this.colorFrame.length = 0;
            }
        }

        return this.frame.length > 0 || this.displayFrame.length > 0 || this.colorFrame.length > 0;
    }
}

export class FFDTimeline extends Timeline {
    skin: string = "";
    slot: string = "";
    readonly frame: FFDFrame[] = [];

    format(armature: Armature): boolean {
        this.skin = this.skin || "default";

        const slot = armature.getSlot(this.slot);
        const mesh = armature.getMesh(this.skin, this.slot, this.name);
        if (!slot || !mesh) {
            this.frame.length = 0;

            return false;
        }

        cleanFrame(this.frame);

        if (this.frame.length === 1) {
            const frame = this.frame[0];
            if (frame.vertices.length === 0) {
                this.frame.length = 0;
            }
        }

        return this.frame.length > 0;
    }
}

export abstract class Frame {
    duration: number = 1;
    abstract equal(value: this): boolean;
}

export abstract class TweenFrame extends Frame {
    tweenEasing: number = NaN;
    curve: number[] = [];

    removeTween(): void {
        this.tweenEasing = NaN;
        this.curve.length = 0;
    }

    formatTween(): void {
        if (this.curve.length > 0) {
            this.tweenEasing = NaN;
        }
    }

    getTweenEnabled(): boolean {
        return !isNaN(this.tweenEasing) || this.curve.length > 0;
    }
}

export class ActionFrame extends Frame {
    action: string = ""; // Deprecated.
    event: string = ""; // Deprecated.
    sound: string = ""; // Deprecated.
    readonly events: Action[] = []; // Deprecated.
    readonly actions: Action[] = [];

    equal(value: this): boolean {
        value;
        return false;
    }
}

export class ZOrderFrame extends Frame {
    readonly zOrder: number[] = [];

    equal(value: this): boolean {
        if (this.zOrder.length === this.zOrder.length) {
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
}

export class BoneScaleFrame extends TweenFrame {
    x: number = 0.0;
    y: number = 0.0;

    equal(value: this): boolean {
        return this.x === value.x && this.y === value.y;
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

    equal(value: this): boolean {
        return this.value.equal(value.value);
    }
}

export class FFDFrame extends TweenFrame {
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

export class TextureAtlas {
    width: number = 0;
    height: number = 0;
    scale: number = 1.00;
    name: string = "";
    imagePath: string = "";
    readonly SubTexture: Texture[] = [];

    format(dragonBones: DragonBones): void {
        dragonBones;
        for (const subTexture of this.SubTexture) {
            subTexture.format(this);
        }
    }

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
    format(textureAtlas: TextureAtlas): void {
        textureAtlas;
    }
}

export class OldAction {
    gotoAndPlay: string = "";
}

export const copyConfig = [
    DragonBones, {
        armature: Armature,
        textureAtlas: TextureAtlas,
        userData: UserData
    },
    Armature, {
        bone: Bone,
        slot: Slot,
        ik: IKConstraint,
        skin: Skin,
        animation: Animation,
        defaultActions: OldAction,
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
        display: function (display: any): { new (): Display } | null {
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
        }
    },
    ArmatureDisplay, {
        actions: Action
    },
    Animation, {
        frame: ActionFrame,
        zOrder: ZOrderTimeline,
        bone: BoneTimeline,
        slot: SlotTimeline,
        ffd: FFDTimeline
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
    SlotTimeline, {
        frame: SlotAllFrame,
        displayFrame: SlotDisplayFrame,
        colorFrame: SlotColorFrame,
    },
    FFDTimeline, {
        frame: FFDFrame
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
    new Action(),
    new Armature(),
    new Bone(),
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
    new SlotTimeline(),
    new FFDTimeline(),
    new ActionFrame(),
    new ZOrderFrame(),
    new BoneAllFrame(),
    new BoneTranslateFrame(),
    new BoneRotateFrame(),
    new BoneScaleFrame(),
    new SlotAllFrame(),
    new SlotDisplayFrame(),
    new SlotColorFrame(),
    new FFDFrame(),

    new TextureAtlas(),
    new Texture()
];