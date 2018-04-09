import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";
import * as l2ft from "../format/live2DFormat";

const rotateMatrix = geom.helpMatrixA;
let modelConfig: l2ft.ModelConfig;
let result: dbft.DragonBones;
let armature: dbft.Armature;
let defaultSkin: dbft.Skin;
/**
 * Convert Live2D format to DragonBones format.
 */
export default function (data: l2ft.ModelConfig): dbft.DragonBones | null {
    modelConfig = data;
    const l2Displays = modelConfig.modelImpl.displays;
    // Create dragonBones.
    result = new dbft.DragonBones();
    result.frameRate = modelConfig.modelImpl.frameRate; //
    result.name = data.name;
    result.version = dbft.DATA_VERSION_5_5;
    result.compatibleVersion = dbft.DATA_VERSION_5_5;
    // Create textureAtlas.
    let textureIndex = 0;
    for (const l2Texture of modelConfig.textures) {
        if (typeof l2Texture === "string") {
            continue;
        }

        const textureAtlas = new dbft.TextureAtlas();
        textureAtlas.name = modelConfig.name;
        textureAtlas.width = l2Texture.width;
        textureAtlas.height = l2Texture.height;
        textureAtlas.imagePath = l2Texture.file;

        const subTexture = new dbft.Texture();
        subTexture.name = textureIndex.toString();
        subTexture.x = 0;
        subTexture.y = 0;
        subTexture.width = textureAtlas.width;
        subTexture.height = textureAtlas.height;
        textureAtlas.SubTexture.push(subTexture);
        textureIndex++;

        result.textureAtlas.push(textureAtlas);
    }

    // Create armatures.
    armature = new dbft.Armature();
    armature.name = data.name;
    result.armature.push(armature);
    // Create bones.
    const rootBone = new dbft.Bone();
    rootBone.name = "DST_BASE";
    rootBone.length = 150.0;
    armature.bone.push(rootBone);
    // Modify bone rotate.
    rotateMatrix.identity();
    rotateMatrix.rotate(Math.PI * 0.5);

    for (const l2Part of modelConfig.modelImpl.parts) {
        for (const l2Bone of l2Part.bones) {
            const l2Parent = modelConfig.modelImpl.getBone(l2Bone.parent);
            const isSurfaceParent = l2Parent !== null && l2Parent instanceof l2ft.Surface;
            const l2Timelines = l2Bone.animation.timelines;

            if (l2Bone instanceof l2ft.Bone) {
                const poseTransform = getPose(l2Timelines, l2Bone.transformFrames, (a, b, t) => {
                    const result = new l2ft.Transform();
                    if (b) {
                        result.interpolation(a, b, t);
                    }
                    else {
                        result.copyFrom(a);
                    }

                    return result;
                });
                const bone = new dbft.Bone();
                bone.length = 150.0;
                bone.name = l2Bone.name;
                bone.parent = l2Bone.parent === rootBone.name ? "" : l2Bone.parent;

                if (isSurfaceParent) { // Scale and rotate.
                    bone.transform.x = (poseTransform.x - 0.5) * 400.0;
                    bone.transform.y = (poseTransform.y - 0.5) * 400.0;
                    bone.transform.skY = poseTransform.rotate - 90.0;
                    bone.transform.skX = poseTransform.rotate - 90.0;
                    bone.inheritScale = false;
                }
                else if (bone.parent) { // Rotate.
                    rotateMatrix.transformPoint(poseTransform.x, poseTransform.y, bone.transform);
                    bone.transform.skY = poseTransform.rotate;
                    bone.transform.skX = poseTransform.rotate;
                }
                else { // Rotate and offset.
                    bone.transform.x = poseTransform.x - modelConfig.modelImpl.stageWidth * 0.5;
                    bone.transform.y = poseTransform.y - modelConfig.modelImpl.stageHeight;
                    bone.transform.skY = poseTransform.rotate - 90.0;
                    bone.transform.skX = poseTransform.rotate - 90.0;
                }

                bone.transform.scX = poseTransform.scaleX * (poseTransform.reflectX ? -1.0 : 1.0);
                bone.transform.scY = poseTransform.scaleY * (poseTransform.reflectY ? -1.0 : 1.0);

                armature.bone.push(bone);
            }
            else if (l2Bone instanceof l2ft.Surface) {
                const poseVertices = getPose(l2Timelines, l2Bone.deformFrames, (a, b, t) => {
                    const result = new Array<number>();
                    if (b) {
                        vertivesInterpolation(result, a, b, t);
                    }
                    else {
                        vertivesCopyFrom(result, a);
                    }

                    return result;
                });
                const surface = new dbft.Surface();
                surface.segmentX = l2Bone.segmentX;
                surface.segmentY = l2Bone.segmentY;
                surface.name = l2Bone.name;
                surface.parent = l2Bone.parent === rootBone.name ? "" : l2Bone.parent;
                surface.vertices.length = poseVertices.length;

                for (let i = 0, l = poseVertices.length; i < l; i += 2) {
                    if (isSurfaceParent) { // Scale.
                        surface.vertices[i] = (poseVertices[i] - 0.5) * 400.0;
                        surface.vertices[i + 1] = (poseVertices[i + 1] - 0.5) * 400.0;
                    }
                    else if (surface.parent) { // Rotate.
                        rotateMatrix.transformPoint(poseVertices[i], poseVertices[i + 1], geom.helpPointA);
                        surface.vertices[i] = geom.helpPointA.x;
                        surface.vertices[i + 1] = geom.helpPointA.y;
                    }
                    else { // Offset.
                        surface.vertices[i] = poseVertices[i] - modelConfig.modelImpl.stageWidth * 0.5;
                        surface.vertices[i + 1] = poseVertices[i + 1] - modelConfig.modelImpl.stageHeight;
                    }
                }

                armature.bone.push(surface);
            }
        }
    }
    // Sort bones.
    armature.sortBones();
    // armature.localToGlobal();
    // Create slots and skins.
    defaultSkin = new dbft.Skin();

    for (const l2Display of l2Displays) {
        const l2Parent = modelConfig.modelImpl.getBone(l2Display.parent);
        const isSurfaceParent = l2Parent !== null && l2Parent instanceof l2ft.Surface;
        const l2Timelines = l2Display.animation.timelines;

        if (l2Display instanceof l2ft.Mesh) {
            const poseVertices = getPose(l2Timelines, l2Display.deformFrames, (a, b, t) => {
                const result = new Array<number>();
                if (b) {
                    vertivesInterpolation(result, a, b, t);
                }
                else {
                    vertivesCopyFrom(result, a);
                }

                return result;
            });
            // Create slots.
            const slot = new dbft.Slot();
            slot.name = l2Display.name;
            slot.parent = l2Display.parent;
            slot.color.aM = Math.max(Math.round(l2Display.alphaFrames[0] * 100), 100); // TODO
            armature.slot.push(slot);
            // Create displays.
            const display = new dbft.MeshDisplay();
            display.name = l2Display.name;
            display.path = (l2Display.textureIndex >= 0 ? l2Display.textureIndex : 0).toString();
            // UVs.
            for (const value of l2Display.uvs) {
                display.uvs.push(value);
            }
            // Triangles.
            for (const index of l2Display.indices) {
                display.triangles.push(index);
            }
            // Vertices.
            display.vertices.length = poseVertices.length;

            for (let i = 0, l = poseVertices.length; i < l; i += 2) {
                if (isSurfaceParent) { // Scale.
                    display.vertices[i] = (poseVertices[i] - 0.5) * 400.0;
                    display.vertices[i + 1] = (poseVertices[i + 1] - 0.5) * 400.0;
                }
                else if (slot.parent !== rootBone.name) { // Rotate.
                    rotateMatrix.transformPoint(poseVertices[i], poseVertices[i + 1], geom.helpPointA);
                    display.vertices[i] = geom.helpPointA.x;
                    display.vertices[i + 1] = geom.helpPointA.y;
                }
                else { // Offset.
                    display.vertices[i] = poseVertices[i] - modelConfig.modelImpl.stageWidth * 0.5;
                    display.vertices[i + 1] = poseVertices[i + 1] - modelConfig.modelImpl.stageHeight;
                }
            }

            // const edges = dbft.getEdgeFormTriangles(display.triangles);
            // for (const value of edges) {
            //     display.edges.push(value);
            // }

            // SkinSlot.
            const skinSlot = new dbft.SkinSlot();
            skinSlot.name = l2Display.name;
            skinSlot.display.push(display);
            defaultSkin.slot.push(skinSlot);
        }
    }

    armature.skin.push(defaultSkin);
    // Create animations.
    if (modelConfig.modelImpl.animations.timelines.length > 0) {
        for (const l2Part of modelConfig.modelImpl.parts) {
            // Create bone timelines.
            for (const l2Bone of l2Part.bones) {
                const l2Parent = modelConfig.modelImpl.getBone(l2Bone.parent);
                const isSurfaceParent = l2Parent !== null && l2Parent instanceof l2ft.Surface;
                const l2Timelines = l2Bone.animation.timelines;

                if (l2Bone instanceof l2ft.Bone) {
                    const bone = armature.getBone(l2Bone.name);
                    if (!bone) {
                        continue;
                    }

                    const l2TransformFrames = l2Bone.transformFrames;

                    switch (l2Timelines.length) {
                        case 0:
                            break;

                        case 1: {
                            const l2Timeline = l2Timelines[0];
                            const l2TimelineInfo = modelConfig.modelImpl.getTimelineInfo(l2Timeline.name) as l2ft.TimelineInfo;
                            const totalValue = l2TimelineInfo.maximum - l2TimelineInfo.minimum;
                            // Create animation.
                            let animation = armature.getAnimation(l2Timeline.name) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = l2Timeline.name;
                                armature.animation.push(animation);
                            }
                            // Create timeline.
                            const timeline = new dbft.BoneTimeline();
                            timeline.name = bone.name;

                            for (let i = 0; i < l2Timeline.frameCount; ++i) {
                                const progress = (l2Timeline.frames[i] - l2TimelineInfo.minimum) / totalValue;
                                let x = 0.0;
                                let y = 0.0;
                                const l2TransformFrame = l2TransformFrames[i];
                                const translateFrame = new dbft.BoneTranslateFrame();
                                const rotateFrame = new dbft.BoneRotateFrame();
                                const scaleFrame = new dbft.BoneScaleFrame();

                                translateFrame._position = rotateFrame._position = scaleFrame._position = Math.floor(progress * animation.duration);
                                translateFrame.tweenEasing = rotateFrame.tweenEasing = scaleFrame.tweenEasing = 0.0;

                                if (isSurfaceParent) {
                                    x = (l2TransformFrame.x - 0.5) * 400.0;
                                    y = (l2TransformFrame.y - 0.5) * 400.0;
                                }
                                else {
                                    x = l2TransformFrame.x;
                                    y = l2TransformFrame.y;
                                }

                                if (!bone.parent || isSurfaceParent) {
                                    if (!bone.parent) {
                                        translateFrame.x = x - bone.transform.x - modelConfig.modelImpl.stageWidth * 0.5;
                                        translateFrame.y = y - bone.transform.y - modelConfig.modelImpl.stageHeight;
                                    }
                                    else {
                                        translateFrame.x = x - bone.transform.x;
                                        translateFrame.y = y - bone.transform.y;
                                    }

                                    rotateFrame.rotate = l2TransformFrame.rotate - bone.transform.skY - 90.0;
                                }
                                else {
                                    rotateMatrix.transformPoint(x, y, translateFrame);
                                    translateFrame.x -= bone.transform.x;
                                    translateFrame.y -= bone.transform.y;
                                    rotateFrame.rotate = l2TransformFrame.rotate - bone.transform.skY;
                                }

                                scaleFrame.x = l2TransformFrame.scaleX * (l2TransformFrame.reflectX ? -1.0 : 1.0) - bone.transform.scX;
                                scaleFrame.y = l2TransformFrame.scaleY * (l2TransformFrame.reflectY ? -1.0 : 1.0) - bone.transform.scY;

                                timeline.translateFrame.push(translateFrame);
                                timeline.rotateFrame.push(rotateFrame);
                                timeline.scaleFrame.push(scaleFrame);
                            }

                            animation.bone.push(timeline);
                            modifyFrames(timeline.translateFrame);
                            modifyFrames(timeline.rotateFrame);
                            modifyFrames(timeline.scaleFrame);
                            break;
                        }

                        case 2: {
                            const l2TimelineA = l2Timelines[0];
                            const l2TimelineB = l2Timelines[1];
                            const l2TimelineInfoA = modelConfig.modelImpl.getTimelineInfo(l2TimelineA.name) as l2ft.TimelineInfo;
                            const l2TimelineInfoB = modelConfig.modelImpl.getTimelineInfo(l2TimelineB.name) as l2ft.TimelineInfo;
                            const totalValueA = l2TimelineInfoA.maximum - l2TimelineInfoA.minimum;
                            const totalValueB = l2TimelineInfoB.maximum - l2TimelineInfoB.minimum;
                            // Create parameters animaiton.
                            let animationA = armature.getAnimation(l2TimelineA.name) as dbft.Animation | null;
                            if (!animationA) {
                                animationA = new dbft.Animation();
                                animationA.playTimes = 0;
                                animationA.duration = result.frameRate;
                                animationA.name = l2TimelineA.name;
                                animationA.type = dbft.AnimationType.Tree;
                                animationA.blendType = dbft.AnimationBlendType.E1D;
                                armature.animation.push(animationA);
                            }
                            // Create weight and time animaiton.
                            let animationB = armature.getAnimation(l2TimelineB.name) as dbft.Animation | null;
                            if (!animationB) {
                                animationB = new dbft.Animation();
                                animationB.playTimes = 0;
                                animationB.duration = result.frameRate;
                                animationB.name = l2TimelineB.name;
                                animationB.type = dbft.AnimationType.Tree;
                                armature.animation.push(animationB);
                            }
                            // Create animations and timelines.
                            const animation = new dbft.Animation();
                            animation.playTimes = 0;
                            animation.duration = result.frameRate;
                            animation.name = bone.name;
                            animation.type = dbft.AnimationType.Tree;
                            animation.blendType = dbft.AnimationBlendType.E1D;
                            armature.animation.push(animation);

                            for (let a = 0; a < l2TimelineA.frameCount; ++a) {
                                const childAnimationName = bone.name + "_" + a.toString().padStart(2, "0");
                                const childAnimation = new dbft.Animation();
                                childAnimation.playTimes = 0;
                                childAnimation.duration = animationB.duration;
                                childAnimation.name = childAnimationName;
                                childAnimation.type = dbft.AnimationType.Node;
                                armature.animation.push(childAnimation);

                                const timeline = new dbft.BoneTimeline();
                                timeline.name = bone.name;

                                for (let b = 0; b < l2TimelineB.frameCount; ++b) {
                                    const frameIndex = a + b * l2TimelineA.frameCount;
                                    let x = 0.0;
                                    let y = 0.0;
                                    const progress = (l2TimelineB.frames[b] - l2TimelineInfoB.minimum) / totalValueB;
                                    const l2TransformFrame = l2TransformFrames[frameIndex];
                                    const translateFrame = new dbft.BoneTranslateFrame();
                                    const rotateFrame = new dbft.BoneRotateFrame();
                                    const scaleFrame = new dbft.BoneScaleFrame();

                                    translateFrame._position = rotateFrame._position = scaleFrame._position = Math.floor(progress * childAnimation.duration);
                                    translateFrame.tweenEasing = rotateFrame.tweenEasing = scaleFrame.tweenEasing = 0.0;

                                    if (isSurfaceParent) {
                                        x = (l2TransformFrame.x - 0.5) * 400.0;
                                        y = (l2TransformFrame.y - 0.5) * 400.0;
                                    }
                                    else {
                                        x = l2TransformFrame.x;
                                        y = l2TransformFrame.y;
                                    }

                                    if (!bone.parent || isSurfaceParent) {
                                        if (!bone.parent) {
                                            translateFrame.x = x - bone.transform.x - modelConfig.modelImpl.stageWidth * 0.5;
                                            translateFrame.y = y - bone.transform.y - modelConfig.modelImpl.stageHeight;
                                        }
                                        else {
                                            translateFrame.x = x - bone.transform.x;
                                            translateFrame.y = y - bone.transform.y;
                                        }

                                        rotateFrame.rotate = l2TransformFrame.rotate - bone.transform.skY - 90.0;
                                    }
                                    else {
                                        rotateMatrix.transformPoint(x, y, translateFrame);
                                        translateFrame.x -= bone.transform.x;
                                        translateFrame.y -= bone.transform.y;
                                        rotateFrame.rotate = l2TransformFrame.rotate - bone.transform.skY;
                                    }

                                    timeline.translateFrame.push(translateFrame);
                                    timeline.rotateFrame.push(rotateFrame);
                                    timeline.scaleFrame.push(scaleFrame);
                                }

                                childAnimation.bone.push(timeline);
                                modifyFrames(timeline.translateFrame);
                                modifyFrames(timeline.rotateFrame);
                                modifyFrames(timeline.scaleFrame);
                                createAnimationController(
                                    animationA, animationB, animation, childAnimation,
                                    (l2TimelineA.frames[a] - l2TimelineInfoA.minimum) / totalValueA * 2.0 - 1.0
                                );
                            }
                            break;
                        }

                        case 3: { // TODO
                            break;
                        }
                    }
                }
                else if (l2Bone instanceof l2ft.Surface) {
                    const surface = armature.getBone(l2Bone.name) as dbft.Surface | null;
                    if (!surface) {
                        continue;
                    }

                    const l2DeformFrames = l2Bone.deformFrames;

                    switch (l2Timelines.length) {
                        case 0:
                            break;

                        case 1: {
                            const l2Timeine = l2Timelines[0];
                            const l2TimeineInfo = modelConfig.modelImpl.getTimelineInfo(l2Timeine.name) as l2ft.TimelineInfo;
                            const totalValue = l2TimeineInfo.maximum - l2TimeineInfo.minimum;
                            // Create animation.
                            let animation = armature.getAnimation(l2Timeine.name) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = l2Timeine.name;
                                armature.animation.push(animation);
                            }
                            // Create timeline.
                            const timeline = new dbft.DeformTimeline();
                            timeline.name = surface.name;

                            for (let i = 0; i < l2Timeine.frameCount; ++i) {
                                const progress = (l2Timeine.frames[i] - l2TimeineInfo.minimum) / totalValue;
                                const l2DeformFrame = l2DeformFrames[i];
                                const deformFrame = new dbft.DeformFrame();
                                deformFrame._position = Math.floor(progress * animation.duration);
                                deformFrame.tweenEasing = 0.0;
                                createDeformFrame(
                                    deformFrame,
                                    l2DeformFrame,
                                    surface.vertices,
                                    isSurfaceParent,
                                    surface.parent.length > 0
                                );
                                timeline.frame.push(deformFrame);
                            }

                            animation.surface.push(timeline);
                            modifyFrames(timeline.frame);
                            break;
                        }

                        case 2: {
                            const l2TimelineA = l2Timelines[0];
                            const l2TimelineB = l2Timelines[1];
                            const l2TimelineInfoA = modelConfig.modelImpl.getTimelineInfo(l2TimelineA.name) as l2ft.TimelineInfo;
                            const l2TimelineInfoB = modelConfig.modelImpl.getTimelineInfo(l2TimelineB.name) as l2ft.TimelineInfo;
                            const totalValueA = l2TimelineInfoA.maximum - l2TimelineInfoA.minimum;
                            const totalValueB = l2TimelineInfoB.maximum - l2TimelineInfoB.minimum;
                            // Create parameters animaiton.
                            let animationA = armature.getAnimation(l2TimelineA.name) as dbft.Animation | null;
                            if (!animationA) {
                                animationA = new dbft.Animation();
                                animationA.playTimes = 0;
                                animationA.duration = result.frameRate;
                                animationA.name = l2TimelineA.name;
                                animationA.type = dbft.AnimationType.Tree;
                                animationA.blendType = dbft.AnimationBlendType.E1D;
                                armature.animation.push(animationA);
                            }
                            // Create weight and time animaiton.
                            let animationB = armature.getAnimation(l2TimelineB.name) as dbft.Animation | null;
                            if (!animationB) {
                                animationB = new dbft.Animation();
                                animationB.playTimes = 0;
                                animationB.duration = result.frameRate;
                                animationB.name = l2TimelineB.name;
                                animationB.type = dbft.AnimationType.Tree;
                                armature.animation.push(animationB);
                            }
                            // Create animations and timelines.
                            const progressAnimation = new dbft.Animation();
                            progressAnimation.playTimes = 0;
                            progressAnimation.duration = result.frameRate;
                            progressAnimation.name = surface.name;
                            progressAnimation.type = dbft.AnimationType.Tree;
                            progressAnimation.blendType = dbft.AnimationBlendType.E1D;
                            armature.animation.push(progressAnimation);

                            for (let a = 0; a < l2TimelineA.frameCount; ++a) {
                                const childAnimationName = surface.name + "_" + a.toString().padStart(2, "0");
                                const childAnimation = new dbft.Animation();
                                childAnimation.playTimes = 0;
                                childAnimation.duration = animationB.duration;
                                childAnimation.name = childAnimationName;
                                childAnimation.type = dbft.AnimationType.Node;
                                armature.animation.push(childAnimation);

                                const timeline = new dbft.DeformTimeline();
                                timeline.name = surface.name;

                                for (let b = 0; b < l2TimelineB.frameCount; ++b) {
                                    const frameIndex = a * l2TimelineB.frameCount + b;
                                    const progress = (l2TimelineB.frames[b] - l2TimelineInfoB.minimum) / totalValueB;
                                    const l2DeformFrame = l2DeformFrames[frameIndex];
                                    const deformFrame = new dbft.DeformFrame();
                                    deformFrame._position = Math.floor(progress * childAnimation.duration);
                                    deformFrame.tweenEasing = 0.0;
                                    createDeformFrame(
                                        deformFrame,
                                        l2DeformFrame,
                                        surface.vertices,
                                        isSurfaceParent,
                                        surface.parent.length > 0
                                    );
                                    timeline.frame.push(deformFrame);
                                }

                                childAnimation.surface.push(timeline);
                                modifyFrames(timeline.frame);
                                createAnimationController(
                                    animationA, animationB, progressAnimation, childAnimation,
                                    (l2TimelineA.frames[a] - l2TimelineInfoA.minimum) / totalValueA * 2.0 - 1.0
                                );
                            }
                            break;
                        }

                        case 3: { // TODO
                            console.log(surface.name);
                            break;
                        }
                    }
                }
            }
            // Create slot timeines.
            for (const display of l2Part.displays) {
                const l2Parent = modelConfig.modelImpl.getBone(display.parent);
                const isSurfaceParent = l2Parent !== null && l2Parent instanceof l2ft.Surface;
                const l2Timelines = display.animation.timelines;

                if (display instanceof l2ft.Mesh) {
                    const slot = armature.getSlot(display.name);
                    const meshDisplay = armature.getMesh(defaultSkin.name, display.name, display.name);
                    if (!slot || !meshDisplay) {
                        continue;
                    }

                    const l2AlphaFrames = display.alphaFrames;
                    const l2DeformFrames = display.deformFrames;

                    switch (l2Timelines.length) {
                        case 0:
                            break;

                        case 1: {
                            const l2Timeline = l2Timelines[0];
                            const l2TimelineInfo = modelConfig.modelImpl.getTimelineInfo(l2Timeline.name) as l2ft.TimelineInfo;
                            const totalValue = l2TimelineInfo.maximum - l2TimelineInfo.minimum;
                            // Create animation.
                            let animation = armature.getAnimation(l2Timeline.name) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = l2Timeline.name;
                                armature.animation.push(animation);
                            }
                            // Create timelines.
                            const colorTimeline = new dbft.SlotTimeline();
                            const deformTimeline = new dbft.SlotDeformTimeline();
                            colorTimeline.name = slot.name;
                            deformTimeline.name = meshDisplay.name;
                            deformTimeline.slot = slot.name;

                            for (let i = 0; i < l2Timeline.frameCount; ++i) {
                                const progress = (l2Timeline.frames[i] - l2TimelineInfo.minimum) / totalValue;
                                const l2ColorFrame = l2AlphaFrames[i];
                                const l2DeformFrame = l2DeformFrames[i];
                                const colorFrame = new dbft.SlotColorFrame();
                                const deformFrame = new dbft.DeformFrame();
                                deformFrame._position = colorFrame._position = Math.floor(progress * animation.duration);
                                deformFrame.tweenEasing = colorFrame.tweenEasing = 0.0;
                                colorFrame.value.aM = Math.max(Math.round(l2ColorFrame * 100), 100);
                                createDeformFrame(
                                    deformFrame,
                                    l2DeformFrame,
                                    meshDisplay.vertices,
                                    isSurfaceParent,
                                    slot.parent !== rootBone.name
                                );
                                colorTimeline.colorFrame.push(colorFrame);
                                deformTimeline.frame.push(deformFrame);
                            }

                            animation.slot.push(colorTimeline);
                            animation.ffd.push(deformTimeline);
                            modifyFrames(colorTimeline.colorFrame);
                            modifyFrames(deformTimeline.frame);
                            break;
                        }

                        case 2: {
                            const l2TimelineA = l2Timelines[0];
                            const l2TimelineB = l2Timelines[1];
                            const l2TimelineInfoA = modelConfig.modelImpl.getTimelineInfo(l2TimelineA.name) as l2ft.TimelineInfo;
                            const l2TimelineInfoB = modelConfig.modelImpl.getTimelineInfo(l2TimelineB.name) as l2ft.TimelineInfo;
                            const totalValueA = l2TimelineInfoA.maximum - l2TimelineInfoA.minimum;
                            const totalValueB = l2TimelineInfoB.maximum - l2TimelineInfoB.minimum;
                            // Create parameters animaiton.
                            let animationA = armature.getAnimation(l2TimelineA.name) as dbft.Animation | null;
                            if (!animationA) {
                                animationA = new dbft.Animation();
                                animationA.playTimes = 0;
                                animationA.duration = result.frameRate;
                                animationA.name = l2TimelineA.name;
                                animationA.type = dbft.AnimationType.Tree;
                                animationA.blendType = dbft.AnimationBlendType.E1D;
                                armature.animation.push(animationA);
                            }
                            // Create weight and time animaiton.
                            let animationB = armature.getAnimation(l2TimelineB.name) as dbft.Animation | null;
                            if (!animationB) {
                                animationB = new dbft.Animation();
                                animationB.playTimes = 0;
                                animationB.duration = result.frameRate;
                                animationB.name = l2TimelineB.name;
                                animationB.type = dbft.AnimationType.Tree;
                                armature.animation.push(animationB);
                            }
                            // Create animations and timelines.
                            const progressAnimation = new dbft.Animation();
                            progressAnimation.playTimes = 0;
                            progressAnimation.duration = result.frameRate;
                            progressAnimation.name = slot.name;
                            progressAnimation.type = dbft.AnimationType.Tree;
                            progressAnimation.blendType = dbft.AnimationBlendType.E1D;
                            armature.animation.push(progressAnimation);

                            for (let a = 0; a < l2TimelineA.frameCount; ++a) {
                                const childAnimationName = slot.name + "_" + a.toString().padStart(2, "0");
                                const childAnimation = new dbft.Animation();
                                childAnimation.playTimes = 0;
                                childAnimation.duration = animationB.duration;
                                childAnimation.name = childAnimationName;
                                childAnimation.type = dbft.AnimationType.Node;
                                armature.animation.push(childAnimation);
                                // Create timelines.
                                const colorTimeline = new dbft.SlotTimeline();
                                const deformTimeline = new dbft.SlotDeformTimeline();
                                colorTimeline.name = slot.name;
                                deformTimeline.name = meshDisplay.name;
                                deformTimeline.slot = slot.name;

                                for (let b = 0; b < l2TimelineB.frameCount; ++b) {
                                    const frameIndex = a + b * l2TimelineA.frameCount;
                                    const progress = (l2TimelineB.frames[b] - l2TimelineInfoB.minimum) / totalValueB;
                                    const l2ColorFrame = l2AlphaFrames[frameIndex];
                                    const l2DeformFrame = l2DeformFrames[frameIndex];
                                    const colorFrame = new dbft.SlotColorFrame();
                                    const deformFrame = new dbft.DeformFrame();
                                    deformFrame._position = colorFrame._position = Math.floor(progress * childAnimation.duration);
                                    deformFrame.tweenEasing = colorFrame.tweenEasing = 0.0;
                                    colorFrame.value.aM = Math.max(Math.round(l2ColorFrame * 100), 100);
                                    createDeformFrame(
                                        deformFrame,
                                        l2DeformFrame,
                                        meshDisplay.vertices,
                                        isSurfaceParent,
                                        slot.parent !== rootBone.name
                                    );
                                    colorTimeline.colorFrame.push(colorFrame);
                                    deformTimeline.frame.push(deformFrame);
                                }

                                childAnimation.slot.push(colorTimeline);
                                childAnimation.ffd.push(deformTimeline);
                                modifyFrames(colorTimeline.colorFrame);
                                modifyFrames(deformTimeline.frame);
                                createAnimationController(
                                    animationA, animationB, progressAnimation, childAnimation,
                                    (l2TimelineA.frames[a] - l2TimelineInfoA.minimum) / totalValueA * 2.0 - 1.0
                                );
                            }
                            break;
                        }

                        case 3: {
                            break;
                        }
                    }
                }
            }
        }
    }

    // Create motion animations.
    if (modelConfig.motions) {
        for (const motionName in modelConfig.motions) {
            let index = 0;
            const motionConfigs = modelConfig.motions[motionName];
            for (const motionConfig of motionConfigs) {
                if (!motionConfig.motion) {
                    continue;
                }

                const animationName = motionConfigs.length > 1 ? (motionName + "_" + index.toString().padStart(2, "0")) : motionName;
                const animation = new dbft.Animation();
                animation.playTimes = 0;
                animation.name = animationName;
                animation.type = dbft.AnimationType.Tree;

                for (const timelineName in motionConfig.motion.values) {
                    const l2TimelineInfo = modelConfig.modelImpl.getTimelineInfo(timelineName);
                    if (!l2TimelineInfo) {
                        continue;
                    }

                    const values = motionConfig.motion.values[timelineName];
                    const timeline = new dbft.AnimationTimeline();
                    timeline.name = timelineName;

                    for (const value of values) {
                        const frame = new dbft.FloatFrame();
                        frame.tweenEasing = 0;
                        frame.value = (value - l2TimelineInfo.minimum) / (l2TimelineInfo.maximum - l2TimelineInfo.minimum);
                        timeline.progressFrame.push(frame);
                    }

                    animation.duration = Math.max(values.length, animation.duration);
                    animation.animation.push(timeline);
                }

                armature.animation.push(animation);
                index++;
            }
        }
    }

    return result;
}

