import * as dbft from "../format/dragonBonesFormat";
import * as l2ft from "../format/live2dFormat";

type Input = {
    name: string;
    data: l2ft.ModelImpl;
    textureAtlas: string;
    textureAtlasWidth: number;
    textureAtlasHeight: number;
};

let result: dbft.DragonBones;
let armature: dbft.Armature;
/**
 * Convert Spine format to DragonBones format.
 */
export default function (data: Input): dbft.DragonBones | null {
    const model = data.data;
    const drawList = model.tempDrawList;
    // Create textureAtlas.
    const textureAtlas = new dbft.TextureAtlas();
    textureAtlas.name = data.textureAtlas;
    textureAtlas.width = data.textureAtlasWidth;
    textureAtlas.height = data.textureAtlasHeight;
    textureAtlas.scale = 1.0;
    textureAtlas.imagePath = data.textureAtlas + ".png";
    // Create subTexutres.
    const subTexture = new dbft.Texture();
    subTexture.name = data.textureAtlas;
    subTexture.x = 0;
    subTexture.y = 0;
    subTexture.width = data.textureAtlasWidth;
    subTexture.height = data.textureAtlasHeight;
    textureAtlas.SubTexture.push(subTexture);
    // Create dragonBones.
    result = new dbft.DragonBones();
    result.frameRate = 24;
    result.name = data.name;
    result.version = dbft.DATA_VERSION_5_5;
    result.compatibleVersion = dbft.DATA_VERSION_5_5;
    result.textureAtlas.push(textureAtlas);
    // Create armatures.
    armature = new dbft.Armature();
    armature.name = data.name;
    result.armature.push(armature);
    // Create bones.
    const root = new dbft.Bone();
    root.name = "DST_BASE";
    root.length = 150.0;
    armature.bone.push(root);

    for (const partsData of model.partsDataList) {
        for (const baseData of partsData.baseDataList) {
            const isParentSurface = model.isSurface(baseData.targetBaseDataID);

            if (baseData instanceof l2ft.AffineData) {
                const bone = new dbft.Bone();
                bone.length = 150.0;
                bone.name = baseData.baseDataID;
                bone.parent = baseData.targetBaseDataID;
                // Set default pose, will override later.
                const poseAffine = baseData.affines[0];

                if (isParentSurface) {
                    bone.transform.x = (poseAffine.originX - 0.5) * 400.0;
                    bone.transform.y = (poseAffine.originY - 0.5) * 400.0;
                    bone.inheritScale = false;
                }
                else {
                    bone.transform.x = poseAffine.originX;
                    bone.transform.y = poseAffine.originY;
                }

                bone.transform.skY = poseAffine.rotateDeg;
                bone.transform.skX = poseAffine.rotateDeg;
                bone.transform.scX = poseAffine.scaleX;
                bone.transform.scY = poseAffine.scaleY;

                armature.bone.push(bone);
            }
            else if (baseData instanceof l2ft.BoxGridData) {
                const surface = new dbft.Surface();
                surface.segmentX = baseData.col;
                surface.segmentY = baseData.row;
                surface.name = baseData.baseDataID;
                surface.parent = baseData.targetBaseDataID;
                // Set default pose, will override later.
                const posePivots = baseData.pivotPoints[0];
                surface.vertices.length = posePivots.length;

                for (let i = 0, l = posePivots.length; i < l; ++i) {
                    if (isParentSurface) {
                        surface.vertices[i] = (posePivots[i] - 0.5) * 400.0;
                    }
                    else {
                        surface.vertices[i] = posePivots[i];
                    }
                }

                armature.bone.push(surface);
            }
        }
    }
    // 
    armature.sortBones();
    // armature.localToGlobal();
    // Create slots.
    for (const drawData of drawList) {
        if (drawData instanceof l2ft.MeshData) {
            const slot = new dbft.Slot();
            slot.name = drawData.drawDataID;
            slot.parent = drawData.targetBaseDataID;
            armature.slot.push(slot);
        }
    }
    // Create skins.
    const skin = new dbft.Skin();

    for (const drawData of drawList) {
        const isParentSurface = model.isSurface(drawData.targetBaseDataID);
        if (drawData instanceof l2ft.MeshData) {
            // Display.
            const display = new dbft.MeshDisplay();
            display.name = data.name;
            display.width = 0.0;
            display.height = 0.0;
            // UVs.
            for (const value of drawData.uvmap) {
                display.uvs.push(value);
            }
            // Triangles.
            for (const index of drawData.indexArray) {
                display.triangles.push(index);
            }
            // Vertices.
            for (const value of drawData.pivotPoints[0]) {
                if (isParentSurface) {
                    display.vertices.push((value - 0.5) * 400.0);
                }
                else {
                    display.vertices.push(value);
                }
            }

            // const edges = dbft.getEdgeFormTriangles(display.triangles);
            // for (const value of edges) {
            //     display.edges.push(value);
            // }

            // SkinSlot.
            const skinSlot = new dbft.SkinSlot();
            skinSlot.name = drawData.drawDataID;
            skinSlot.display.push(display);
            skin.slot.push(skinSlot);
            console.log(drawData.drawDataID);
            console.log(drawData.pivotDrawOrder);
            console.log(drawData.pivotOpacity);
        }
    }

    armature.skin.push(skin);
    // Create animations.
    if (model.paramDefSet.paramDefSet.length > 0) {
        for (const partsData of model.partsDataList) {
            for (const baseData of partsData.baseDataList) {
                const isParentSurface = model.isSurface(baseData.targetBaseDataID);
                const paramPivotTable = baseData.pivotManager.paramPivotTable;

                if (baseData instanceof l2ft.AffineData) {
                    const bone = armature.getBone(baseData.baseDataID);
                    if (!bone) {
                        continue;
                    }
                    const surface = bone as dbft.Surface;
                    const affines = baseData.affines;

                    switch (paramPivotTable.length) {
                        case 0:
                            break;

                        case 1: {
                            let lastFramePosition = 0;
                            const paramPivots = paramPivotTable[0];
                            const paramDef = model.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                            //
                            // const defaultValueIndex = paramPivots.pivotValue.indexOf(paramDef.defaultValue);
                            // if (defaultValueIndex > 0) {
                            //     const poseAffine = affines[defaultValueIndex];

                            //     if (isParentSurface) {
                            //         bone.transform.x = (poseAffine.originX - 0.5) * 400.0;
                            //         bone.transform.y = (poseAffine.originY - 0.5) * 400.0;
                            //         bone.inheritScale = false;
                            //     }
                            //     else {
                            //         bone.transform.x = poseAffine.originX;
                            //         bone.transform.y = poseAffine.originY;
                            //     }

                            //     bone.transform.skY = poseAffine.rotateDeg;
                            //     bone.transform.skX = poseAffine.rotateDeg;
                            //     bone.transform.scX = poseAffine.scaleX;
                            //     bone.transform.scY = poseAffine.scaleY;
                            // }

                            let animation = armature.getAnimation(paramPivots.paramID) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.name = paramPivots.paramID;
                                armature.animation.push(animation);
                            }

                            const timeline = new dbft.BoneTimeline();
                            timeline.name = baseData.baseDataID;
                            animation.bone.push(timeline);

                            const totalValue = paramDef.maxValue - paramDef.minValue;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const translateFrame = new dbft.BoneTranslateFrame();
                                const rotateFrame = new dbft.BoneRotateFrame();
                                const scaleFrame = new dbft.BoneScaleFrame();
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
                                const frameAffine = affines[i];

                                translateFrame._position = rotateFrame._position = scaleFrame._position = lastFramePosition = Math.floor(progress * result.frameRate);
                                translateFrame.tweenEasing = rotateFrame.tweenEasing = scaleFrame.tweenEasing = 0.0;

                                if (isParentSurface) {
                                    translateFrame.x = (frameAffine.originX - 0.5) * 400.0 - bone.transform.x;
                                    translateFrame.y = (frameAffine.originY - 0.5) * 400.0 - bone.transform.y;
                                }
                                else {
                                    translateFrame.x = frameAffine.originX - bone.transform.x;
                                    translateFrame.y = frameAffine.originY - bone.transform.y;
                                }

                                rotateFrame.rotate = frameAffine.rotateDeg - bone.transform.skY;
                                scaleFrame.x = frameAffine.scaleX - bone.transform.scX;
                                scaleFrame.y = frameAffine.scaleY - bone.transform.scY;

                                timeline.translateFrame.push(translateFrame);
                                timeline.rotateFrame.push(rotateFrame);
                                timeline.scaleFrame.push(scaleFrame);
                            }

                            modifyFrames(timeline.translateFrame);
                            modifyFrames(timeline.rotateFrame);
                            modifyFrames(timeline.scaleFrame);
                            animation.duration = lastFramePosition + 1;
                            break;
                        }

                        case 2: {
                            // let lastFramePosition = 0;
                            // const paramPivotsA = paramPivotTable[0];
                            // const paramPivotsB = paramPivotTable[1];
                            // const paramDefA = model.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                            // const paramDefB = model.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;
                            // //
                            // // const defaultValueIndex = paramPivotsA.pivotValue.indexOf(paramDefA.defaultValue) * paramPivotsB.pivotCount + paramPivotsB.pivotValue.indexOf(paramDefB.defaultValue);
                            // // if (defaultValueIndex > 0) {
                            // //     const posePivotPoints = pivotPoints[defaultValueIndex];
                            // //     for (let i = 0, l = posePivotPoints.length; i < l; ++i) {
                            // //         if (isParentSurface) {
                            // //             surface.vertices[i] = (posePivotPoints[i] - 0.5) * 400.0;
                            // //         }
                            // //         else {
                            // //             surface.vertices[i] = posePivotPoints[i];
                            // //         }
                            // //     }
                            // // }

                            // let animationA = armature.getAnimation(paramPivotsA.paramID) as dbft.Animation | null;
                            // if (!animationA) {
                            //     animationA = new dbft.Animation();
                            //     animationA.playTimes = 0;
                            //     animationA.name = paramPivotsA.paramID;
                            //     armature.animation.push(animationA);
                            // }

                            // let animationB = armature.getAnimation(paramPivotsB.paramID) as dbft.Animation | null;
                            // if (!animationB) {
                            //     animationB = new dbft.Animation();
                            //     animationB.playTimes = 0;
                            //     animationB.name = paramPivotsB.paramID;
                            //     armature.animation.push(animationB);
                            // }

                            // const totalValueA = paramDefA.maxValue - paramDefA.minValue;
                            // const totalValueB = paramDefB.maxValue - paramDefB.minValue;

                            // for (let col = 0; col < paramPivotsA.pivotCount; ++col) {
                            //     const childAnimationName = paramPivotsA.paramID + "_" + col;
                            //     let childAnimation = armature.getAnimation(childAnimationName) as dbft.Animation | null;
                            //     if (!childAnimation) {
                            //         childAnimation = new dbft.Animation();
                            //         childAnimation.name = childAnimationName;
                            //         armature.animation.push(childAnimation);
                            //     }

                            //     const timeline = new dbft.BoneTimeline();
                            //     timeline.name = baseData.baseDataID;
                            //     childAnimation.bone.push(timeline);

                            //     for (let row = 0; row < paramPivotsB.pivotCount; ++row) {
                            //         const pivotPointsIndex = col * paramPivotsB.pivotCount + row;
                            //         const deformFrame = new dbft.DeformFrame();
                            //         const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
                            //         const frameAffine = affines[pivotPointsIndex];

                            //         // deformFrame._position = Math.floor(progress * result.frameRate);
                            //         // deformFrame.tweenEasing = 0.0;

                            //         // for (let i = 0, l = frameAffine.length; i < l; ++i) {
                            //         //     if (isParentSurface) {
                            //         //         deformFrame.vertices[i] = (frameAffine[i] - 0.5) * 400.0 - surface.vertices[i];
                            //         //     }
                            //         //     else {
                            //         //         deformFrame.vertices[i] = frameAffine[i] - surface.vertices[i];
                            //         //     }
                            //         // }

                            //         // timeline.frame.push(deformFrame);
                            //         // lastFramePosition = deformFrame._position;
                            //     }

                            //     modifyFrames(timeline.translateFrame);
                            //     modifyFrames(timeline.rotateFrame);
                            //     modifyFrames(timeline.scaleFrame);
                            //     childAnimation.duration = Math.max(lastFramePosition + 1, childAnimation.duration);
                            //     animationA.duration = Math.max(lastFramePosition + 1, animationA.duration);

                            //     if (!animationA.getAnimationTimeline(childAnimation.name)) {
                            //         const animationTimeline = new dbft.AnimationTimeline();
                            //         animationTimeline.name = childAnimation.name;
                            //         animationTimeline.x = (paramPivotsA.pivotValue[col] - paramDefA.minValue) / totalValueA;

                            //         const frameBegin = new dbft.AnimationFrame();
                            //         const frameEnd = new dbft.AnimationFrame();
                            //         frameBegin._position = 0;
                            //         frameBegin.progress = 0.0;
                            //         frameBegin.tweenEasing = 0.0;
                            //         frameEnd._position = lastFramePosition;
                            //         frameEnd.progress = 1.0;
                            //         frameEnd.tweenEasing = 0.0;
                            //         animationTimeline.frame.push(frameBegin, frameEnd);
                            //         animationA.animation.push(animationTimeline);
                            //         modifyFrames(animationTimeline.frame);
                            //     }
                            // }
                            break;
                        }

                        case 3: {
                            break;
                        }
                    }
                }
                else if (baseData instanceof l2ft.BoxGridData) {
                    const keyFrames = baseData.pivotPoints;
                    const surface = armature.getBone(baseData.baseDataID) as dbft.Surface | null;
                    if (!surface) {
                        continue;
                    }

                    switch (paramPivotTable.length) {
                        case 0:
                            break;

                        case 1: {
                            const paramPivots = paramPivotTable[0];
                            const paramDef = model.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                            const totalValue = paramDef.maxValue - paramDef.minValue;

                            //
                            // const defaultValueIndex = paramPivots.pivotValue.indexOf(paramDef.defaultValue);
                            // if (defaultValueIndex > 0) {
                            //     const posePivotPoints = pivotPoints[defaultValueIndex];
                            //     for (let i = 0, l = posePivotPoints.length; i < l; ++i) {
                            //         if (isParentSurface) {
                            //             surface.vertices[i] = (posePivotPoints[i] - 0.5) * 400.0;
                            //         }
                            //         else {
                            //             surface.vertices[i] = posePivotPoints[i];
                            //         }
                            //     }
                            // }

                            let animation = armature.getAnimation(paramPivots.paramID) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = paramDef._frameCount;
                                animation.name = paramPivots.paramID;
                                armature.animation.push(animation);
                            }

                            const timeline = new dbft.SurfaceTimeline();
                            timeline.name = baseData.baseDataID;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const deformFrame = new dbft.DeformFrame();
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
                                const keyFrame = keyFrames[i];

                                deformFrame._position = Math.floor(progress * animation.duration);
                                deformFrame.tweenEasing = 0.0;

                                for (let i = 0, l = keyFrame.length; i < l; ++i) {
                                    if (isParentSurface) {
                                        deformFrame.vertices[i] = (keyFrame[i] - 0.5) * 400.0 - surface.vertices[i];
                                    }
                                    else {
                                        deformFrame.vertices[i] = keyFrame[i] - surface.vertices[i];
                                    }
                                }

                                timeline.frame.push(deformFrame);
                            }

                            modifyFrames(timeline.frame);
                            animation.surface.push(timeline);
                            break;
                        }

                        case 2: {
                            const paramPivotsA = paramPivotTable[0];
                            const paramPivotsB = paramPivotTable[1];
                            const paramDefA = model.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                            const paramDefB = model.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;
                            const totalValueA = paramDefA.maxValue - paramDefA.minValue;
                            const totalValueB = paramDefB.maxValue - paramDefB.minValue;

                            //
                            // const defaultValueIndex = paramPivotsA.pivotValue.indexOf(paramDefA.defaultValue) * paramPivotsB.pivotCount + paramPivotsB.pivotValue.indexOf(paramDefB.defaultValue);
                            // if (defaultValueIndex > 0) {
                            //     const posePivotPoints = pivotPoints[defaultValueIndex];
                            //     for (let i = 0, l = posePivotPoints.length; i < l; ++i) {
                            //         if (isParentSurface) {
                            //             surface.vertices[i] = (posePivotPoints[i] - 0.5) * 400.0;
                            //         }
                            //         else {
                            //             surface.vertices[i] = posePivotPoints[i];
                            //         }
                            //     }
                            // }
                            // Create parameters animaiton.
                            let animationA = armature.getAnimation(paramPivotsA.paramID) as dbft.Animation | null;
                            if (!animationA) {
                                animationA = new dbft.Animation();
                                animationA.playTimes = 0;
                                animationA.duration = paramDefA._frameCount;
                                animationA.name = paramPivotsA.paramID;
                                armature.animation.push(animationA);
                            }
                            // Create weight and time animaiton.
                            let animationB = armature.getAnimation(paramPivotsB.paramID) as dbft.Animation | null;
                            if (!animationB) {
                                animationB = new dbft.Animation();
                                animationB.playTimes = 0;
                                animationB.duration = paramDefB._frameCount;
                                animationB.name = paramPivotsB.paramID;
                                armature.animation.push(animationB);
                            }
                            // Create animations and timelines.
                            for (let col = 0; col < paramPivotsA.pivotCount; ++col) {
                                const childAnimationName = paramPivotsB.paramID + "_" + col;
                                let childAnimation = armature.getAnimation(childAnimationName) as dbft.Animation | null;
                                if (!childAnimation) {
                                    childAnimation = new dbft.Animation();
                                    childAnimation.duration = animationB.duration;
                                    childAnimation.name = childAnimationName;
                                    armature.animation.push(childAnimation);
                                }

                                const timeline = new dbft.SurfaceTimeline();
                                timeline.name = baseData.baseDataID;

                                for (let row = 0; row < paramPivotsB.pivotCount; ++row) {
                                    const pivotPointsIndex = col * paramPivotsB.pivotCount + row;
                                    const deformFrame = new dbft.DeformFrame();
                                    const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
                                    const keyFrame = keyFrames[pivotPointsIndex];

                                    deformFrame._position = Math.floor(progress * childAnimation.duration);
                                    deformFrame.tweenEasing = 0.0;

                                    for (let i = 0, l = keyFrame.length; i < l; ++i) {
                                        if (isParentSurface) {
                                            deformFrame.vertices[i] = (keyFrame[i] - 0.5) * 400.0 - surface.vertices[i];
                                        }
                                        else {
                                            deformFrame.vertices[i] = keyFrame[i] - surface.vertices[i];
                                        }
                                    }

                                    timeline.frame.push(deformFrame);
                                }

                                modifyFrames(timeline.frame);
                                childAnimation.surface.push(timeline);

                                if (!animationB.getAnimationTimeline(childAnimationName)) {
                                    const animationTimeline = new dbft.AnimationTimeline();
                                    animationTimeline.name = childAnimationName;
                                    animationTimeline.x = (paramPivotsA.pivotValue[col] - paramDefA.minValue) / totalValueA * 2.0 - 1.0;
                                    const frameBegin = new dbft.FloatFrame();
                                    const frameEnd = new dbft.FloatFrame();
                                    frameBegin._position = 0;
                                    frameBegin.progress = 0.0;
                                    frameBegin.tweenEasing = 0.0;
                                    frameEnd._position = animationB.duration;
                                    frameEnd.progress = 1.0;
                                    frameEnd.tweenEasing = 0.0;
                                    animationTimeline.frame.push(frameBegin, frameEnd);
                                    modifyFrames(animationTimeline.frame);
                                    animationB.animation.push(animationTimeline);
                                }

                                if (!animationA.getAnimationTimeline(animationB.name)) {
                                    const animationTimeline = new dbft.AnimationTimeline();
                                    animationTimeline.name = animationB.name;
                                    const frameBegin = new dbft.FloatFrame();
                                    const frameEnd = new dbft.FloatFrame();
                                    frameBegin._position = 0;
                                    frameBegin.progress = 0.0;
                                    frameBegin.tweenEasing = 0.0;
                                    frameEnd._position = animationB.duration;
                                    frameEnd.progress = 1.0;
                                    frameEnd.tweenEasing = 0.0;
                                    animationTimeline.frame.push(frameBegin, frameEnd);
                                    modifyFrames(animationTimeline.frame);
                                    animationB.animation.push(animationTimeline);
                                }
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

        // Slot timelines.
        // for (const drawData of drawList) {
        //     if (drawData instanceof l2ft.MeshData) {
        //         console.log(drawData);
        //         const posePoint = drawData.pivotPoints[0];
        //         const paramPivotTable = drawData.pivotManager.paramPivotTable;
        //         if (paramPivotTable.length === 2) {
        //             const firstParamPivot = paramPivotTable[0];
        //             const lastParamPivot = paramPivotTable[1];
        //             let opindex = 0;

        //             for (let row = 0; row < lastParamPivot.pivotCount; row++) {
        //                 let lastFramePosition = 0;
        //                 //
        //                 let animation = armature.getAnimation(drawData.drawDataID + "_" + row) as dbft.Animation;
        //                 if (animation === null) {
        //                     animation = new dbft.Animation();
        //                     animation.name = drawData.drawDataID + "_" + row;
        //                 }

        //                 animation.playTimes = 0;
        //                 animation.scale = 1.0;
        //                 const opacity = drawData.tempOpacity;
        //                 const points = drawData.tempPoints;

        //                 for (let col = 0; col < firstParamPivot.pivotCount; col++) {
        //                     //SlotTimeline
        //                     {
        //                         let timeline = animation.getSlotTimeline(drawData.drawDataID);
        //                         if (timeline === null) {
        //                             timeline = new dbft.SlotTimeline();
        //                             timeline.name = drawData.drawDataID;

        //                             animation.slot.push(timeline);
        //                         }

        //                         //
        //                         const colorFrame = new dbft.SlotColorFrame();
        //                         colorFrame._position = Math.floor(col * result.frameRate);
        //                         colorFrame.tweenEasing = 0.0;
        //                         console.log(opindex);
        //                         colorFrame.value.aM = opacity[opindex++] * 100.0;
        //                         timeline.colorFrame.push(colorFrame);
        //                         lastFramePosition = Math.max(colorFrame._position, lastFramePosition);
        //                         modifyFrames(timeline.colorFrame);
        //                     }

        //                     //MeshDeformTimeline
        //                     // {
        //                     //     let timeline = animation.getDeformTimeline(data.name);
        //                     //     if (timeline === null) {
        //                     //         timeline = new dbft.MeshDeformTimeline();
        //                     //         timeline.name = data.name;
        //                     //         timeline.slot = drawData.drawDataID;

        //                     //         animation.ffd.push(timeline);
        //                     //     }

        //                     //     const deformFrame = new dbft.DeformFrame();
        //                     //     deformFrame._position = Math.round(col * result.frameRate);
        //                     //     deformFrame.tweenEasing = 0.0;
        //                     //     timeline.frame.push(deformFrame);

        //                     //     const vertices = points[col];

        //                     //     for (let k = 0, l = vertices.length; k < l; k++) {
        //                     //         deformFrame.vertices.push(vertices[k] - posePoint[k]);
        //                     //     }

        //                     //     lastFramePosition = Math.max(deformFrame._position, lastFramePosition);
        //                     //     modifyFrames(timeline.frame);
        //                     // }

        //                 }
        //                 animation.duration = lastFramePosition + 1;
        //                 armature.animation.push(animation);
        //             }
        //         }
        //         // for (let row = 0, l = paramPivotTable.length; row < l; row++) {
        //         //     const paramPivot = paramPivotTable[row];

        //         //     const paramDef = model.getParamDef(paramPivot.paramID);
        //         //     if (paramDef === null) {
        //         //         continue;
        //         //     }

        //         //     for (let col = 0; col < paramPivot.pivotCount; col++) {
        //         //         let lastFramePosition = 0;
        //         //         //
        //         //         let animation = armature.getAnimation(drawData.drawDataID + "_" + col) as dbft.Animation;
        //         //         if (animation === null) {
        //         //             animation = new dbft.Animation();
        //         //             animation.name = drawData.drawDataID + "_" + col;
        //         //             console.log("new:" + animation.name);
        //         //         }
        //         //         else {
        //         //             console.log("old:" + animation.name);
        //         //         }
        //         //         animation.playTimes = 0;
        //         //         animation.scale = 1.0;

        //         //         const opacity = drawData.tempOpacity;
        //         //         const points = drawData.tempPoints;
        //         //         //SlotTimeline
        //         //         {
        //         //             let timeline = animation.getSlotTimeline(drawData.drawDataID);
        //         //             if (timeline === null) {
        //         //                 timeline = new dbft.SlotTimeline();
        //         //                 timeline.name = drawData.drawDataID;

        //         //                 animation.slot.push(timeline);
        //         //             }

        //         //             //
        //         //             const colorFrame = new dbft.SlotColorFrame();
        //         //             colorFrame._position = Math.round(col * result.frameRate);
        //         //             colorFrame.tweenEasing = 0.0;
        //         //             colorFrame.value.aM = opacity[col] * 100.0;
        //         //             timeline.colorFrame.push(colorFrame);
        //         //             lastFramePosition = Math.max(colorFrame._position, lastFramePosition);
        //         //             modifyFrames(timeline.colorFrame);
        //         //         }

        //         //         //MeshDeformTimeline
        //         //         // {
        //         //         //     let timeline = animation.getDeformTimeline(data.name);
        //         //         //     if (timeline === null) {
        //         //         //         timeline = new dbft.MeshDeformTimeline();
        //         //         //         timeline.name = data.name;
        //         //         //         timeline.slot = drawData.drawDataID;

        //         //         //         animation.ffd.push(timeline);
        //         //         //     }

        //         //         //     const deformFrame = new dbft.DeformFrame();
        //         //         //     deformFrame._position = Math.round(col * result.frameRate);
        //         //         //     deformFrame.tweenEasing = 0.0;
        //         //         //     timeline.frame.push(deformFrame);

        //         //         //     const vertices = points[col];

        //         //         //     for (let k = 0, l = vertices.length; k < l; k++) {
        //         //         //         deformFrame.vertices.push(vertices[k] - posePoint[k]);
        //         //         //     }

        //         //         //     lastFramePosition = Math.max(deformFrame._position, lastFramePosition);
        //         //         //     modifyFrames(timeline.frame);
        //         //         // }

        //         //         animation.duration = lastFramePosition + 1;
        //         //         armature.animation.push(animation);
        //         //     }


        //         // }
        //     }
        // }
    }

    return result;
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
