import * as dbft from "../format/dragonBonesFormat";
import * as l2ft from "../format/live2dFormat";

type Input = {
    name: string;
    data: l2ft.ModelImpl;
    textureAtlas: string;
    textureAtlasWidth: number;
    textureAtlasHeight: number;
};
/**
 * Convert Spine format to DragonBones format.
 */
export default function (data: Input): dbft.DragonBones | null {
    const model = data.data;
    const paramList = model.paramDefSet;
    const baseList = model.tempBaseList;
    const drawList = model.tempDrawList;
    // TextureAtlas.
    const textureAtlas = new dbft.TextureAtlas();
    textureAtlas.name = data.textureAtlas;
    textureAtlas.width = data.textureAtlasWidth;
    textureAtlas.height = data.textureAtlasHeight;
    textureAtlas.scale = 1.0;
    textureAtlas.imagePath = data.textureAtlas + ".png";
    //
    const subTexture = new dbft.Texture();
    subTexture.name = data.textureAtlas;
    subTexture.x = 0;
    subTexture.y = 0;
    subTexture.width = data.textureAtlasWidth;
    subTexture.height = data.textureAtlasHeight;
    textureAtlas.SubTexture.push(subTexture);
    //
    const result = new dbft.DragonBones();
    result.frameRate = 24;
    result.name = data.name;
    result.version = dbft.DATA_VERSION_5_5;
    result.compatibleVersion = dbft.DATA_VERSION_5_5;
    result.textureAtlas.push(textureAtlas);
    // Armature.
    const armature = new dbft.Armature();
    armature.name = data.name;
    result.armature.push(armature);
    // Bone.
    const root = new dbft.Bone();
    root.type = dbft.BoneType.Bone;
    root.name = "DST_BASE";
    root.length = 150.0;
    armature.bone.push(root);

    for (const baseData of baseList) {
        const isParentSurface = model.isSurface(baseData.targetBaseDataID);
        if (baseData instanceof l2ft.AffineData) {
            const bone = new dbft.Bone();
            bone.type = dbft.BoneType.Bone;
            bone.inheritRotation = true;
            bone.inheritScale = true;
            bone.inheritReflection = true;
            bone.length = 150.0;
            bone.name = baseData.baseDataID;
            bone.parent = baseData.targetBaseDataID;
            //
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
            surface.type = dbft.BoneType.Surface;
            surface.name = baseData.baseDataID;
            surface.parent = baseData.targetBaseDataID;
            surface.segmentX = baseData.col;
            surface.segmentY = baseData.row;
            //
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

    armature.sortBones();
    armature.localToGlobal();
    // Slot.
    for (const drawData of drawList) {
        if (drawData instanceof l2ft.MeshData) {
            const slot = new dbft.Slot();
            slot.name = drawData.drawDataID;
            slot.parent = drawData.targetBaseDataID;
            armature.slot.push(slot);
        }
    }
    // Skin.
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
    // Animation.
    if (paramList.paramDefSet.length > 0) {
        for (const baseData of baseList) { // Bone Timelines.
            if (baseData instanceof l2ft.AffineData) {
                const paramPivotTable = baseData.pivotManager.paramPivotTable;
                const affines = baseData.tempAffines;

                for (let row = 0, l = paramPivotTable.length; row < l; row++) {
                    const paramPivots = paramPivotTable[row];
                    const paramDef = model.getParamDef(paramPivots.paramID);
                    if (paramDef === null) {
                        continue;
                    }

                    let lastFramePosition = 0;
                    let animation = armature.getAnimation(paramDef.paramID) as dbft.Animation;

                    if (animation === null) {
                        animation = new dbft.Animation();
                        animation.playTimes = 0; //
                        animation.name = paramDef.paramID;
                        armature.animation.push(animation);
                    }

                    for (let col = 0; col < paramPivots.pivotCount; col++) {
                        let timeline = animation.getBoneTimeline(baseData.baseDataID);
                        if (timeline === null) {
                            timeline = new dbft.BoneTimeline();
                            timeline.name = baseData.baseDataID;
                            animation.bone.push(timeline);
                        }

                        const translateFrame = new dbft.BoneTranslateFrame();
                        translateFrame._position = Math.floor(col * result.frameRate);
                        translateFrame.x = affines[col].originX;
                        translateFrame.y = affines[col].originY;
                        translateFrame.tweenEasing = 0.0;
                        timeline.translateFrame.push(translateFrame);
                        lastFramePosition = Math.max(translateFrame._position, lastFramePosition);

                        const rotateFrame = new dbft.BoneRotateFrame();
                        rotateFrame._position = Math.floor(col * result.frameRate);
                        rotateFrame.rotate = affines[col].rotateDeg;
                        rotateFrame.tweenEasing = 0.0;
                        timeline.rotateFrame.push(rotateFrame);
                        lastFramePosition = Math.max(rotateFrame._position, lastFramePosition);

                        const scaleFrame = new dbft.BoneScaleFrame();
                        scaleFrame._position = Math.floor(col * result.frameRate);
                        scaleFrame.x = affines[col].scaleX;
                        scaleFrame.y = affines[col].scaleY;
                        scaleFrame.tweenEasing = 0.0;
                        timeline.scaleFrame.push(scaleFrame);
                        lastFramePosition = Math.max(scaleFrame._position, lastFramePosition);

                        // modifyFrames(timeline.translateFrame);
                        // modifyFrames(timeline.rotateFrame);
                        // modifyFrames(timeline.scaleFrame);
                    }

                    //
                    animation.duration = lastFramePosition + 1;
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
