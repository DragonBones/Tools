import * as dbft from "../format/dragonBonesFormat";

export default function (data: dbft.DragonBones): dbft.DragonBones {
    data.version = dbft.DATA_VERSION_4_5;
    data.compatibleVersion = dbft.DATA_VERSION_4_0;

    for (const armature of data.armature) {
        if (armature.defaultActions.length > 0) {
            for (let i = 0, l = armature.defaultActions.length; i < l; ++i) {
                const action = armature.defaultActions[i];
                if (action instanceof dbft.Action) {
                    const oldAction = new dbft.OldAction();
                    oldAction.gotoAndPlay = action.name;
                    armature.defaultActions[i] = oldAction;
                }
            }
        }

        // if (forRuntime) {
        //     for (const slot of armature.slot) {
        //         if (slot.actions.length > 0) {
        //             const defaultSkin = armature.getSkin("default");
        //             if (defaultSkin) {
        //                 const skinSlot = defaultSkin.getSlot(slot.name);
        //                 if (skinSlot !== null && skinSlot instanceof dbft.SkinSlot) {
        //                     for (const action of slot.actions) {
        //                         if (action instanceof dbft.OldAction) {
        //                             for (const display of skinSlot.display) {
        //                                 if (display instanceof dbft.ArmatureDisplay) {
        //                                     display.actions.push(dbft.oldActionToNewAction(action));
        //                                 }
        //                             }
        //                         }
        //                     }
        //                 }
        //             }

        //             slot.actions.length = 0;
        //         }
        //     }
        // }

        for (const animation of armature.animation as dbft.Animation[]) {
            for (const frame of animation.frame) {
                if (frame.events.length > 0) {
                    const events = [];
                    let i = frame.events.length;
                    while (i--) {
                        const action = frame.events[i];
                        switch (action.type) {
                            case dbft.ActionType.Play:
                                frame.action = action.name;
                                break;

                            case dbft.ActionType.Sound:
                                frame.sound = action.name;
                                break;

                            case dbft.ActionType.Frame:
                                if (frame.event) {
                                    events.push(action);
                                }
                                else {
                                    frame.event = action.name;
                                }
                                break;
                        }
                    }

                    frame.events.length = 0;
                    if (events.length > 0) {
                        for (const action of events) {
                            frame.events.push(action);
                        }
                    }
                }
                else {
                    let i = frame.actions.length;
                    while (i--) {
                        const action = frame.actions[i];
                        switch (action.type) {
                            case dbft.ActionType.Play:
                                frame.action = action.name;
                                break;

                            case dbft.ActionType.Sound:
                                frame.sound = action.name;
                                break;

                            case dbft.ActionType.Frame:
                                if (frame.event) {
                                    frame.events.push(action);
                                }
                                else {
                                    frame.event = action.name;
                                }
                                break;
                        }
                    }

                    frame.actions.length = 0;
                }
            }

            let position = 0;
            for (const timeline of animation.bone) {
                for (const rotateFrame of timeline.rotateFrame) {
                    const frame = new dbft.BoneAllFrame();
                    frame.duration = rotateFrame.duration;
                    frame.tweenEasing = rotateFrame.tweenEasing;
                    frame.curve = rotateFrame.curve;
                    frame.tweenRotate = rotateFrame.clockwise;
                    frame.transform.skX = rotateFrame.rotate + rotateFrame.skew;
                    frame.transform.skY = rotateFrame.rotate;
                    timeline.frame.push(frame);
                }

                if (timeline.frame.length === 0) {
                    const frame = new dbft.BoneAllFrame();
                    frame.duration = animation.duration;
                    timeline.frame.push(frame);
                }

                position = 0;
                for (const translateFrame of timeline.translateFrame) {
                    const index = timeline.insertFrame(timeline.frame, position);
                    if (index >= 0) {
                        for (let i = index; i < timeline.frame.length; ++i) {
                            const frame = timeline.frame[i];
                            frame.transform.x = translateFrame.x;
                            frame.transform.y = translateFrame.y;
                        }

                        const insertFrame = timeline.frame[index];
                        if (translateFrame.getTweenEnabled() && !insertFrame.getTweenEnabled()) {
                            insertFrame.tweenEasing = translateFrame.tweenEasing;
                            insertFrame.curve = translateFrame.curve;
                        }
                    }

                    position += translateFrame.duration;
                }

                position = 0;
                for (const scaleFrame of timeline.scaleFrame) {
                    const index = timeline.insertFrame(timeline.frame, position);
                    if (index >= 0) {
                        for (let i = index; i < timeline.frame.length; ++i) {
                            const frame = timeline.frame[i];
                            frame.transform.scX = scaleFrame.x;
                            frame.transform.scY = scaleFrame.y;
                        }

                        const insertFrame = timeline.frame[index];
                        if (scaleFrame.getTweenEnabled() && !insertFrame.getTweenEnabled()) {
                            insertFrame.tweenEasing = scaleFrame.tweenEasing;
                            insertFrame.curve = scaleFrame.curve;
                        }
                    }

                    position += scaleFrame.duration;
                }

                timeline.translateFrame.length = 0;
                timeline.rotateFrame.length = 0;
                timeline.scaleFrame.length = 0;
            }

            for (const timeline of animation.slot) {
                const slot = armature.getSlot(timeline.name);
                if (!slot) {
                    continue;
                }

                for (const colorFrame of timeline.colorFrame) {
                    const frame = new dbft.SlotAllFrame();
                    frame.duration = colorFrame.duration;
                    frame.tweenEasing = colorFrame.tweenEasing;
                    frame.curve = colorFrame.curve;
                    frame.color.copyFrom(colorFrame.value);
                    timeline.frame.push(frame);
                }

                if (timeline.frame.length === 0) {
                    const frame = new dbft.SlotAllFrame();
                    frame.duration = animation.duration;
                    frame.displayIndex = slot.displayIndex;
                    frame.color.copyFrom(slot.color);
                    timeline.frame.push(frame);
                }

                position = 0;
                for (const displayFrame of timeline.displayFrame) {
                    const index = timeline.insertFrame(timeline.frame, position);
                    if (index >= 0) {
                        for (let i = index; i < timeline.frame.length; ++i) {
                            const frame = timeline.frame[i];
                            frame.displayIndex = displayFrame.value;
                        }
                    }

                    position += displayFrame.duration;
                }

                timeline.displayFrame.length = 0;
                timeline.colorFrame.length = 0;
            }
        }
    }

    return data;
}