import { Map } from "../common/types";
// import * as utils from "../common/utils";
import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";
import * as spft from "../format/spineFormat";

type Input = {
    name: string;
    data: spft.Spine;
    textureAtlas: string;
};

export default function (data: Input, forPro: boolean = false): dbft.DragonBones {
    let textureAtlasScale = -1.0;
    const result: dbft.DragonBones = new dbft.DragonBones();

    {
        const lines = data.textureAtlas.split(/\r\n|\r|\n/);
        const tuple = new Array<string>(4);
        let textureAtlas: dbft.TextureAtlas | null = null;
        while (true) {
            const line = lines.shift();
            if (line === null || line === undefined) {
                break;
            }

            if (line.length === 0) {
                textureAtlas = null;
            }
            else if (!textureAtlas) {
                textureAtlas = new dbft.TextureAtlas();
                textureAtlas.name = data.name;
                textureAtlas.imagePath = line;

                if (readTuple(tuple, lines.shift()) === 2) {
                    textureAtlas.width = parseInt(tuple[0]);
                    textureAtlas.height = parseInt(tuple[1]);
                    readTuple(tuple, lines.shift());
                }

                readTuple(tuple, lines.shift());
                readValue(lines.shift());

                result.textureAtlas.push(textureAtlas);
            }
            else {
                const texture = new dbft.Texture();
                texture.name = line;
                texture.rotated = readValue(lines.shift()) === "true" ? (forPro ? 1 as any : true) : false;

                readTuple(tuple, lines.shift());
                texture.x = parseInt(tuple[0]);
                texture.y = parseInt(tuple[1]);

                readTuple(tuple, lines.shift());
                if (texture.rotated) {
                    texture.height = parseInt(tuple[0]);
                    texture.width = parseInt(tuple[1]);
                }
                else {
                    texture.width = parseInt(tuple[0]);
                    texture.height = parseInt(tuple[1]);
                }

                if (readTuple(tuple, lines.shift()) === 4) {
                    if (readTuple(tuple, lines.shift()) === 4) {
                        readTuple(tuple, lines.shift());
                    }
                }

                texture.frameWidth = parseInt(tuple[0]);
                texture.frameHeight = parseInt(tuple[1]);
                readTuple(tuple, lines.shift());
                texture.frameX = -parseInt(tuple[0]);
                texture.frameY = -(texture.frameHeight - (texture.rotated ? texture.width : texture.height) - parseInt(tuple[1]));
                readTuple(tuple, lines.shift());
                textureAtlas.SubTexture.push(texture);
            }
        }
    }

    const armature = new dbft.Armature();
    armature.name = data.name;
    result.frameRate = data.data.skeleton.fps;
    result.name = data.name;
    result.version = dbft.DATA_VERSION_5_5;
    result.compatibleVersion = dbft.DATA_VERSION_5_5;
    result.armature.push(armature);

    for (const sfBone of data.data.bones) {
        const bone = new dbft.Bone();
        bone.length = sfBone.length;
        bone.transform.x = sfBone.x;
        bone.transform.y = -sfBone.y;
        bone.transform.skY = -(sfBone.rotation + sfBone.shearX);
        bone.transform.skX = bone.transform.skY - sfBone.shearY;
        bone.transform.scX = sfBone.scaleX;
        bone.transform.scY = sfBone.scaleY;
        bone.name = sfBone.name;
        bone.parent = sfBone.parent;

        switch (sfBone.transform) { // TODO
            case "onlyTranslation":
                bone.inheritRotation = false;
                bone.inheritScale = false;
                bone.inheritReflection = false;
                break;

            case "noRotationOrReflection":
                bone.inheritRotation = false;
                bone.inheritScale = true;
                bone.inheritReflection = false;
                break;

            case "noScaleOrReflection":
                bone.inheritRotation = true;
                bone.inheritScale = false;
                bone.inheritReflection = false;
                break;

            case "noScale":
                bone.inheritRotation = true;
                bone.inheritScale = false;
                bone.inheritReflection = true;
                break;

            case "normal":
            default:
                bone.inheritRotation = sfBone.inheritRotation;
                bone.inheritScale = sfBone.inheritScale;
                bone.inheritReflection = true;
                break;
        }

        armature.bone.push(bone);
    }

    armature.localToGlobal();

    const slotDisplays: Map<string[]> = {}; // Create attachments sort.

    for (const skinName in data.data.skins) {
        const spSkin = data.data.skins[skinName];
        const skin = new dbft.Skin();
        skin.name = skinName;

        for (const slotName in spSkin) {
            const spSlot = spSkin[slotName];
            const slot = new dbft.SkinSlot();
            const displays = slotDisplays[slotName] = slotDisplays[slotName] || [];
            slot.name = slotName;

            for (const attachmentName in spSlot) {
                const attachment = spSlot[attachmentName];
                if (displays.indexOf(attachmentName) < 0) {
                    displays.push(attachmentName);
                }

                if (attachment instanceof spft.RegionAttachment) {
                    const display = new dbft.ImageDisplay();
                    display.name = attachment.name || attachmentName;
                    display.path = attachment.path;
                    display.transform.x = attachment.x;
                    display.transform.y = -attachment.y;
                    display.transform.skX = -attachment.rotation;
                    display.transform.skY = -attachment.rotation;
                    display.transform.scX = attachment.scaleX;
                    display.transform.scY = attachment.scaleY;
                    slot.display.push(display);

                    if (textureAtlasScale < 0.0) {
                        textureAtlasScale = modifyTextureAtlasScale(attachment.path || display.name, attachment, result.textureAtlas);
                    }
                }
                else if (attachment instanceof spft.MeshAttachment) {
                    const display = new dbft.MeshDisplay();
                    display.name = attachment.name || attachmentName;
                    display.width = attachment.width;
                    display.height = attachment.height;
                    display.path = attachment.path || (attachment.name || attachmentName);

                    for (const v of attachment.uvs) {
                        display.uvs.push(v);
                    }

                    for (const v of attachment.triangles) {
                        display.triangles.push(v);
                    }

                    if (attachment.uvs.length === attachment.vertices.length) {
                        for (let i = 0; i < attachment.vertices.length; ++i) {
                            const v = attachment.vertices[i];
                            if (i % 2) {
                                display.vertices[i] = -v;
                            }
                            else {
                                display.vertices[i] = v;
                            }
                        }
                    }
                    else {
                        const bones = new Array<number>();
                        for (
                            let i = 0, iW = 0;
                            i < attachment.uvs.length / 2;
                            ++i
                        ) {
                            const boneCount = attachment.vertices[iW++];
                            let xG = 0.0;
                            let yG = 0.0;
                            display.weights.push(boneCount);

                            for (let j = 0; j < boneCount; j++) {
                                const boneIndex = attachment.vertices[iW++];
                                const xL = attachment.vertices[iW++];
                                const yL = -attachment.vertices[iW++];
                                const weight = attachment.vertices[iW++];
                                const bone = armature.getBone(data.data.bones[boneIndex].name);
                                if (bone && bone._global) {
                                    const boneIndex = armature.bone.indexOf(bone);
                                    bone._global.toMatrix(geom.helpMatrixA);
                                    geom.helpMatrixA.transformPoint(xL, yL, geom.helpPointA);
                                    xG += geom.helpPointA.x * weight;
                                    yG += geom.helpPointA.y * weight;
                                    display.weights.push(boneIndex, weight);

                                    if (bones.indexOf(boneIndex) < 0) {
                                        bones.push(boneIndex);
                                        display.bonePose.push(boneIndex, geom.helpMatrixA.a, geom.helpMatrixA.b, geom.helpMatrixA.c, geom.helpMatrixA.d, geom.helpMatrixA.tx, geom.helpMatrixA.ty);
                                    }
                                }
                            }

                            display.vertices.push(xG, yG);
                        }

                        display.slotPose.push(1.0, 0.0, 0.0, 1.0, 0.0, 0.0);
                    }

                    display.edges = dbft.getEdgeFormTriangles(display.triangles);
                    if (attachment.edges.length !== attachment.hull * 2) {
                        for (let i = attachment.hull * 2; i < attachment.edges.length; ++i) {
                            display.userEdges.push(attachment.edges[i] / 2);
                        }
                    }

                    slot.display.push(display);

                    if (textureAtlasScale < 0.0) {
                        textureAtlasScale = modifyTextureAtlasScale(attachment.path || display.name, attachment, result.textureAtlas);
                    }
                }
                else if (attachment instanceof spft.LinkedMeshAttachment) {
                    const display = new dbft.SharedMeshDisplay();
                    display.inheritDeform = attachment.deform;
                    display.name = attachment.name || attachmentName;
                    display.share = attachment.parent;
                    display.skin = attachment.skin;
                    display.path = attachment.path || (attachment.name || attachmentName);
                    slot.display.push(display);

                    if (textureAtlasScale < 0.0) {
                        textureAtlasScale = modifyTextureAtlasScale(attachment.path || display.name, attachment, result.textureAtlas);
                    }
                }
                else if (attachment instanceof spft.BoundingBoxAttachment) {
                    const display = new dbft.PolygonBoundingBoxDisplay();
                    display.name = attachment.name || attachmentName;
                    if (attachment.vertexCount < attachment.vertices.length / 2) { // Check
                        for (
                            let i = 0, iW = 0;
                            i < attachment.vertexCount;
                            ++i
                        ) {
                            const boneCount = attachment.vertices[iW++];

                            let xG = 0.0;
                            let yG = 0.0;
                            for (let j = 0; j < boneCount; j++) {
                                const boneIndex = attachment.vertices[iW++];
                                const xL = attachment.vertices[iW++];
                                const yL = -attachment.vertices[iW++];
                                const weight = attachment.vertices[iW++];
                                const bone = armature.getBone(data.data.bones[boneIndex].name);
                                if (bone && bone._global) {
                                    bone._global.toMatrix(geom.helpMatrixA);
                                    geom.helpMatrixA.transformPoint(xL, yL, geom.helpPointA);
                                    xG += geom.helpPointA.x * weight;
                                    yG += geom.helpPointA.y * weight;
                                }
                            }

                            display.vertices.push(xG, yG);
                        }
                    }
                    else {
                        for (let i = 0; i < attachment.vertices.length; ++i) {
                            const v = attachment.vertices[i];
                            if (i % 2) {
                                display.vertices[i] = -v;
                            }
                            else {
                                display.vertices[i] = v;
                            }
                        }
                    }

                    slot.display.push(display);
                }
                else {
                    const display = new dbft.ImageDisplay();
                    slot.display.push(display);
                }
            }

            skin.slot.push(slot);
        }

        armature.skin.push(skin);
    }

    // TODO
    // const defaultSkin = armature.getSkin("default");
    // if (defaultSkin) {
    //     for (const slot of defaultSkin.slot) {
    //         const displayNames = slotDisplays[slot.name];
    //         if (slot.display.length === displayNames.length) {

    //         }
    //     }
    // }

    for (const spSlot of data.data.slots) {
        const slot = new dbft.Slot();
        slot.name = spSlot.name;
        slot.parent = spSlot.bone;

        const displays = slotDisplays[slot.name];
        slot.displayIndex = displays ? displays.indexOf(spSlot.attachment) : -1;
        slot.color.copyFromRGBA(Number("0x" + spSlot.color));

        switch (spSlot.blend) {
            case "normal":
                slot.blendMode = dbft.BlendMode[dbft.BlendMode.Normal].toLowerCase();
                break;

            case "additive":
                slot.blendMode = dbft.BlendMode[dbft.BlendMode.Add].toLowerCase();
                break;

            case "multiply":
                // slot.blendMode = dbft.BlendMode[dbft.BlendMode.Multiply].toLowerCase();
                break;

            case "screen":
                // slot.blendMode = dbft.BlendMode[dbft.BlendMode.Screen].toLowerCase();
                break;
        }

        armature.slot.push(slot);
    }

    for (const spIK of data.data.ik) {
        const ik = new dbft.IKConstraint();
        ik.bendPositive = !spIK.bendPositive;
        ik.chain = spIK.bones.length > 1 ? 1 : 0;
        ik.weight = spIK.mix;
        ik.name = spIK.name;
        ik.bone = spIK.bones[spIK.bones.length - 1];
        ik.target = spIK.target;
        armature.ik.push(ik);
    }

    for (const animationName in data.data.animations) {
        const spAnimation = data.data.animations[animationName];
        const animation = new dbft.Animation();
        let lastFramePosition = 0;
        let iF = 0;
        animation.playTimes = 0;
        animation.name = animationName;

        for (const timelineName in spAnimation.bones) {
            const spTimeline = spAnimation.bones[timelineName];
            const timeline = new dbft.BoneTimeline();
            timeline.name = timelineName;

            iF = 0;
            for (const spFrame of spTimeline.translate) {
                const frame = new dbft.BoneTranslateFrame();
                frame._position = Math.round(spFrame.time * result.frameRate);
                frame.x = spFrame.x;
                frame.y = -spFrame.y;
                setTweenFormSP(frame, spFrame, iF++ === spTimeline.translate.length - 1);
                timeline.translateFrame.push(frame);

                lastFramePosition = Math.max(frame._position, lastFramePosition);
            }
            modifyFrames(timeline.translateFrame);

            iF = 0;
            for (const spFrame of spTimeline.rotate) {
                const frame = new dbft.BoneRotateFrame();
                frame._position = Math.round(spFrame.time * result.frameRate);
                frame.rotate = -spFrame.angle;
                setTweenFormSP(frame, spFrame, iF++ === spTimeline.rotate.length - 1);
                timeline.rotateFrame.push(frame);

                lastFramePosition = Math.max(frame._position, lastFramePosition);
            }
            modifyFrames(timeline.rotateFrame);

            iF = 0;
            for (const spFrame of spTimeline.shear) {
                const position = Math.round(spFrame.time * result.frameRate);
                const index = timeline.insertFrame(timeline.rotateFrame, position);
                if (index < 0) {
                    continue;
                }

                const frame = timeline.rotateFrame[index];
                frame.rotate += -spFrame.x;
                frame.skew = spFrame.x - spFrame.y;
                lastFramePosition = Math.max(position, lastFramePosition);
            }

            iF = 0;
            for (const spFrame of spTimeline.scale) {
                const frame = new dbft.BoneScaleFrame();
                frame._position = Math.round(spFrame.time * result.frameRate);
                frame.x = spFrame.x;
                frame.y = spFrame.y;
                setTweenFormSP(frame, spFrame, iF++ === spTimeline.scale.length - 1);
                timeline.scaleFrame.push(frame);
                lastFramePosition = Math.max(frame._position, lastFramePosition);
            }
            modifyFrames(timeline.scaleFrame);

            animation.bone.push(timeline);
        }

        for (const timelineName in spAnimation.slots) {
            const spTimeline = spAnimation.slots[timelineName];
            const timeline = new dbft.SlotTimeline();
            timeline.name = timelineName;

            for (const spFrame of spTimeline.attachment) {
                const frame = new dbft.SlotDisplayFrame();
                const displays = slotDisplays[timelineName];
                frame._position = Math.round(spFrame.time * result.frameRate);
                frame.value = displays ? displays.indexOf(spFrame.name) : -1;
                timeline.displayFrame.push(frame);
                lastFramePosition = Math.max(frame._position, lastFramePosition);
            }

            iF = 0;
            for (const spFrame of spTimeline.color) {
                const frame = new dbft.SlotColorFrame();
                frame._position = Math.round(spFrame.time * result.frameRate);
                frame.value.copyFromRGBA(Number("0x" + spFrame.color));
                setTweenFormSP(frame, spFrame, iF++ === spTimeline.color.length - 1);
                timeline.colorFrame.push(frame);
                lastFramePosition = Math.max(frame._position, lastFramePosition);
            }

            modifyFrames(timeline.displayFrame);
            modifyFrames(timeline.colorFrame);
            animation.slot.push(timeline);
        }

        let deformKey = "";
        for (deformKey in spAnimation.deform) {
            break;
        }

        const spTimelines = deformKey ? spAnimation.deform : spAnimation.ffd;
        for (const skinName in spTimelines) {
            const slots = spTimelines[skinName];
            for (const slotName in slots) {
                const timelines = slots[slotName];
                for (const timelineName in timelines) {
                    const meshName = timelineName;
                    const meshDisplay = armature.getMesh(skinName, slotName, meshName);
                    if (!meshDisplay) {
                        continue;
                    }

                    const timeline = new dbft.MeshDeformTimeline();
                    const spFrames = timelines[timelineName];
                    timeline.name = meshName;
                    timeline.skin = skinName;
                    timeline.slot = slotName;

                    iF = 0;
                    for (const spFrame of spFrames) {
                        const frame = new dbft.DeformFrame();
                        frame._position = Math.round(spFrame.time * result.frameRate);
                        setTweenFormSP(frame, spFrame, iF++ === spFrames.length - 1);
                        timeline.frame.push(frame);

                        if (meshDisplay.weights.length > 0) {
                            for (let i = 0; i < spFrame.offset; ++i) {
                                spFrame.vertices.unshift(0.0);
                            }

                            for (
                                let i = 0, iW = 0, iV = 0;
                                i < meshDisplay.vertices.length;
                                i += 2
                            ) {
                                const boneCount = meshDisplay.weights[iW++];
                                let xG = 0.0;
                                let yG = 0.0;

                                for (let j = 0; j < boneCount; j++) {
                                    const boneIndex = meshDisplay.weights[iW++];
                                    const weight = meshDisplay.weights[iW++];
                                    const bone = armature.bone[boneIndex];

                                    if (bone && bone._global) {
                                        const xL = spFrame.vertices[iV++] || 0.0;
                                        const yL = -spFrame.vertices[iV++] || 0.0;
                                        bone._global.toMatrix(geom.helpMatrixA);
                                        geom.helpMatrixA.transformPoint(xL, yL, geom.helpPointA, true);

                                        if (xL !== 0.0) {
                                            xG += geom.helpPointA.x * weight;
                                        }

                                        if (yL !== 0.0) {
                                            yG += geom.helpPointA.y * weight;
                                        }
                                    }
                                }

                                frame.vertices[i] = xG;
                                frame.vertices[i + 1] = yG;
                            }
                        }
                        else {
                            frame.offset = spFrame.offset;

                            for (let i = 0, l = spFrame.vertices.length; i < l; ++i) {
                                if ((frame.offset + i) % 2) {
                                    frame.vertices.push(-spFrame.vertices[i]);
                                }
                                else {
                                    frame.vertices.push(spFrame.vertices[i]);
                                }
                            }
                        }

                        lastFramePosition = Math.max(frame._position, lastFramePosition);
                    }

                    modifyFrames(timeline.frame);
                    animation.ffd.push(timeline);
                }
            }
        }

        for (const ikConstraintName in spAnimation.ik) {
            const spFrames = spAnimation.ik[ikConstraintName];
            const timeline = new dbft.IKConstraintTimeline();
            timeline.name = ikConstraintName;

            iF = 0;
            for (const spFrame of spFrames) {
                const frame = new dbft.IKConstraintFrame();
                frame._position = Math.round(spFrame.time * result.frameRate);
                frame.bendPositive = !spFrame.bendPositive;
                frame.weight = spFrame.mix;
                setTweenFormSP(frame, spFrame, iF++ === spFrames.length - 1);
                timeline.frame.push(frame);
                lastFramePosition = Math.max(frame._position, lastFramePosition);
            }

            modifyFrames(timeline.frame);
        }

        if (spAnimation.events.length > 0) {
            spAnimation.events.sort((a, b) => {
                return a.time > b.time ? 1 : -1;
            });

            let prevFrame: dbft.Frame | null = null;
            for (const spFrame of spAnimation.events) {
                const position = Math.round(spFrame.time * result.frameRate);
                let frame: dbft.ActionFrame;

                if (prevFrame && prevFrame._position === position) {
                    frame = prevFrame as any;
                }
                else {
                    frame = new dbft.ActionFrame();
                    frame._position = position;
                    animation.frame.push(frame);
                    prevFrame = frame;
                }

                const spEvent = data.data.events[spFrame.name];
                const action = new dbft.Action();
                action.type = dbft.ActionType.Frame;
                action.name = spFrame.name;

                if (spFrame.int || spEvent.int) {
                    action.ints.push(spFrame.int || spEvent.int);
                }
                if (spFrame.float || spEvent.float) {
                    action.floats.push(spFrame.float || spEvent.float);
                }
                if (spFrame.string || spEvent.string) {
                    action.strings.push(spFrame.string || spEvent.string);
                }

                frame.actions.push(action);
                lastFramePosition = Math.max(frame._position, lastFramePosition);
            }

            modifyFrames(animation.frame);
        }

        if (spAnimation.drawOrder.length > 0) {
            animation.zOrder = new dbft.ZOrderTimeline();

            for (const spFrame of spAnimation.drawOrder) {
                const frame = new dbft.ZOrderFrame();
                frame._position = Math.round(spFrame.time * result.frameRate);

                for (const v of spFrame.offsets) {
                    const slot = armature.getSlot(v.slot);
                    frame.zOrder.push(slot ? armature.slot.indexOf(slot) : -1, v.offset);
                }

                animation.zOrder.frame.push(frame);
                lastFramePosition = Math.max(frame._position, lastFramePosition);
            }

            modifyFrames(animation.zOrder.frame);
        }

        animation.duration = lastFramePosition + 1;
        armature.animation.push(animation);
    }

    if (textureAtlasScale > 0.0) {
        for (const textureAtlas of result.textureAtlas) {
            textureAtlas.scale = textureAtlasScale;
        }
    }

    return result;
}