function getPose<T>(l2Timelines: l2ft.Timeline[], frames: T[], action: (a: T, b: T | null, t: number) => T, level: number = -1): T {
    if (level < 0) {
        if (l2Timelines.length > 0) {
            level = l2Timelines.length - 1;
        }
        else {
            return frames[0];
        }
    }

    const l2Timeline = l2Timelines[level];
    const l2TimelineInfo = modelConfig.modelImpl.getTimelineInfo(l2Timeline.name) as l2ft.TimelineInfo;
    let index = l2Timeline.frames.indexOf(l2TimelineInfo.default);
    // TODO index
    if (index < 0) {
        if (l2TimelineInfo.default <= l2Timeline.frames[0]) {
            index = 0;
        }
        else if (l2TimelineInfo.default >= l2Timeline.frames[l2Timeline.frames.length - 1]) {
            index = l2Timeline.frames.length - 1;
        }

        if (level === 0) {
            return action(
                frames[index],
                null,
                0.0
            );
        }
        else {
            const result = getPose(l2Timelines, frames, action, level - 1);
            return action(
                result,
                null,
                0.0
            );
        }
    }

    if (index) {
        for (const value of l2Timeline.frames) {
            index++;
            if (value > l2TimelineInfo.default) {
                const prevValue = l2Timeline.frames[index - 1];
                const resultA = getPose(l2Timelines, frames, action, level - 1);
                const resultB = getPose(l2Timelines, frames, action, level - 1);
                return action(
                    resultA,
                    resultB,
                    (l2TimelineInfo.default - prevValue) / (value - prevValue)
                );
            }
        }
    }

    throw new Error();
}

