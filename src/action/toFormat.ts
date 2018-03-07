import * as utils from "../common/utils";
import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";
import * as dbftV23 from "../format/dragonBonesFormatV23";
/**
 * Convert json string to DragonBones format.
 */
export default function (jsonString: string, getTextureAtlases: () => dbft.TextureAtlas[]): dbft.DragonBones | null {
    if (!dbft.isDragonBonesString(jsonString)) {
        return null;
    }

    try {
        const json = JSON.parse(jsonString);
        const version = json["version"];

        if (dbft.DATA_VERSIONS.indexOf(version) < dbft.DATA_VERSIONS.indexOf(dbft.DATA_VERSION_4_0)) {
            textureAtlases = getTextureAtlases();
            const data = new dbftV23.DragonBones();
            utils.copyFromObject(data, json, dbftV23.copyConfig);

            return V23ToV45(data);
        }

        const result = new dbft.DragonBones();
        utils.copyFromObject(result, json, dbft.copyConfig);

        return result;
    }
    catch (error) {
    }

    return null;
}

let textureAtlases: dbft.TextureAtlas[];
const helpMatrix = new geom.Matrix();
const helpTransform = new geom.Transform();
const helpPoint = new geom.Point();
/**
 * Convert v2 v3 to v4 v5.
 */