function modifyTextureAtlasScale(textureName: string, attachment: { width: number, height: number }, textureAtlases: dbft.TextureAtlas[]): number {
    const texture = dbft.getTextureFormTextureAtlases(textureName, textureAtlases);
    if (texture) {

        if (texture.frameWidth) {
            return texture.frameWidth / attachment.width;
        }

        if (texture.rotated) {
            return texture.width / attachment.height;
        }

        return texture.width / attachment.width;
    }

    return -1;
}

function setTweenFormSP(dbFrame: dbft.TweenFrame, spFrame: spft.TweenFrame, isLastFrame: boolean): void {
    if (isLastFrame) {
        return;
    }

    if (spFrame.curve instanceof Array) {
        dbFrame.curve = spFrame.curve;
    }
    else if (spFrame.curve === "linear") {
        dbFrame.tweenEasing = 0.0;
    }
    else {
        dbFrame.tweenEasing = NaN;
    }
}

function modifyFrames(frames: dbft.Frame[]): void {
    if (frames.length === 0) {
        return;
    }

    if (frames[0]._position !== 0) {
        const frame = new (frames[0] as any).constructor() as dbft.Frame;
        if (frame instanceof dbft.TweenFrame) {
            frame.tweenEasing = 0.0;
        }

        frames.unshift(frame);
    }

    for (let i = 0, l = frames.length; i < l; ++i) {
        const frame = frames[i];
        if (i < l - 1) {
            frame.duration = frames[i + 1]._position - frame._position;
        }
    }
}

function readValue(line: string | undefined): string {
    if (line === undefined || line === null) {
        throw new Error("Invalid line: " + line);
    }

    let colon = line.indexOf(":");
    if (colon === -1)
        throw new Error("Invalid line: " + line);

    return line.substring(colon + 1).trim();
}

function readTuple(tuple: Array<string>, line: string | undefined): number {
    if (line === undefined || line === null) {
        throw new Error("Invalid line: " + line);
    }

    let colon = line.indexOf(":");
    if (colon === -1)
        throw new Error("Invalid line: " + line);
    let i = 0, lastMatch = colon + 1;
    for (; i < 3; i++) {
        let comma = line.indexOf(",", lastMatch);
        if (comma === -1) break;
        tuple[i] = line.substr(lastMatch, comma - lastMatch).trim();
        lastMatch = comma + 1;
    }

    tuple[i] = line.substring(lastMatch).trim();

    return i + 1;
}