function createABC<T>(l2Timelines: l2ft.Timeline[], frames: T[], action: (a: T, b: T | null, t: number) => T, level: number = -1): T {
    if (level < 0) {
        level = l2Timelines.length - 1;
    }

    action();

    // Create timelines.
    const colorTimeline = new dbft.SlotTimeline();
    const deformTimeline = new dbft.SlotDeformTimeline();
    colorTimeline.name = slot.name;
    deformTimeline.name = meshDisplay.name;
    deformTimeline.slot = slot.name;

    if (level === 0) {

    }

    for (let b = 0; b < l2TimelineB.frameCount; ++b) {
        const frameIndex = a + b * l2TimelineA.frameCount;
        const progress = (l2TimelineB.frames[b] - l2TimelineInfoB.minimum) / totalValueB;
        const l2ColorFrame = l2AlphaFrames[frameIndex];
        const l2DeformFrame = l2DeformFrames[frameIndex];
        const colorFrame = new dbft.SlotColorFrame();
        const deformFrame = new dbft.DeformFrame();
        deformFrame._position = colorFrame._position = Math.floor(progress * childAnimation.duration);
        deformFrame.tweenEasing = colorFrame.tweenEasing = 0.0;
        colorFrame.value.aM = Math.max(Math.round(l2ColorFrame * 100), 100);
        createDeformFrame(
            deformFrame,
            l2DeformFrame,
            meshDisplay.vertices,
            isSurfaceParent,
            slot.parent !== rootBone.name
        );
        colorTimeline.colorFrame.push(colorFrame);
        deformTimeline.frame.push(deformFrame);
    }

    childAnimation.slot.push(colorTimeline);
    childAnimation.ffd.push(deformTimeline);
    modifyFrames(colorTimeline.colorFrame);
    modifyFrames(deformTimeline.frame);
}