function V23ToV45(data: dbftV23.DragonBones): dbft.DragonBones | null {
    const result = new dbft.DragonBones();

    result.frameRate = result.frameRate;
    result.name = data.name;
    result.version = dbft.DATA_VERSION_4_5;
    result.compatibleVersion = dbft.DATA_VERSION_4_0;

    for (const armatureV23 of data.armature) {
        const armature = new dbft.Armature();
        armature.name = armatureV23.name;
        result.armature.push(armature);

        for (const boneV23 of armatureV23.bone) {
            const bone = new dbft.Bone();
            bone.inheritScale = false;
            // bone.inheritReflection = false;
            bone.name = boneV23.name;
            bone.parent = boneV23.parent;
            bone.transform.copyFrom(boneV23.transform);
            armature.bone.push(bone);
        }

        for (const skinV23 of armatureV23.skin) {
            const skin = new dbft.Skin();
            skin.name = skinV23.name;
            armature.skin.push(skin);
            skinV23.slot.sort(sortSkinSlot);

            for (const slotV23 of skinV23.slot) {
                let slot = armature.getSlot(slotV23.name);
                if (!slot) {
                    slot = new dbft.Slot();
                    slot.blendMode = slotV23.blendMode || dbft.BlendMode[dbft.BlendMode.Normal].toLowerCase();
                    slot.displayIndex = slotV23.displayIndex;
                    slot.name = slotV23.name;
                    slot.parent = slotV23.parent;
                    slot.color.copyFrom(slotV23.colorTransform);
                    armature.slot.push(slot);
                }

                const skinSlot = new dbft.SkinSlot();
                skinSlot.name = slotV23.name;
                skin.slot.push(skinSlot);

                for (const displayV23 of slotV23.display) {
                    if (displayV23.type === dbft.DisplayType[dbft.DisplayType.Image].toLowerCase()) {
                        const display = new dbft.ImageDisplay();
                        display.name = displayV23.name;
                        display.transform.copyFrom(displayV23.transform);
                        display.transform.pX = 0.0;
                        display.transform.pY = 0.0;

                        const texture = dbft.getTextureFormTextureAtlases(display.name, textureAtlases);
                        if (texture) {
                            display.transform.x += 0.5 * texture.width - displayV23.transform.pX;
                            display.transform.y += 0.5 * texture.height - displayV23.transform.pY;
                        }

                        skinSlot.display.push(display);
                    }
                    else {
                        const display = new dbft.ArmatureDisplay();
                        display.name = displayV23.name;
                        display.transform.copyFrom(displayV23.transform);
                        skinSlot.display.push(display);
                    }
                }
            }
        }

        for (const animationV23 of armatureV23.animation) {
            const animation = new dbft.Animation();
            animation.duration = animationV23.duration;
            animation.playTimes = animationV23.loop;
            animation.scale = animationV23.scale;
            animation.fadeInTime = animationV23.fadeInTime;
            animation.name = animationV23.name;
            (armature.animation as dbft.Animation[]).push(animation);

            for (const frameV23 of animationV23.frame) {
                const frame = new dbft.ActionFrame();
                frame.duration = frameV23.duration;
                frame.action = frameV23.action;
                frame.event = frameV23.event;
                frame.sound = frameV23.sound;
                animation.frame.push(frame);
            }

            for (const timelineV23 of animationV23.timeline) {
                const bone = armature.getBone(timelineV23.name);
                const slot = armature.getSlot(timelineV23.name);
                const boneAllTimeline = new dbft.BoneTimeline();
                const slotAllTimeline = new dbft.SlotTimeline();
                boneAllTimeline.scale = slotAllTimeline.scale = timelineV23.scale;
                boneAllTimeline.offset = slotAllTimeline.offset = timelineV23.offset;
                boneAllTimeline.name = slotAllTimeline.name = timelineV23.name;
                animation.bone.push(boneAllTimeline);
                animation.slot.push(slotAllTimeline);

                let position = 0;
                let prevBoneFrame: dbft.BoneAllFrame | null = null;
                let prevSlotFrame: dbft.SlotAllFrame | null = null;
                for (const frameV23 of timelineV23.frame) {
                    const boneAllFrame = new dbft.BoneAllFrame();
                    const slotAllFrame = new dbft.SlotAllFrame();

                    boneAllFrame.duration = frameV23.duration;
                    if (frameV23.tweenEasing === null) {
                        if (animationV23.autoTween) {
                            if (animationV23.tweenEasing === null) {
                                boneAllFrame.tweenEasing = 0;
                                slotAllFrame.tweenEasing = 0;
                            }
                            else {
                                boneAllFrame.tweenEasing = animationV23.tweenEasing;
                                slotAllFrame.tweenEasing = animationV23.tweenEasing;
                            }
                        }
                        else {
                            boneAllFrame.tweenEasing = NaN;
                            slotAllFrame.tweenEasing = NaN;
                        }
                    }
                    else {
                        boneAllFrame.tweenEasing = frameV23.tweenEasing;
                        slotAllFrame.tweenEasing = frameV23.tweenEasing;
                    }

                    boneAllFrame.curve = frameV23.curve;
                    boneAllFrame.tweenRotate = frameV23.tweenRotate;
                    boneAllFrame.transform.copyFrom(frameV23.transform);
                    slotAllFrame.duration = frameV23.duration;
                    slotAllFrame.curve = frameV23.curve;
                    slotAllFrame.displayIndex = frameV23.displayIndex;
                    slotAllFrame.color.copyFrom(frameV23.colorTransform);
                    boneAllTimeline.frame.push(boneAllFrame);
                    slotAllTimeline.frame.push(slotAllFrame);

                    if (prevBoneFrame && prevSlotFrame && frameV23.displayIndex < 0) {
                        prevBoneFrame.removeTween();
                        prevSlotFrame.removeTween();
                    }

                    boneAllFrame.transform.toMatrix(helpMatrix);
                    helpMatrix.transformPoint(frameV23.transform.pX, frameV23.transform.pY, helpPoint, true);
                    boneAllFrame.transform.x += helpPoint.x;
                    boneAllFrame.transform.y += helpPoint.y;

                    if (frameV23.hide) {
                        slotAllFrame.displayIndex = -1;
                    }

                    if (frameV23.action) {
                        const action = new dbft.Action();
                        action.type = dbft.ActionType.Play;
                        action.name = frameV23.action;
                        slotAllFrame.actions.push(action);
                    }

                    if (frameV23.event || frameV23.sound) {
                        dbft.mergeActionToAnimation(animation, frameV23, position, bone, slot, true);
                    }

                    position += frameV23.duration;
                    prevBoneFrame = boneAllFrame;
                    prevSlotFrame = slotAllFrame;
                }
            }

            for (const slot of armature.slot) {
                let timeline = animation.getSlotTimeline(slot.name);
                if (timeline === null) {
                    const frame = new dbft.SlotAllFrame();
                    frame.displayIndex = -1;
                    timeline = new dbft.SlotTimeline();
                    timeline.name = slot.name;
                    timeline.frame.push(frame);
                    animation.slot.push(timeline);
                }
            }
        }

        if (data.isGlobal) {
            armature.sortBones();
            globalToLocal(armature);
        }
    }

    return result;
}

