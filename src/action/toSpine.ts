// import { Map } from "../common/types";
import * as utils from "../common/utils";
import * as utilsFT from "../format/utils";
import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";
import * as spft from "../format/spineFormat";

type ResultType = { spines: spft.Spine[], textureAtlas: string };

export default function (data: dbft.DragonBones, version: string, addTextureAtlasSuffix: boolean): ResultType {
    const result: ResultType = { spines: [], textureAtlas: "" };

    for (const armature of data.armature) {
        const frameRate = armature.frameRate > 0 ? armature.frameRate : data.frameRate;
        const spine = new spft.Spine();
        spine.skeleton.width = armature.aabb.width;
        spine.skeleton.height = armature.aabb.height;
        spine.skeleton.fps = frameRate;
        spine.skeleton.spine = version;
        spine.skeleton.hash = " ";
        spine.skeleton.name = armature.name;
        result.spines.push(spine);

        for (const bone of armature.bone) {
            const spBone = new spft.Bone();
            spBone.inheritRotation = bone.inheritRotation;
            spBone.inheritScale = bone.inheritScale;
            spBone.length = bone.length;
            spBone.x = bone.transform.x;
            spBone.y = -bone.transform.y;
            spBone.rotation = -bone.transform.skY;
            spBone.shearX = 0.0;
            spBone.shearY = -(bone.transform.skX - bone.transform.skY);
            spBone.scaleX = bone.transform.scX;
            spBone.scaleY = bone.transform.scY;
            spBone.name = bone.name;
            spBone.parent = bone.parent;
            // spBone.transform; // TODO
            spine.bones.push(spBone);
        }

        const defaultSkin = armature.skin.length > 0 ? armature.skin[0] : null;

        for (const slot of armature.slot) {
            const spSlot = new spft.Slot();
            spSlot.name = slot.name;
            spSlot.bone = slot.parent;
            spSlot.color = utilsFT.rgbaToHex(
                Math.round(slot.color.rM * 2.55),
                Math.round(slot.color.gM * 2.55),
                Math.round(slot.color.bM * 2.55),
                Math.round(slot.color.aM * 2.55)
            ).toUpperCase();

            switch (utils.getEnumFormString(dbft.BlendMode, slot.blendMode)) {
                case dbft.BlendMode.Normal:
                    spSlot.blend = "normal";
                    break;

                case dbft.BlendMode.Add:
                    spSlot.blend = "additive";
                    break;

                case dbft.BlendMode.Multiply:
                    spSlot.blend = "multiply";
                    break;

                case dbft.BlendMode.Screen:
                    spSlot.blend = "screen";
                    break;
            }

            if (slot.displayIndex >= 0) {
                if (defaultSkin !== null) {
                    const skinSlot = defaultSkin.getSlot(slot.name);
                    if (skinSlot !== null) {
                        spSlot.attachment = skinSlot.display[slot.displayIndex].name; //
                    }
                }
            }

            spine.slots.push(spSlot);
        }

        for (const ikConstraint of armature.ik) {
            const spIKConstraint = new spft.IKConstraint();
            spIKConstraint.bendPositive = !ikConstraint.bendPositive;
            spIKConstraint.mix = ikConstraint.weight;
            spIKConstraint.name = ikConstraint.name;
            spIKConstraint.target = ikConstraint.target;
            if (ikConstraint.chain > 0) {
                spIKConstraint.bones.push((armature.getBone(ikConstraint.bone) as dbft.Bone).parent);
            }
            spIKConstraint.bones.push(ikConstraint.bone);

            spine.ik.push(spIKConstraint);
        }

        for (const skin of armature.skin) {
            const skinName = skin.name;
            const spSkins = {} as any;
            for (const slot of skin.slot) {
                const spSlots = {} as any;
                for (const display of slot.display) {
                    if (display instanceof dbft.ImageDisplay) {
                        const spAttachment = new spft.RegionAttachment();
                        spAttachment.x = display.transform.x;
                        spAttachment.y = -display.transform.y;
                        spAttachment.rotation = -display.transform.skY;
                        spAttachment.scaleX = display.transform.scX;
                        spAttachment.scaleY = display.transform.scY;
                        spAttachment.name = display.name;
                        spAttachment.path = display.path;

                        const texture = dbft.getTextureFormTextureAtlases(display.path || display.name, data.textureAtlas);
                        if (texture) {
                            spAttachment.width = texture.width;
                            spAttachment.height = texture.height;
                        }

                        spSlots[spAttachment.name] = spAttachment;
                    }
                    else if (display instanceof dbft.MeshDisplay) {
                        const spAttachment = new spft.MeshAttachment();
                        spAttachment.name = display.name;
                        spAttachment.path = display.path;
                        spAttachment.uvs = display.uvs;
                        spAttachment.triangles = display.triangles;

                        const texture = dbft.getTextureFormTextureAtlases(display.path || display.name, data.textureAtlas);
                        if (texture) {
                            spAttachment.width = texture.width;
                            spAttachment.height = texture.height;
                        }

                        for (const index of dbft.getEdgeFormTriangles(display.triangles)) {
                            spAttachment.edges.push(index * 2);
                        }

                        spAttachment.hull = spAttachment.edges.length / 2;

                        if (display.userEdges.length > 0) {
                            for (const index of display.userEdges) {
                                spAttachment.edges.push(index * 2);
                            }
                        }

                        if (display.weights.length > 0) {
                            geom.helpMatrixA.copyFromArray(display.slotPose);

                            for (let i = 0, iW = 0, l = display.vertices.length;
                                i < l;
                                i += 2
                            ) {
                                let x = display.vertices[i];
                                let y = display.vertices[i + 1];
                                geom.helpMatrixA.transformPoint(x, y, geom.helpPoint);
                                x = geom.helpPoint.x;
                                y = geom.helpPoint.y;
                                const boneCount = display.weights[iW++];
                                spAttachment.vertices.push(boneCount);
                                for (let j = 0; j < boneCount; ++j) {
                                    const boneIndex = display.weights[iW++];
                                    const boneWeight = display.weights[iW++];
                                    geom.helpMatrixB.copyFromArray(display.bonePose, display.getBonePoseOffset(boneIndex) + 1);
                                    geom.helpMatrixB.invert();
                                    geom.helpMatrixB.transformPoint(x, y, geom.helpPoint);

                                    spAttachment.vertices.push(boneIndex, Number(geom.helpPoint.x.toFixed(2)), -Number((geom.helpPoint.y).toFixed(2)), boneWeight);
                                }
                            }
                        }
                        else {
                            display.transform.toMatrix(geom.helpMatrixA);
                            for (let i = 0, l = display.vertices.length; i < l; i += 2) {
                                geom.helpMatrixA.transformPoint(display.vertices[i], display.vertices[i + 1], geom.helpPoint);
                                spAttachment.vertices.push(Number(geom.helpPoint.x.toFixed(2)), -Number((geom.helpPoint.y).toFixed(2)));
                            }
                        }

                        spSlots[spAttachment.name] = spAttachment;
                    }
                    else if (display instanceof dbft.SharedMeshDisplay) {
                        const spAttachment = new spft.LinkedMeshAttachment();
                        spAttachment.deform = display.inheritFFD;
                        spAttachment.name = display.name;
                        spAttachment.parent = display.share;
                        spAttachment.skin = skinName;
                        spSlots[spAttachment.name] = spAttachment;
                    }
                    else if (display instanceof dbft.PolygonBoundingBoxDisplay) {
                        const spAttachment = new spft.BoundingBoxAttachment();
                        spAttachment.vertexCount = display.vertices.length / 2;
                        spAttachment.name = display.name;
                        spAttachment.vertices = display.vertices;
                        spSlots[spAttachment.name] = spAttachment;
                    }
                }

                spSkins[slot.name] = spSlots;
            }

            spine.skins[skinName] = spSkins;
        }

        for (const animation of armature.animation) {
            if (animation instanceof dbft.AnimationBinary) {
                continue;
            }

            let iF = 0;
            let position = 0.0;
            const spAnimation = new spft.Animation();

            if (animation.frame.length > 0) {
                let position = 0.0;
                for (const frame of animation.frame) {
                    for (const action of frame.actions) {
                        let eventName = action.name;

                        switch (action.type) {
                            case dbft.ActionType.Frame:
                                eventName = action.name;
                                break;

                            case dbft.ActionType.Sound:
                                eventName = "soundEvent";
                                break;

                            case dbft.ActionType.Play:
                                eventName = "playEvent";
                                break;
                        }

                        const spFrame = new spft.EventFrame();
                        spFrame.time = position;
                        spFrame.name = eventName;
                        spAnimation.events.push(spFrame);

                        let event = spine.events[eventName];
                        if (!event) {
                            event = new spft.Event();
                            event.name = eventName;
                            spine.events[eventName] = event;

                            switch (action.type) {
                                case dbft.ActionType.Frame:
                                    event.string = action.bone;
                                    break;

                                case dbft.ActionType.Sound:
                                    event.string = action.name;
                                    break;

                                case dbft.ActionType.Play:
                                    event.string = action.name;
                                    break;
                            }

                            if (action.ints.length > 0) {
                                event.int = action.ints[0];
                            }

                            if (action.floats.length > 0) {
                                event.float = action.floats[0];
                            }

                            if (action.strings.length > 0) {
                                event.string = action.strings[0];
                            }
                        }
                        else {
                            switch (action.type) {
                                case dbft.ActionType.Frame:
                                    spFrame.string = action.bone;
                                    break;

                                case dbft.ActionType.Sound:
                                    spFrame.string = action.name;
                                    break;

                                case dbft.ActionType.Play:
                                    spFrame.string = action.name;
                                    break;
                            }

                            if (action.ints.length > 0) {
                                spFrame.int = action.ints[0];
                            }

                            if (action.floats.length > 0) {
                                spFrame.float = action.floats[0];
                            }

                            if (action.strings.length > 0) {
                                spFrame.string = action.strings[0];
                            }
                        }
                    }

                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }
            }

            if (animation.zOrder) {
                let position = 0.0;
                for (const frame of animation.zOrder.frame) {
                    const spFrame = new spft.DrawOrderFrame();
                    spFrame.time = position;
                    for (let i = 0, l = frame.zOrder.length; i < l; i += 2) {
                        spFrame.offsets.push({
                            slot: armature.slot[frame.zOrder[i]].name,
                            offset: frame.zOrder[i + 1]
                        });
                    }

                    spAnimation.drawOrder.push(spFrame);
                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }
            }

            for (const timeline of animation.bone) {
                const spTimelines = new spft.BoneTimelines();
                spAnimation.bones[timeline.name] = spTimelines;

                iF = 0;
                position = 0.0;
                for (const frame of timeline.translateFrame) {
                    const spFrame = new spft.TranslateFrame();
                    spFrame.time = position;
                    spFrame.x = frame.x;
                    spFrame.y = -frame.y;
                    setCurveFormDB(spFrame, frame, iF++ === timeline.translateFrame.length - 1);
                    spTimelines.translate.push(spFrame);

                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }

                iF = 0;
                position = 0.0;
                for (const frame of timeline.rotateFrame) {
                    const spRotateFrame = new spft.RotateFrame();
                    spRotateFrame.time = position;
                    spRotateFrame.angle = -frame.rotate;
                    setCurveFormDB(spRotateFrame, frame, iF === timeline.rotateFrame.length - 1);
                    spTimelines.rotate.push(spRotateFrame);

                    const spShearFrame = new spft.ShearFrame();
                    spShearFrame.time = position;
                    spShearFrame.x = 0.0;
                    spShearFrame.y = -frame.skew;
                    setCurveFormDB(spShearFrame, frame, iF === timeline.rotateFrame.length - 1);
                    spTimelines.shear.push(spShearFrame);

                    iF++;
                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }

                iF = 0;
                position = 0.0;
                for (const frame of timeline.scaleFrame) {
                    const spFrame = new spft.ScaleFrame();
                    spFrame.time = position;
                    spFrame.x = frame.x;
                    spFrame.y = frame.y;
                    setCurveFormDB(spFrame, frame, iF++ === timeline.scaleFrame.length - 1);
                    spTimelines.scale.push(spFrame);

                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }
            }

            for (const timeline of animation.slot) {
                const skinSlot = defaultSkin === null ? null : defaultSkin.getSlot(timeline.name);
                const spTimelines = new spft.SlotTimelines();
                spAnimation.slots[timeline.name] = spTimelines;

                position = 0.0;
                for (const frame of timeline.displayFrame) {
                    const spFrame = new spft.AttachmentFrame();
                    spFrame.time = position;
                    spTimelines.attachment.push(spFrame);

                    if (frame.value < 0 || skinSlot === null) {
                        spFrame.name = "";
                    }
                    else {
                        spFrame.name = skinSlot.display[frame.value].name;
                    }

                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }

                iF = 0;
                position = 0.0;
                for (const frame of timeline.colorFrame) {
                    const spFrame = new spft.ColorFrame();
                    spFrame.time = position;
                    setCurveFormDB(spFrame, frame, iF++ === timeline.colorFrame.length - 1);
                    spTimelines.color.push(spFrame);

                    spFrame.color = utilsFT.rgbaToHex(
                        Math.round(frame.value.rM * 2.55),
                        Math.round(frame.value.gM * 2.55),
                        Math.round(frame.value.bM * 2.55),
                        Math.round(frame.value.aM * 2.55)
                    ).toUpperCase();

                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }
            }

            for (const timeline of animation.ffd) {
                const deformFrames = new Array<spft.DeformFrame>();
                const skins = spAnimation.deform[timeline.skin] = spAnimation.deform[timeline.skin] || {};
                const slots = skins[timeline.slot] = skins[timeline.slot] || {};
                const meshDisplay = armature.getMesh(timeline.skin, timeline.slot, timeline.name);
                if (!meshDisplay) {
                    continue;
                }

                slots[timeline.name] = deformFrames;
                meshDisplay.transform.toMatrix(geom.helpMatrixA);

                iF = 0;
                position = 0.0;
                for (const frame of timeline.frame) {
                    const spFrame = new spft.DeformFrame();
                    deformFrames.push(spFrame);
                    spFrame.time = position;
                    setCurveFormDB(spFrame, frame, iF++ === timeline.frame.length - 1);

                    for (let j = 0; j < frame.offset; ++j) {
                        spFrame.vertices.push(0.0);
                    }

                    for (const value of frame.vertices) {
                        spFrame.vertices.push(value);
                    }

                    while (spFrame.vertices.length < meshDisplay.vertices.length) {
                        spFrame.vertices.push(0.0);
                    }

                    if (meshDisplay.weights.length > 0) {
                        //TODO
                    }
                    else {
                        for (let j = 0, lJ = spFrame.vertices.length; j < lJ; j += 2) {
                            const x = meshDisplay.vertices[j];
                            const y = meshDisplay.vertices[j + 1];
                            geom.helpMatrixA.transformPoint(x, y, geom.helpPoint);
                            const xP = geom.helpPoint.x;
                            const yP = geom.helpPoint.y;
                            geom.helpMatrixA.transformPoint(x + spFrame.vertices[j], y + spFrame.vertices[j + 1], geom.helpPoint);
                            spFrame.vertices[j] = Number((geom.helpPoint.x - xP).toFixed(2));
                            spFrame.vertices[j + 1] = -Number((geom.helpPoint.y - yP).toFixed(2));
                        }
                    }

                    let begin = 0;
                    while (spFrame.vertices[begin] === 0.0) {
                        begin++;
                        if (begin === spFrame.vertices.length - 1) {
                            break;
                        }
                    }

                    let end = spFrame.vertices.length - 1;
                    while (end > begin && spFrame.vertices[end] === 0.0) {
                        end--;
                    }

                    let index = 0;
                    for (let i = begin; i < end + 1; ++i) {
                        spFrame.vertices[index++] = spFrame.vertices[i];
                    }

                    spFrame.offset = begin;
                    spFrame.vertices.length = end - begin + 1;

                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }
            }

            for (const timeline of animation.ik) {
                iF = 0;
                position = 0.0;
                for (const frame of timeline.frame) {
                    const spFrame = new spft.IKConstraintFrame();
                    spFrame.time = position;
                    setCurveFormDB(spFrame, frame, iF++ === timeline.frame.length - 1);
                    spFrame.bendPositive = !frame.bendPositive;
                    spFrame.mix = frame.weight;

                    position += frame.duration / frameRate;
                    position = Number(position.toFixed(4));
                }
            }

            spine.animations[animation.name] = spAnimation;
        }
    }

    let index = data.textureAtlas.length > 1 ? 0 : -1;
    for (const textureAtlas of data.textureAtlas) {
        result.textureAtlas += `\n`;
        result.textureAtlas += `${data.name}${addTextureAtlasSuffix ? "_spine" : ""}${data.textureAtlas.length > 1 ? "_" + index : ""}.png\n`;
        result.textureAtlas += `size: ${textureAtlas.width},${textureAtlas.height}\n`;
        result.textureAtlas += `format: RGBA8888\n`;
        result.textureAtlas += `filter: Linear,Linear\n`;
        result.textureAtlas += `repeat: none\n`;

        for (const texture of textureAtlas.SubTexture) {
            result.textureAtlas += `${texture.name}\n`;
            result.textureAtlas += `  rotate: ${texture.rotated}\n`; // TODO
            result.textureAtlas += `  xy: ${texture.x}, ${texture.y}\n`;
            result.textureAtlas += `  size: ${texture.width}, ${texture.height}\n`;
            result.textureAtlas += `  orig: ${texture.frameWidth || texture.width}, ${texture.frameHeight || texture.height}\n`;
            result.textureAtlas += `  offset: ${texture.frameX || 0}, ${texture.frameY || 0}\n`;
            result.textureAtlas += `  index: ${index}\n`;
        }

        index++;
    }

    return result;
}

function setCurveFormDB(spFrame: spft.TweenFrame, dbFrame: dbft.TweenFrame, isLastFrame: boolean): void {
    if (isLastFrame) {
        return;
    }

    if (dbFrame.curve.length > 0) {
        spFrame.curve = [];
        spFrame.curve.push(dbFrame.curve[0] || 0, dbFrame.curve[1] || 0, dbFrame.curve[dbFrame.curve.length - 2] || 0, dbFrame.curve[dbFrame.curve.length - 1] || 1);
    }
    else if (isNaN(dbFrame.tweenEasing)) {
        spFrame.curve = "stepped";
    }
    else {
        spFrame.curve = "linear";
    }
}