function createDeformFrame(
    deformFrame: dbft.DeformFrame,
    l2DeformFrame: number[],
    pose: number[],
    isSurfaceParent: boolean,
    isRotatedParent: boolean
): void {
    for (let j = 0, lJ = l2DeformFrame.length; j < lJ; j += 2) {
        if (isSurfaceParent) { // Scale.
            deformFrame.vertices[j] = (l2DeformFrame[j] - 0.5) * 400.0 - pose[j];
            deformFrame.vertices[j + 1] = (l2DeformFrame[j + 1] - 0.5) * 400.0 - pose[j + 1];
        }
        else if (isRotatedParent) { // Rotate.
            rotateMatrix.transformPoint(l2DeformFrame[j], l2DeformFrame[j + 1], geom.helpPointA);
            deformFrame.vertices[j] = geom.helpPointA.x - pose[j];
            deformFrame.vertices[j + 1] = geom.helpPointA.y - pose[j + 1];
        }
        else { // Offset.
            deformFrame.vertices[j] = l2DeformFrame[j] - pose[j] - modelConfig.modelImpl.stageWidth * 0.5;
            deformFrame.vertices[j + 1] = l2DeformFrame[j + 1] - pose[j + 1] - modelConfig.modelImpl.stageHeight;
        }
    }
}

