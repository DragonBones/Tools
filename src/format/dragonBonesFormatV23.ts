import * as utils from "../common/utils";
import { Transform, ColorTransform } from "./geom";
import * as dbft from "./dragonBonesFormat";
/**
 * DragonBones format v23.
 */
export class DragonBones {
    isGlobal: boolean = true;
    frameRate: number = 0;
    name: string = "";
    version: string = "";
    readonly armature: Armature[] = [];
}

export class Armature {
    name: string = "";
    readonly bone: Bone[] = [];
    readonly skin: Skin[] = [];
    readonly animation: Animation[] = [];

    getBone(name: string): Bone | null {
        for (const bone of this.bone) {
            if (bone.name === name) {
                return bone;
            }
        }

        return null;
    }
}

export class Bone {
    name: string = "";
    parent: string = "";
    readonly transform: Transform = new Transform();
}

export class Skin {
    name: string = "default";
    readonly slot: Slot[] = [];
}

export class Slot {
    blendMode: string = dbft.BlendMode[dbft.BlendMode.Normal].toLowerCase();
    z: number = 0;
    displayIndex: number = 0;
    name: string = "";
    parent: string = "";
    readonly colorTransform: ColorTransform = new ColorTransform();
    readonly display: Display[] = [];
}

export abstract class Display {
    type: string = dbft.DisplayType[dbft.DisplayType.Image].toLowerCase();
    name: string = "";
    readonly transform: Transform = new Transform();
}

export class ImageDisplay extends Display {
    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = dbft.DisplayType[dbft.DisplayType.Image].toLowerCase();
        }
    }
}

export class ArmatureDisplay extends Display {
    constructor(isDefault: boolean = false) {
        super();
        if (!isDefault) {
            this.type = dbft.DisplayType[dbft.DisplayType.Armature].toLowerCase();
        }
    }
}

export abstract class Timeline<T extends Frame> {
    scale: number = 1.0;
    offset: number = 0.0;
    name: string = "";
    readonly frame: T[] = [];
}

export class Animation {
    autoTween: boolean = true;
    tweenEasing: number | null = null;
    duration: number = 1;
    loop: number = 1;
    scale: number = 1.0;
    fadeInTime: number = 0.0;
    name: string = "default";
    readonly frame: AnimationFrame[] = [];
    readonly timeline: AllTimeline[] = [];
}

export class AllTimeline extends Timeline<AllFrame> {
}

export abstract class Frame {
    duration: number = 1;
}

export abstract class TweenFrame extends Frame {
    tweenEasing: number | null = null;
    readonly curve: number[] = [];
}

export class AnimationFrame extends Frame {
    action: string = "";
    event: string = "";
    sound: string = "";
}

export class AllFrame extends TweenFrame {
    hide: boolean = false;
    tweenRotate: number = 0;
    displayIndex: number = 0;
    action: string = "";
    event: string = "";
    sound: string = "";
    readonly transform: Transform = new Transform();
    readonly colorTransform: ColorTransform = new ColorTransform();
}

export const copyConfig = [
    DragonBones, {
        armature: Armature,
        textureAtlas: dbft.TextureAtlas
    },
    Armature, {
        bone: Bone,
        skin: Skin,
        animation: Animation
    },
    Bone, {
        transform: Transform
    },
    Slot, {
        display: [
            function (display: any): { new(): Display } | null {
                let type = display.type;
                if (type !== undefined) {
                    if (typeof type === "string") {
                        type = utils.getEnumFormString(dbft.DisplayType, type, dbft.DisplayType.Image);
                    }
                }
                else {
                    type = dbft.DisplayType.Image;
                }

                switch (type) {
                    case dbft.DisplayType.Image:
                        return ImageDisplay;

                    case dbft.DisplayType.Armature:
                        return ArmatureDisplay;
                }

                return null;
            },
            Function
        ]
    },
    Skin, {
        slot: Slot
    },
    Animation, {
        frame: AnimationFrame,
        timeline: AllTimeline
    },
    AllTimeline, {
        frame: AllFrame
    },
    AllFrame, {
        transform: Transform,
        colorTransform: ColorTransform
    },
    dbft.TextureAtlas, {
        SubTexture: dbft.Texture
    }
];