function sortSkinSlot(a: dbftV23.Slot, b: dbftV23.Slot): number {
    return a.z < b.z ? -1 : 1;
}

function globalToLocal(armature: dbft.Armature): void {
    const bones = armature.bone.concat().reverse();
    for (const bone of bones) {
        const parent = armature.getBone(bone.parent);
        if (parent !== null) {
            parent.transform.toMatrix(helpMatrix);
            helpMatrix.invert();
            helpMatrix.transformPoint(bone.transform.x, bone.transform.y, helpPoint);
            bone.transform.x = helpPoint.x;
            bone.transform.y = helpPoint.y;
            bone.transform.skX -= parent.transform.skY;
            bone.transform.skY -= parent.transform.skY;
        }
        else {
            bone.parent = "";
        }

        for (const animation of armature.animation as dbft.Animation[]) {
            const timeline = animation.getBoneTimeline(bone.name);
            if (timeline === null) {
                continue;
            }

            const parentTimeline = parent !== null ? animation.getBoneTimeline(parent.name) : null;
            let position = 0;
            for (const frame of timeline.frame) {
                if (parentTimeline !== null) {
                    getTimelineFrameMatrix(parentTimeline, position, helpTransform);
                    helpTransform.toMatrix(helpMatrix);
                    helpMatrix.invert();
                    helpMatrix.transformPoint(frame.transform.x, frame.transform.y, helpPoint);

                    frame.transform.x = helpPoint.x;
                    frame.transform.y = helpPoint.y;
                    frame.transform.skX -= helpTransform.skY;
                    frame.transform.skY -= helpTransform.skY;
                }

                frame.transform.x -= bone.transform.x;
                frame.transform.y -= bone.transform.y;
                frame.transform.skX = geom.normalizeDegree(frame.transform.skX - bone.transform.skY);
                frame.transform.skY = geom.normalizeDegree(frame.transform.skY - bone.transform.skY);
                frame.transform.scX /= bone.transform.scX;
                frame.transform.scY /= bone.transform.scY;

                position += frame.duration;
            }
        }
    }
}

function getTimelineFrameMatrix(timeline: dbft.BoneTimeline, framePosition: number, transform: geom.Transform): void {
    let position = 0;
    let currentFrame: dbft.BoneAllFrame | null = null;
    let nextFrame: dbft.BoneAllFrame | null = null;
    for (const frame of timeline.frame) {
        if (position <= framePosition && framePosition < position + frame.duration) {
            currentFrame = frame;
            break;
        }

        position += frame.duration;
    }

    if (currentFrame === null) {
        currentFrame = timeline.frame[timeline.frame.length - 1];
    }

    if ((!isNaN(currentFrame.tweenEasing) || currentFrame.curve.length > 0) && timeline.frame.length > 1) {
        let nextIndex = timeline.frame.indexOf(currentFrame) + 1;
        if (nextIndex >= timeline.frame.length) {
            nextIndex = 0;
        }

        nextFrame = timeline.frame[nextIndex];
    }

    if (nextFrame === null) {
        transform.copyFrom(currentFrame.transform);
    }
    else {
        let tweenProgress = currentFrame.getTweenProgress((framePosition - position) / currentFrame.duration);
        transform.x = nextFrame.transform.x - currentFrame.transform.x;
        transform.y = nextFrame.transform.y - currentFrame.transform.y;
        transform.skX = geom.normalizeRadian(nextFrame.transform.skX - currentFrame.transform.skX);
        transform.skY = geom.normalizeRadian(nextFrame.transform.skY - currentFrame.transform.skY);
        transform.scX = nextFrame.transform.scX - currentFrame.transform.scX;
        transform.scY = nextFrame.transform.scY - currentFrame.transform.scY;

        transform.x = currentFrame.transform.x + transform.x * tweenProgress;
        transform.y = currentFrame.transform.y + transform.y * tweenProgress;
        transform.skX = currentFrame.transform.skX + transform.skX * tweenProgress;
        transform.skY = currentFrame.transform.skY + transform.skY * tweenProgress;
        transform.scX = currentFrame.transform.scX + transform.scX * tweenProgress;
        transform.scY = currentFrame.transform.scY + transform.scY * tweenProgress;
    }
}