function createAnimationController(
    animationA: dbft.Animation,
    animationB: dbft.Animation,
    animation: dbft.Animation,
    childAnimation: dbft.Animation,
    positionX: number
): void {
    {
        const animationTimeline = new dbft.AnimationTimeline();
        animationTimeline.name = childAnimation.name;
        animationTimeline.x = positionX;
        const frameBegin = new dbft.FloatFrame();
        const frameEnd = new dbft.FloatFrame();
        frameBegin._position = 0;
        frameBegin.value = 0.0;
        frameBegin.tweenEasing = 0.0;
        frameEnd._position = animationB.duration;
        frameEnd.value = 1.0;
        frameEnd.tweenEasing = 0.0;
        animationTimeline.progressFrame.push(frameBegin, frameEnd);
        animation.animation.push(animationTimeline);
        modifyFrames(animationTimeline.progressFrame);
    }

    if (!animationB.getAnimationTimeline(animation.name)) {
        const animationTimeline = new dbft.AnimationTimeline();
        animationTimeline.name = animation.name;
        const frameBegin = new dbft.FloatFrame();
        const frameEnd = new dbft.FloatFrame();
        frameBegin._position = 0;
        frameBegin.value = 0.0;
        frameBegin.tweenEasing = 0.0;
        frameEnd._position = animationB.duration;
        frameEnd.value = 1.0;
        frameEnd.tweenEasing = 0.0;
        animationTimeline.progressFrame.push(frameBegin, frameEnd);
        animationB.animation.push(animationTimeline);
        modifyFrames(animationTimeline.progressFrame);
    }

    if (!animationA.getAnimationTimeline(animation.name)) {
        const animationTimeline = new dbft.AnimationTimeline();
        animationTimeline.name = animation.name;
        const frameBegin = new dbft.BoneTranslateFrame();
        const frameEnd = new dbft.BoneTranslateFrame();
        frameBegin._position = 0;
        frameBegin.x = -1.0;
        frameBegin.tweenEasing = 0.0;
        frameEnd._position = animationA.duration;
        frameEnd.x = 1.0;
        frameEnd.tweenEasing = 0.0;
        animationTimeline.parameterFrame.push(frameBegin, frameEnd);
        animationA.animation.push(animationTimeline);
        modifyFrames(animationTimeline.parameterFrame);
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

function vertivesCopyFrom(result: number[], target: number[]): void {
    result.length = target.length;
    for (let i = 0, l = target.length; i < l; ++i) {
        result[i] = target[i];
    }
}

function vertivesAdd(result: number[], target: number[]): void {
    result.length = target.length;
    for (let i = 0, l = target.length; i < l; ++i) {
        result[i] += target[i];
    }
}

function vertivesMinus(result: number[], target: number[]): void {
    result.length = target.length;
    for (let i = 0, l = target.length; i < l; ++i) {
        result[i] -= target[i];
    }
}

function vertivesInterpolation(result: number[], a: number[], b: number[], t: number): void {
    result.length = a.length;

    const helper: number[] = [];
    vertivesCopyFrom(helper, b);
    vertivesMinus(helper, a);

    for (let i = 0, l = helper.length; i < l; ++i) {
        helper[i] *= t;
    }

    vertivesCopyFrom(result, a);
    vertivesAdd(result, helper);
}