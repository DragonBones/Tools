import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";

export default function (data: dbft.DragonBones | null, textureAtlases: dbft.TextureAtlas[] | null = null): void {
    if (data) {

        for (const armature of data.armature) {
            if (armature.bone.length === 0) {
                armature.slot.length = 0;
                armature.ik.length = 0;
                armature.skin.length = 0;
                armature.animation.length = 0;
                armature.defaultActions.length = 0;
                armature.actions.length = 0;

                return;
            }

            // if (typeof this.type === "string") { // LowerCase bug. (If fix the bug, some third-party plugins may go wrong)
            //     this.type = this.type.toLowerCase();
            // }
            armature.aabb.toFixed();

            for (const bone of armature.bone) {
                if (bone.parent && !armature.getBone(bone.parent)) {
                    bone.parent = "";
                }

                bone.transform.skX = geom.normalizeDegree(bone.transform.skX);
                bone.transform.skY = geom.normalizeDegree(bone.transform.skY);
                if (bone.transform.scX === 0.0) {
                    bone.transform.scX = 0.0001;
                }

                if (bone.transform.scY === 0.0) {
                    bone.transform.scY = 0.0001;
                }

                bone.transform.toFixed();
            }

            for (const slot of armature.slot) {
                if (!slot.parent || !armature.getBone(slot.parent)) {
                    slot.parent = armature.bone[0].name;
                }

                slot.color.toFixed();
            }

            for (const ikConstraint of armature.ik) {
                if (!ikConstraint.target || !ikConstraint.bone) {
                    // TODO
                }

                // TODO check recurrence

                ikConstraint.weight = Number(ikConstraint.weight.toFixed(2));
            }

            armature.sortBones();

            for (const skin of armature.skin) {
                skin.name = skin.name || "default";

                for (const skinSlot of skin.slot) {
                    if (!armature.getSlot(skinSlot.name)) {
                        skinSlot.display.length = 0;
                        continue;
                    }

                    for (const display of skinSlot.display) {
                        display.transform.skX = geom.normalizeDegree(display.transform.skX);
                        display.transform.skY = geom.normalizeDegree(display.transform.skY);
                        display.transform.toFixed();

                        if (
                            display instanceof dbft.ImageDisplay ||
                            display instanceof dbft.MeshDisplay ||
                            display instanceof dbft.SharedMeshDisplay ||
                            display instanceof dbft.ArmatureDisplay
                        ) {
                            if (display.path === display.name) {
                                display.path = "";
                            }
                        }

                        if (display instanceof dbft.MeshDisplay) {
                            for (let i = 0, l = display.vertices.length; i < l; ++i) {
                                display.vertices[i] = Number(display.vertices[i].toFixed(2));
                            }

                            for (let i = 0, l = display.uvs.length; i < l; ++i) {
                                display.uvs[i] = Number(display.uvs[i].toFixed(4));
                            }

                            for (let i = 0, l = display.weights.length; i < l; ++i) {
                                display.weights[i] = Number(display.weights[i].toFixed(4));
                            }

                            for (let i = 0, l = display.bonePose.length; i < l; ++i) {
                                display.bonePose[i] = Number(display.bonePose[i].toFixed(6));
                            }
                        }

                        if (
                            display instanceof dbft.RectangleBoundingBoxDisplay ||
                            display instanceof dbft.EllipseBoundingBoxDisplay
                        ) {
                            display.width = Number(display.width.toFixed(2));
                            display.height = Number(display.height.toFixed(2));
                        }

                        if (display instanceof dbft.PolygonBoundingBoxDisplay) {
                            for (let i = 0, l = display.vertices.length; i < l; ++i) {
                                display.vertices[i] = Number(display.vertices[i].toFixed(2));
                            }
                        }
                    }
                }
            }

            for (const animation of armature.animation) {
                if (!(animation instanceof dbft.Animation)) {
                    continue;
                }

                for (const timeline of animation.bone) {
                    for (const frame of timeline.frame) {
                        frame.transform.skX = Number(geom.normalizeDegree(frame.transform.skX).toFixed(2));
                        frame.transform.skY = Number(geom.normalizeDegree(frame.transform.skY).toFixed(2));
                        frame.transform.toFixed();
                    }

                    for (const frame of timeline.translateFrame) {
                        frame.x = Number(frame.x.toFixed(2));
                        frame.y = Number(frame.y.toFixed(2));
                    }

                    for (const frame of timeline.rotateFrame) {
                        frame.rotate = Number(geom.normalizeDegree(frame.rotate).toFixed(2));
                        frame.skew = Number(geom.normalizeDegree(frame.skew).toFixed(2));
                    }

                    for (const frame of timeline.scaleFrame) {
                        frame.x = Number(frame.x.toFixed(2));
                        frame.y = Number(frame.y.toFixed(2));
                    }
                }

                for (const timeline of animation.slot) {
                    for (const frame of timeline.frame) {
                        frame.color.toFixed();
                    }

                    for (const frame of timeline.colorFrame) {
                        frame.value.toFixed();
                    }
                }

                for (const timeline of animation.ffd) {
                    for (const frame of timeline.frame) {
                        for (let i = 0, l = frame.vertices.length; i < l; ++i) {
                            frame.vertices[i] = Number(frame.vertices[i].toFixed(2));
                        }

                        let begin = 0;
                        while (frame.vertices[begin] === 0.0) {
                            begin++;
                            if (begin === frame.vertices.length - 1) {
                                break;
                            }
                        }

                        let end = frame.vertices.length - 1;
                        while (end > begin && frame.vertices[end] === 0.0) {
                            end--;
                        }

                        let index = 0;
                        for (let i = begin; i < end + 1; ++i) {
                            frame.vertices[index++] = frame.vertices[i];
                        }

                        frame.offset += begin;
                        frame.vertices.length = end - begin + 1;
                    }
                }

                for (let i = 0, l = animation.bone.length; i < l; ++i) {
                    const timeline = animation.bone[i];
                    const bone = armature.getBone(timeline.name);
                    if (bone) {
                        cleanFrame(timeline.frame);
                        cleanFrame(timeline.translateFrame);
                        cleanFrame(timeline.rotateFrame);
                        cleanFrame(timeline.scaleFrame);

                        if (timeline.frame.length === 1) {
                            const frame = timeline.frame[0];
                            if (
                                frame.transform.x === 0.0 &&
                                frame.transform.y === 0.0 &&
                                frame.transform.skX === 0.0 &&
                                frame.transform.skY === 0.0 &&
                                frame.transform.scX === 1.0 &&
                                frame.transform.scY === 1.0
                            ) {
                                timeline.frame.length = 0;
                            }
                        }

                        if (timeline.translateFrame.length === 1) {
                            const frame = timeline.translateFrame[0];
                            if (frame.x === 0.0 && frame.y === 0.0) {
                                timeline.translateFrame.length = 0;
                            }
                        }

                        if (timeline.rotateFrame.length === 1) {
                            const frame = timeline.rotateFrame[0];
                            if (frame.rotate === 0.0 && frame.skew === 0.0) {
                                timeline.rotateFrame.length = 0;
                            }
                        }

                        if (timeline.scaleFrame.length === 1) {
                            const frame = timeline.scaleFrame[0];
                            if (frame.x === 1.0 && frame.y === 1.0) {
                                timeline.scaleFrame.length = 0;
                            }
                        }

                        if (timeline.frame.length > 0 || timeline.translateFrame.length > 0 || timeline.rotateFrame.length > 0 || timeline.scaleFrame.length > 0) {
                            continue;
                        }
                    }

                    animation.bone.splice(i, 1);
                    i--;
                    l--;
                }

                for (let i = 0, l = animation.slot.length; i < l; ++i) {
                    const timeline = animation.slot[i];
                    const slot = armature.getSlot(timeline.name);
                    if (slot) {
                        cleanFrame(timeline.frame);
                        cleanFrame(timeline.displayFrame);
                        cleanFrame(timeline.colorFrame);

                        if (timeline.frame.length === 1) {
                            const frame = timeline.frame[0];
                            if (
                                frame.displayIndex === slot.displayIndex &&
                                frame.color.equal(slot.color)
                            ) {
                                timeline.frame.length = 0;
                            }
                        }

                        if (timeline.displayFrame.length === 1) {
                            const frame = timeline.displayFrame[0];
                            if (frame.value === slot.displayIndex) {
                                timeline.displayFrame.length = 0;
                            }
                        }

                        if (timeline.colorFrame.length === 1) {
                            const frame = timeline.colorFrame[0];
                            if (frame.value.equal(slot.color)) {
                                timeline.colorFrame.length = 0;
                            }
                        }

                        if (timeline.frame.length > 0 || timeline.displayFrame.length > 0 || timeline.colorFrame.length > 0) {
                            continue;
                        }
                    }

                    animation.slot.splice(i, 1);
                    i--;
                    l--;
                }

                for (let i = 0, l = animation.ffd.length; i < l; ++i) {
                    const timeline = animation.ffd[i];
                    const slot = armature.getSlot(timeline.name);
                    const mesh = armature.getMesh(timeline.skin = timeline.skin || "default", timeline.slot, timeline.name);
                    if (slot && mesh) {
                        cleanFrame(timeline.frame);

                        if (timeline.frame.length === 1) {
                            const frame = timeline.frame[0];
                            if (frame.vertices.length === 0) {
                                timeline.frame.length = 0;
                            }
                        }

                        if (timeline.frame.length > 0) {
                            continue;
                        }
                    }

                    animation.ffd.splice(i, 1);
                    i--;
                    l--;
                }

                if (animation.zOrder) {
                    cleanFrame(animation.zOrder.frame);

                    if (animation.zOrder.frame.length === 0) {
                        animation.zOrder = null;
                    }
                }
            }
        }

        for (const textureAtlas of data.textureAtlas) {
            formatTextureAtlas(textureAtlas);
        }
    }

    if (textureAtlases) {
        for (const textureAtlas of textureAtlases) {
            formatTextureAtlas(textureAtlas);
        }
    }
}

