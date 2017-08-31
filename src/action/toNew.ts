import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";

export default function (data: dbft.DragonBones, forRuntime: boolean): dbft.DragonBones {
    data.version = dbft.DATA_VERSION_5_1;
    data.compatibleVersion = dbft.DATA_VERSION_5_1;

    for (const armature of data.armature) {
        if (forRuntime) { // Old action to new action.
            if (armature.defaultActions.length > 0) {
                for (let i = 0, l = armature.defaultActions.length; i < l; ++i) {
                    const action = armature.defaultActions[i];
                    if (action instanceof dbft.OldAction) {
                        armature.defaultActions[i] = dbft.oldActionToNewAction(action);
                    }
                }
            }
        }

        if (forRuntime) { // Old action to new action and move action to display.
            for (const slot of armature.slot) {
                if (slot.actions.length > 0) {
                    const defaultSkin = armature.getSkin("default");
                    if (defaultSkin) {
                        const skinSlot = defaultSkin.getSlot(slot.name);
                        if (skinSlot !== null && skinSlot instanceof dbft.SkinSlot) {
                            for (const action of slot.actions) {
                                if (action instanceof dbft.OldAction) {
                                    for (const display of skinSlot.display) {
                                        if (display instanceof dbft.ArmatureDisplay) {
                                            display.actions.push(dbft.oldActionToNewAction(action));
                                        }
                                    }
                                }
                            }
                        }
                    }

                    slot.actions.length = 0;
                }
            }
        }

        for (const animation of armature.animation as dbft.Animation[]) {
            if (forRuntime) { // Old animation frame to new animation frame.
                for (const frame of animation.frame) {
                    if (frame.event) {
                        const action = new dbft.Action();
                        action.type = dbft.ActionType.Frame;
                        action.name = frame.event;
                        frame.actions.push(action);
                        frame.event = "";
                    }

                    if (frame.sound) {
                        const action = new dbft.Action();
                        action.type = dbft.ActionType.Sound;
                        action.name = frame.sound;
                        frame.actions.push(action);
                        frame.sound = "";
                    }

                    if (frame.action) {
                        const action = new dbft.Action();
                        action.type = dbft.ActionType.Play;
                        action.name = frame.action;
                        frame.actions.push(action);
                        frame.action = "";
                    }

                    for (const event of frame.events) {
                        event.type = dbft.ActionType.Frame;
                        frame.actions.push(event);
                    }

                    frame.events.length = 0;
                }
            }

            for (const timeline of animation.bone) {
                const bone = armature.getBone(timeline.name);
                if (!bone) {
                    continue;
                }

                let position = 0;
                const slot = armature.getSlot(timeline.name);
                for (let j = 0, lJ = timeline.frame.length; j < lJ; ++j) {
                    const frame = timeline.frame[j];
                    const translateFrame = new dbft.BoneTranslateFrame();
                    const rotateFrame = new dbft.BoneRotateFrame();
                    const scaleFrame = new dbft.BoneScaleFrame();
                    timeline.translateFrame.push(translateFrame);
                    timeline.rotateFrame.push(rotateFrame);
                    timeline.scaleFrame.push(scaleFrame);

                    translateFrame.duration = frame.duration;
                    rotateFrame.duration = frame.duration;
                    scaleFrame.duration = frame.duration;

                    translateFrame.tweenEasing = frame.tweenEasing;
                    translateFrame.curve = frame.curve.concat();
                    rotateFrame.tweenEasing = frame.tweenEasing;
                    rotateFrame.curve = frame.curve.concat();
                    scaleFrame.tweenEasing = frame.tweenEasing;
                    scaleFrame.curve = frame.curve.concat();

                    translateFrame.x = frame.transform.x;
                    translateFrame.y = frame.transform.y;
                    rotateFrame.clockwise = frame.tweenRotate;
                    rotateFrame.rotate = geom.normalizeDegree(frame.transform.skY);
                    rotateFrame.skew = geom.normalizeDegree(frame.transform.skX) - rotateFrame.rotate;
                    scaleFrame.x = frame.transform.scX;
                    scaleFrame.y = frame.transform.scY;

                    if (frame.action && !slot) {
                        frame.action = "";
                    }

                    if (frame.event || frame.sound || frame.action) {
                        dbft.mergeActionToAnimation(animation, frame, position, bone, slot, forRuntime);
                        frame.event = "";
                        frame.sound = "";
                        frame.action = "";
                    }

                    position += frame.duration;
                }

                timeline.frame.length = 0;
            }

            for (const timeline of animation.slot) {
                const slot = armature.getSlot(timeline.name);
                if (!slot) {
                    continue;
                }

                let position = 0;
                for (let j = 0, lJ = timeline.frame.length; j < lJ; ++j) {
                    const frame = timeline.frame[j];
                    const displayFrame = new dbft.SlotDisplayFrame();
                    const colorFrame = new dbft.SlotColorFrame();
                    timeline.displayFrame.push(displayFrame);
                    timeline.colorFrame.push(colorFrame);

                    displayFrame.duration = frame.duration;
                    colorFrame.duration = frame.duration;

                    colorFrame.tweenEasing = frame.tweenEasing;
                    colorFrame.curve = frame.curve.concat();

                    displayFrame.value = frame.displayIndex;
                    colorFrame.value.copyFrom(frame.color);

                    if (frame.actions.length > 0) {
                        if (forRuntime) {
                            dbft.mergeActionToAnimation(animation, frame, position, null, slot, true);
                        }
                        else {
                            for (const action of frame.actions) {
                                displayFrame.actions.push(action);
                            }
                        }
                    }

                    position += frame.duration;
                }

                timeline.frame.length = 0;
            }
        }
    }

    return data;
}