function formatTextureAtlas(textureAtlas: dbft.TextureAtlas): void {
    for (const subTexture of textureAtlas.SubTexture) {
        if (textureAtlas.width > 0 && subTexture.x + subTexture.width > textureAtlas.width) {
            subTexture.width = textureAtlas.width - subTexture.x;
        }

        if (textureAtlas.height > 0 && subTexture.y + subTexture.height > textureAtlas.height) {
            subTexture.height = textureAtlas.height - subTexture.x;
        }

        if (subTexture.x < 0) {
            subTexture.x = 0;
        }

        if (subTexture.y < 0) {
            subTexture.y = 0;
        }

        if (subTexture.width < 0) {
            subTexture.width = 0;
        }

        if (subTexture.height < 0) {
            subTexture.height = 0;
        }

        if (
            (subTexture.frameWidth === subTexture.width && subTexture.frameHeight === subTexture.height) ||
            (subTexture.frameWidth === subTexture.height && subTexture.frameHeight === subTexture.width)
        ) {
            subTexture.frameWidth = 0;
            subTexture.frameHeight = 0;
        }

        if (subTexture.frameWidth < 0) {
            subTexture.frameWidth = 0;
        }

        if (subTexture.frameHeight < 0) {
            subTexture.frameHeight = 0;
        }
    }
}

function cleanFrame(frames: dbft.Frame[]): void {
    let prevFrame: dbft.Frame | null = null;

    for (let i = 0, l = frames.length; i < l; ++i) {
        const frame = frames[i];

        if (
            prevFrame && prevFrame.equal(frame) &&
            (i === l - 1 || !(frame instanceof dbft.TweenFrame) || frame.equal(frames[i + 1] as dbft.TweenFrame))
        ) {
            prevFrame.duration += frame.duration;

            if (i === l - 1 && prevFrame instanceof dbft.TweenFrame) {
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