import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";
import * as l2ft from "../format/live2DFormat";

const rotateMatrix = geom.helpMatrixA;
const helpAffineA = new l2ft.Transform();
const helpAffineB = new l2ft.Transform();
const helpVerticesA: number[] = [];
const helpVerticesB: number[] = [];

let modelConfig: l2ft.ModelConfig;
let result: dbft.DragonBones;
let armature: dbft.Armature;
let defaultSkin: dbft.Skin;
/**
 * Convert Live2D format to DragonBones format.
 */
export default function (data: l2ft.ModelConfig): dbft.DragonBones | null {
    modelConfig = data;
    const drawList = modelConfig.modelImpl.tempDrawList;
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

    for (const partsData of modelConfig.modelImpl.partsDataList) {
        for (const baseData of partsData.baseDataList) {
            const isSurfaceParent = modelConfig.modelImpl.isSurface(baseData.targetBaseDataID);
            const paramPivotTable = baseData.pivotManager.paramPivotTable;

            if (baseData instanceof l2ft.AffineData) {
                const bone = new dbft.Bone();
                bone.length = 150.0;
                bone.name = baseData.baseDataID;
                bone.parent = baseData.targetBaseDataID === rootBone.name ? "" : baseData.targetBaseDataID;

                switch (paramPivotTable.length) {
                    case 1: {
                        const paramPivots = paramPivotTable[0];
                        const paramDef = modelConfig.modelImpl.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                        let index = paramPivots.pivotValue.indexOf(paramDef.defaultValue);
                        if (index >= 0) {
                            helpAffineA.copyFrom(baseData.affines[index]);
                        }
                        else {
                            for (const value of paramPivots.pivotValue) {
                                index++;
                                if (value > paramDef.defaultValue) {
                                    const prevValue = paramPivots.pivotValue[index - 1];
                                    helpAffineA.interpolation(
                                        baseData.affines[index - 1],
                                        baseData.affines[index],
                                        (paramDef.defaultValue - prevValue) / (value - prevValue)
                                    );
                                    break;
                                }
                            }
                        }
                        break;
                    }

                    case 2: {
                        const paramPivotsA = paramPivotTable[0];
                        const paramPivotsB = paramPivotTable[1];
                        const paramDefA = modelConfig.modelImpl.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                        const paramDefB = modelConfig.modelImpl.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;

                        let indexA = paramPivotsA.pivotValue.indexOf(paramDefA.defaultValue);
                        let indexB = paramPivotsB.pivotValue.indexOf(paramDefB.defaultValue);

                        if (indexA >= 0 && indexB >= 0) {
                            helpAffineA.copyFrom(baseData.affines[indexA * paramPivotsB.pivotCount + indexB]);
                        }
                        else if (indexA >= 0) {
                            for (const value of paramPivotsB.pivotValue) {
                                indexB++;
                                if (value > paramDefB.defaultValue) {
                                    const prevValue = paramPivotsB.pivotValue[indexB - 1];
                                    helpAffineA.interpolation(
                                        baseData.affines[indexA * paramPivotsB.pivotCount + indexB - 1],
                                        baseData.affines[indexA * paramPivotsB.pivotCount + indexB],
                                        (paramDefB.defaultValue - prevValue) / (value - prevValue)
                                    );
                                    break;
                                }
                            }
                        }
                        else if (indexB >= 0) {
                            for (const value of paramPivotsA.pivotValue) {
                                indexA++;
                                if (value > paramDefA.defaultValue) {
                                    const prevValue = paramPivotsA.pivotValue[indexA - 1];
                                    helpAffineA.interpolation(
                                        baseData.affines[(indexA - 1) * paramPivotsB.pivotCount + indexB],
                                        baseData.affines[indexA * paramPivotsB.pivotCount + indexB],
                                        (paramDefA.defaultValue - prevValue) / (value - prevValue)
                                    );
                                    break;
                                }
                            }
                        }
                        else {
                            let progressB = 0.0;
                            for (const value of paramPivotsB.pivotValue) {
                                indexB++;
                                if (value > paramDefB.defaultValue) {
                                    const prevValue = paramPivotsB.pivotValue[indexB - 1];
                                    progressB = (paramDefB.defaultValue - prevValue) / (value - prevValue);
                                    break;
                                }
                            }

                            for (const value of paramPivotsA.pivotValue) {
                                indexA++;
                                if (value > paramDefA.defaultValue) {
                                    const prevValue = paramPivotsA.pivotValue[indexA - 1];
                                    helpAffineA.interpolation(
                                        baseData.affines[(indexA - 1) * paramPivotsB.pivotCount + indexB],
                                        baseData.affines[(indexA - 1) * paramPivotsB.pivotCount + indexB + 1],
                                        progressB
                                    );
                                    helpAffineB.interpolation(
                                        baseData.affines[indexA * paramPivotsB.pivotCount + indexB],
                                        baseData.affines[indexA * paramPivotsB.pivotCount + indexB + 1],
                                        progressB
                                    );
                                    helpAffineA.interpolation(
                                        helpAffineA,
                                        helpAffineB,
                                        (paramDefA.defaultValue - prevValue) / (value - prevValue)
                                    );
                                    break;
                                }
                            }
                        }
                        break;
                    }

                    case 3: // TODO
                    default:
                        helpAffineA.copyFrom(baseData.affines[0]);
                        break;
                }

                if (isSurfaceParent) { // Scale and rotate.
                    bone.transform.x = (helpAffineA.originX - 0.5) * 400.0;
                    bone.transform.y = (helpAffineA.originY - 0.5) * 400.0;
                    bone.transform.skY = helpAffineA.rotateDeg - 90.0;
                    bone.transform.skX = helpAffineA.rotateDeg - 90.0;
                    bone.inheritScale = false;
                }
                else if (bone.parent) { // Rotate.
                    rotateMatrix.transformPoint(helpAffineA.originX, helpAffineA.originY, bone.transform);
                    bone.transform.skY = helpAffineA.rotateDeg;
                    bone.transform.skX = helpAffineA.rotateDeg;
                }
                else { // Rotate and offset.
                    bone.transform.x = helpAffineA.originX - modelConfig.modelImpl.canvasWidth * 0.5;
                    bone.transform.y = helpAffineA.originY - modelConfig.modelImpl.canvasHeight;
                    bone.transform.skY = helpAffineA.rotateDeg - 90.0;
                    bone.transform.skX = helpAffineA.rotateDeg - 90.0;
                }

                bone.transform.scX = helpAffineA.scaleX * (helpAffineA.reflectX ? -1.0 : 1.0);
                bone.transform.scY = helpAffineA.scaleY * (helpAffineA.reflectY ? -1.0 : 1.0);

                armature.bone.push(bone);
            }
            else if (baseData instanceof l2ft.BoxGridData) {
                const surface = new dbft.Surface();
                surface.segmentX = baseData.col;
                surface.segmentY = baseData.row;
                surface.name = baseData.baseDataID;
                surface.parent = baseData.targetBaseDataID === rootBone.name ? "" : baseData.targetBaseDataID;

                switch (paramPivotTable.length) {
                    case 1: {
                        const paramPivots = paramPivotTable[0];
                        const paramDef = modelConfig.modelImpl.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                        let index = paramPivots.pivotValue.indexOf(paramDef.defaultValue);
                        if (index >= 0) {
                            vertivesCopyFrom(helpVerticesA, baseData.pivotPoints[index]);
                        }
                        else {
                            for (const value of paramPivots.pivotValue) {
                                index++;
                                if (value > paramDef.defaultValue) {
                                    const prevValue = paramPivots.pivotValue[index - 1];
                                    vertivesInterpolation(
                                        helpVerticesA,
                                        baseData.pivotPoints[index - 1],
                                        baseData.pivotPoints[index],
                                        (paramDef.defaultValue - prevValue) / (value - prevValue)
                                    );
                                    break;
                                }
                            }
                        }
                        break;
                    }

                    case 2: {
                        const paramPivotsA = paramPivotTable[0];
                        const paramPivotsB = paramPivotTable[1];
                        const paramDefA = modelConfig.modelImpl.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                        const paramDefB = modelConfig.modelImpl.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;

                        let indexA = paramPivotsA.pivotValue.indexOf(paramDefA.defaultValue);
                        let indexB = paramPivotsB.pivotValue.indexOf(paramDefB.defaultValue);

                        if (indexA >= 0 && indexB >= 0) {
                            vertivesCopyFrom(helpVerticesA, baseData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB]);
                        }
                        else if (indexA >= 0) {
                            for (const value of paramPivotsB.pivotValue) {
                                indexB++;
                                if (value > paramDefB.defaultValue) {
                                    const prevValue = paramPivotsB.pivotValue[indexB - 1];
                                    vertivesInterpolation(
                                        helpVerticesA,
                                        baseData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB - 1],
                                        baseData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB],
                                        (paramDefB.defaultValue - prevValue) / (value - prevValue)
                                    );
                                    break;
                                }
                            }
                        }
                        else if (indexB >= 0) {
                            for (const value of paramPivotsA.pivotValue) {
                                indexA++;
                                if (value > paramDefA.defaultValue) {
                                    const prevValue = paramPivotsA.pivotValue[indexA - 1];
                                    vertivesInterpolation(
                                        helpVerticesA,
                                        baseData.pivotPoints[(indexA - 1) * paramPivotsB.pivotCount + indexB],
                                        baseData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB],
                                        (paramDefA.defaultValue - prevValue) / (value - prevValue)
                                    );
                                    break;
                                }
                            }
                        }
                        else {
                            let progressB = 0.0;
                            for (const value of paramPivotsB.pivotValue) {
                                indexB++;
                                if (value > paramDefB.defaultValue) {
                                    const prevValue = paramPivotsB.pivotValue[indexB - 1];
                                    progressB = (paramDefB.defaultValue - prevValue) / (value - prevValue);
                                    break;
                                }
                            }

                            for (const value of paramPivotsA.pivotValue) {
                                indexA++;
                                if (value > paramDefA.defaultValue) {
                                    const prevValue = paramPivotsA.pivotValue[indexA];
                                    vertivesInterpolation(
                                        helpVerticesA,
                                        baseData.pivotPoints[(indexA - 1) * paramPivotsB.pivotCount + indexB],
                                        baseData.pivotPoints[(indexA - 1) * paramPivotsB.pivotCount + indexB + 1],
                                        progressB
                                    );
                                    vertivesInterpolation(
                                        helpVerticesB,
                                        baseData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB],
                                        baseData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB + 1],
                                        progressB
                                    );
                                    vertivesInterpolation(
                                        helpVerticesA,
                                        helpVerticesA,
                                        helpVerticesB,
                                        (paramDefA.defaultValue - prevValue) / (value - prevValue)
                                    );
                                    break;
                                }
                            }
                        }
                        break;
                    }

                    case 3: // TODO
                    default:
                        vertivesCopyFrom(helpVerticesA, baseData.pivotPoints[0]);
                        break;
                }

                surface.vertices.length = helpVerticesA.length;

                for (let i = 0, l = helpVerticesA.length; i < l; i += 2) {
                    if (isSurfaceParent) { // Scale.
                        surface.vertices[i] = (helpVerticesA[i] - 0.5) * 400.0;
                        surface.vertices[i + 1] = (helpVerticesA[i + 1] - 0.5) * 400.0;
                    }
                    else if (surface.parent) { // Rotate.
                        rotateMatrix.transformPoint(helpVerticesA[i], helpVerticesA[i + 1], geom.helpPointA);
                        surface.vertices[i] = geom.helpPointA.x;
                        surface.vertices[i + 1] = geom.helpPointA.y;
                    }
                    else { // Offset.
                        surface.vertices[i] = helpVerticesA[i] - modelConfig.modelImpl.canvasWidth * 0.5;
                        surface.vertices[i + 1] = helpVerticesA[i + 1] - modelConfig.modelImpl.canvasHeight;
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

    for (const drawData of drawList) {
        const isSurfaceParent = modelConfig.modelImpl.isSurface(drawData.targetBaseDataID);
        const paramPivotTable = drawData.pivotManager.paramPivotTable;

        if (drawData instanceof l2ft.MeshData) {
            // Create slots.
            const slot = new dbft.Slot();
            slot.name = drawData.drawDataID;
            slot.parent = drawData.targetBaseDataID;
            slot.color.aM = Math.max(Math.round(drawData.pivotOpacity[0] * 100), 100); // TODO
            armature.slot.push(slot);
            // Create displays.
            const display = new dbft.MeshDisplay();
            display.name = drawData.drawDataID;
            display.path = (drawData.textureIndex >= 0 ? drawData.textureIndex : 0).toString();
            // UVs.
            for (const value of drawData.uvmap) {
                display.uvs.push(value);
            }
            // Triangles.
            for (const index of drawData.indexArray) {
                display.triangles.push(index);
            }
            // Vertices.
            switch (paramPivotTable.length) {
                case 1: {
                    const paramPivots = paramPivotTable[0];
                    const paramDef = modelConfig.modelImpl.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                    let index = paramPivots.pivotValue.indexOf(paramDef.defaultValue);
                    if (index >= 0) {
                        vertivesCopyFrom(helpVerticesA, drawData.pivotPoints[index]);
                    }
                    else {
                        for (const value of paramPivots.pivotValue) {
                            index++;
                            if (value > paramDef.defaultValue) {
                                const prevValue = paramPivots.pivotValue[index - 1];
                                vertivesInterpolation(
                                    helpVerticesA,
                                    drawData.pivotPoints[index - 1],
                                    drawData.pivotPoints[index],
                                    (paramDef.defaultValue - prevValue) / (value - prevValue)
                                );
                                break;
                            }
                        }
                    }
                    break;
                }

                case 2: {
                    const paramPivotsA = paramPivotTable[0];
                    const paramPivotsB = paramPivotTable[1];
                    const paramDefA = modelConfig.modelImpl.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                    const paramDefB = modelConfig.modelImpl.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;

                    let indexA = paramPivotsA.pivotValue.indexOf(paramDefA.defaultValue);
                    let indexB = paramPivotsB.pivotValue.indexOf(paramDefB.defaultValue);

                    if (indexA >= 0 && indexB >= 0) {
                        vertivesCopyFrom(helpVerticesA, drawData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB]);
                    }
                    else if (indexA >= 0) {
                        for (const value of paramPivotsB.pivotValue) {
                            indexB++;
                            if (value > paramDefB.defaultValue) {
                                const prevValue = paramPivotsB.pivotValue[indexB - 1];
                                vertivesInterpolation(
                                    helpVerticesA,
                                    drawData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB - 1],
                                    drawData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB],
                                    (paramDefB.defaultValue - prevValue) / (value - prevValue)
                                );
                                break;
                            }
                        }
                    }
                    else if (indexB >= 0) {
                        for (const value of paramPivotsA.pivotValue) {
                            indexA++;
                            if (value > paramDefA.defaultValue) {
                                const prevValue = paramPivotsA.pivotValue[indexA - 1];
                                vertivesInterpolation(
                                    helpVerticesA,
                                    drawData.pivotPoints[(indexA - 1) * paramPivotsB.pivotCount + indexB],
                                    drawData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB],
                                    (paramDefA.defaultValue - prevValue) / (value - prevValue)
                                );
                                break;
                            }
                        }
                    }
                    else {
                        let progressB = 0.0;
                        for (const value of paramPivotsB.pivotValue) {
                            indexB++;
                            if (value > paramDefB.defaultValue) {
                                const prevValue = paramPivotsB.pivotValue[indexB - 1];
                                progressB = (paramDefB.defaultValue - prevValue) / (value - prevValue);
                                break;
                            }
                        }

                        for (const value of paramPivotsA.pivotValue) {
                            indexA++;
                            if (value > paramDefA.defaultValue) {
                                const prevValue = paramPivotsA.pivotValue[indexA];
                                vertivesInterpolation(
                                    helpVerticesA,
                                    drawData.pivotPoints[(indexA - 1) * paramPivotsB.pivotCount + indexB],
                                    drawData.pivotPoints[(indexA - 1) * paramPivotsB.pivotCount + indexB + 1],
                                    progressB
                                );
                                vertivesInterpolation(
                                    helpVerticesB,
                                    drawData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB],
                                    drawData.pivotPoints[indexA * paramPivotsB.pivotCount + indexB + 1],
                                    progressB
                                );
                                vertivesInterpolation(
                                    helpVerticesA,
                                    helpVerticesA,
                                    helpVerticesB,
                                    (paramDefA.defaultValue - prevValue) / (value - prevValue)
                                );
                                break;
                            }
                        }
                    }
                    break;
                }

                case 3: // TODO
                default:
                    vertivesCopyFrom(helpVerticesA, drawData.pivotPoints[0]);
                    break;
            }

            display.vertices.length = helpVerticesA.length;

            for (let i = 0, l = helpVerticesA.length; i < l; i += 2) {
                if (isSurfaceParent) { // Scale.
                    display.vertices[i] = (helpVerticesA[i] - 0.5) * 400.0;
                    display.vertices[i + 1] = (helpVerticesA[i + 1] - 0.5) * 400.0;
                }
                else if (slot.parent !== rootBone.name) { // Rotate.
                    rotateMatrix.transformPoint(helpVerticesA[i], helpVerticesA[i + 1], geom.helpPointA);
                    display.vertices[i] = geom.helpPointA.x;
                    display.vertices[i + 1] = geom.helpPointA.y;
                }
                else { // Offset.
                    display.vertices[i] = helpVerticesA[i] - modelConfig.modelImpl.canvasWidth * 0.5;
                    display.vertices[i + 1] = helpVerticesA[i + 1] - modelConfig.modelImpl.canvasHeight;
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
            defaultSkin.slot.push(skinSlot);
            // console.log(drawData.drawDataID);
            // console.log(drawData.pivotDrawOrder);
            // console.log(drawData.pivotOpacity);
        }
    }

    armature.skin.push(defaultSkin);
    // Create animations.
    if (modelConfig.modelImpl.paramDefSet.paramDefSet.length > 0) {
        for (const partsData of modelConfig.modelImpl.partsDataList) {
            // Create bone timelines.
            for (const baseData of partsData.baseDataList) {
                const isSurfaceParent = modelConfig.modelImpl.isSurface(baseData.targetBaseDataID);
                const paramPivotTable = baseData.pivotManager.paramPivotTable;

                if (baseData instanceof l2ft.AffineData) {
                    const bone = armature.getBone(baseData.baseDataID);
                    if (!bone) {
                        continue;
                    }

                    const l2Frames = baseData.affines;

                    switch (paramPivotTable.length) {
                        case 0:
                            break;

                        case 1: {
                            const paramPivots = paramPivotTable[0];
                            const paramDef = modelConfig.modelImpl.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                            const totalValue = paramDef.maxValue - paramDef.minValue;
                            // Create animation.
                            let animation = armature.getAnimation(paramPivots.paramID) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = paramPivots.paramID;
                                armature.animation.push(animation);
                            }
                            // Create timeline.
                            const timeline = new dbft.BoneTimeline();
                            timeline.name = bone.name;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
                                let x = 0.0;
                                let y = 0.0;
                                const l2Frame = l2Frames[i];
                                const translateFrame = new dbft.BoneTranslateFrame();
                                const rotateFrame = new dbft.BoneRotateFrame();
                                const scaleFrame = new dbft.BoneScaleFrame();

                                translateFrame._position = rotateFrame._position = scaleFrame._position = Math.floor(progress * animation.duration);
                                translateFrame.tweenEasing = rotateFrame.tweenEasing = scaleFrame.tweenEasing = 0.0;

                                if (isSurfaceParent) {
                                    x = (l2Frame.originX - 0.5) * 400.0;
                                    y = (l2Frame.originY - 0.5) * 400.0;
                                }
                                else {
                                    x = l2Frame.originX;
                                    y = l2Frame.originY;
                                }

                                if (!bone.parent || isSurfaceParent) {
                                    if (!bone.parent) {
                                        translateFrame.x = x - bone.transform.x - modelConfig.modelImpl.canvasWidth * 0.5;
                                        translateFrame.y = y - bone.transform.y - modelConfig.modelImpl.canvasHeight;
                                    }
                                    else {
                                        translateFrame.x = x - bone.transform.x;
                                        translateFrame.y = y - bone.transform.y;
                                    }

                                    rotateFrame.rotate = l2Frame.rotateDeg - bone.transform.skY - 90.0;
                                }
                                else {
                                    rotateMatrix.transformPoint(x, y, translateFrame);
                                    translateFrame.x -= bone.transform.x;
                                    translateFrame.y -= bone.transform.y;
                                    rotateFrame.rotate = l2Frame.rotateDeg - bone.transform.skY;
                                }

                                scaleFrame.x = l2Frame.scaleX * (l2Frame.reflectX ? -1.0 : 1.0) - bone.transform.scX;
                                scaleFrame.y = l2Frame.scaleY * (l2Frame.reflectY ? -1.0 : 1.0) - bone.transform.scY;

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
                            const paramPivotsA = paramPivotTable[0];
                            const paramPivotsB = paramPivotTable[1];
                            const paramDefA = modelConfig.modelImpl.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                            const paramDefB = modelConfig.modelImpl.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;
                            const totalValueA = paramDefA.maxValue - paramDefA.minValue;
                            const totalValueB = paramDefB.maxValue - paramDefB.minValue;
                            // Create parameters animaiton.
                            let animationA = armature.getAnimation(paramPivotsA.paramID) as dbft.Animation | null;
                            if (!animationA) {
                                animationA = new dbft.Animation();
                                animationA.playTimes = 0;
                                animationA.duration = result.frameRate;
                                animationA.name = paramPivotsA.paramID;
                                animationA.type = dbft.AnimationType.Tree;
                                animationA.blendType = dbft.AnimationBlendType.E1D;
                                armature.animation.push(animationA);
                            }
                            // Create weight and time animaiton.
                            let animationB = armature.getAnimation(paramPivotsB.paramID) as dbft.Animation | null;
                            if (!animationB) {
                                animationB = new dbft.Animation();
                                animationB.playTimes = 0;
                                animationB.duration = result.frameRate;
                                animationB.name = paramPivotsB.paramID;
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

                            for (let col = 0; col < paramPivotsA.pivotCount; ++col) {
                                const childAnimationName = bone.name + "_" + col.toString().padStart(2, "0");
                                let childAnimation = armature.getAnimation(childAnimationName) as dbft.Animation | null;
                                if (!childAnimation) {
                                    childAnimation = new dbft.Animation();
                                    childAnimation.playTimes = 0;
                                    childAnimation.duration = animationB.duration;
                                    childAnimation.name = childAnimationName;
                                    childAnimation.type = dbft.AnimationType.Node;
                                    armature.animation.push(childAnimation);
                                }

                                const timeline = new dbft.BoneTimeline();
                                timeline.name = bone.name;

                                for (let row = 0; row < paramPivotsB.pivotCount; ++row) {
                                    const frameIndex = col + row * paramPivotsA.pivotCount;
                                    let x = 0.0;
                                    let y = 0.0;
                                    const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
                                    const l2Frame = l2Frames[frameIndex];
                                    const translateFrame = new dbft.BoneTranslateFrame();
                                    const rotateFrame = new dbft.BoneRotateFrame();
                                    const scaleFrame = new dbft.BoneScaleFrame();

                                    translateFrame._position = rotateFrame._position = scaleFrame._position = Math.floor(progress * childAnimation.duration);
                                    translateFrame.tweenEasing = rotateFrame.tweenEasing = scaleFrame.tweenEasing = 0.0;

                                    if (isSurfaceParent) {
                                        x = (l2Frame.originX - 0.5) * 400.0;
                                        y = (l2Frame.originY - 0.5) * 400.0;
                                    }
                                    else {
                                        x = l2Frame.originX;
                                        y = l2Frame.originY;
                                    }

                                    if (!bone.parent || isSurfaceParent) {
                                        if (!bone.parent) {
                                            translateFrame.x = x - bone.transform.x - modelConfig.modelImpl.canvasWidth * 0.5;
                                            translateFrame.y = y - bone.transform.y - modelConfig.modelImpl.canvasHeight;
                                        }
                                        else {
                                            translateFrame.x = x - bone.transform.x;
                                            translateFrame.y = y - bone.transform.y;
                                        }

                                        rotateFrame.rotate = l2Frame.rotateDeg - bone.transform.skY - 90.0;
                                    }
                                    else {
                                        rotateMatrix.transformPoint(x, y, translateFrame);
                                        translateFrame.x -= bone.transform.x;
                                        translateFrame.y -= bone.transform.y;
                                        rotateFrame.rotate = l2Frame.rotateDeg - bone.transform.skY;
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
                                    (paramPivotsA.pivotValue[col] - paramDefA.minValue) / totalValueA * 2.0 - 1.0
                                );
                            }
                            break;
                        }

                        case 3: { // TODO
                            break;
                        }
                    }
                }
                else if (baseData instanceof l2ft.BoxGridData) {
                    const surface = armature.getBone(baseData.baseDataID) as dbft.Surface | null;
                    if (!surface) {
                        continue;
                    }

                    const l2DeformFrames = baseData.pivotPoints;

                    switch (paramPivotTable.length) {
                        case 0:
                            break;

                        case 1: {
                            const paramPivots = paramPivotTable[0];
                            const paramDef = modelConfig.modelImpl.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                            const totalValue = paramDef.maxValue - paramDef.minValue;
                            // Create animation.
                            let animation = armature.getAnimation(paramPivots.paramID) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = paramPivots.paramID;
                                armature.animation.push(animation);
                            }
                            // Create timeline.
                            const timeline = new dbft.DeformTimeline();
                            timeline.name = surface.name;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
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
                            const paramPivotsA = paramPivotTable[0];
                            const paramPivotsB = paramPivotTable[1];
                            const paramDefA = modelConfig.modelImpl.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                            const paramDefB = modelConfig.modelImpl.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;
                            const totalValueA = paramDefA.maxValue - paramDefA.minValue;
                            const totalValueB = paramDefB.maxValue - paramDefB.minValue;
                            // Create parameters animaiton.
                            let animationA = armature.getAnimation(paramPivotsA.paramID) as dbft.Animation | null;
                            if (!animationA) {
                                animationA = new dbft.Animation();
                                animationA.playTimes = 0;
                                animationA.duration = result.frameRate;
                                animationA.name = paramPivotsA.paramID;
                                animationA.type = dbft.AnimationType.Tree;
                                animationA.blendType = dbft.AnimationBlendType.E1D;
                                armature.animation.push(animationA);
                            }
                            // Create weight and time animaiton.
                            let animationB = armature.getAnimation(paramPivotsB.paramID) as dbft.Animation | null;
                            if (!animationB) {
                                animationB = new dbft.Animation();
                                animationB.playTimes = 0;
                                animationB.duration = result.frameRate;
                                animationB.name = paramPivotsB.paramID;
                                animationB.type = dbft.AnimationType.Tree;
                                armature.animation.push(animationB);
                            }
                            // Create animations and timelines.
                            const animation = new dbft.Animation();
                            animation.playTimes = 0;
                            animation.duration = result.frameRate;
                            animation.name = surface.name;
                            animation.type = dbft.AnimationType.Tree;
                            animation.blendType = dbft.AnimationBlendType.E1D;
                            armature.animation.push(animation);

                            for (let col = 0; col < paramPivotsA.pivotCount; ++col) {
                                const childAnimationName = surface.name + "_" + col.toString().padStart(2, "0");
                                let childAnimation = armature.getAnimation(childAnimationName) as dbft.Animation | null;
                                if (!childAnimation) {
                                    childAnimation = new dbft.Animation();
                                    childAnimation.playTimes = 0;
                                    childAnimation.duration = animationB.duration;
                                    childAnimation.name = childAnimationName;
                                    childAnimation.type = dbft.AnimationType.Node;
                                    armature.animation.push(childAnimation);
                                }

                                const timeline = new dbft.DeformTimeline();
                                timeline.name = surface.name;

                                for (let row = 0; row < paramPivotsB.pivotCount; ++row) {
                                    const frameIndex = col * paramPivotsB.pivotCount + row;
                                    const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
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
                                    animationA, animationB, animation, childAnimation,
                                    (paramPivotsA.pivotValue[col] - paramDefA.minValue) / totalValueA * 2.0 - 1.0
                                );
                            }
                            break;
                        }

                        case 3: { // TODO
                            break;
                        }
                    }
                }
            }
            // Create slot timeines.
            for (const drawData of partsData.drawDataList) {
                const isSurfaceParent = modelConfig.modelImpl.isSurface(drawData.targetBaseDataID);
                const paramPivotTable = drawData.pivotManager.paramPivotTable;

                if (drawData instanceof l2ft.MeshData) {
                    const slot = armature.getSlot(drawData.drawDataID);
                    const meshDisplay = armature.getMesh(defaultSkin.name, drawData.drawDataID, drawData.drawDataID);
                    if (!slot || !meshDisplay) {
                        continue;
                    }

                    const l2ColorFrames = drawData.pivotOpacity;
                    const l2DeformFrames = drawData.pivotPoints;

                    switch (paramPivotTable.length) {
                        case 0:
                            break;

                        case 1: {
                            const paramPivots = paramPivotTable[0];
                            const paramDef = modelConfig.modelImpl.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                            const totalValue = paramDef.maxValue - paramDef.minValue;
                            // Create animation.
                            let animation = armature.getAnimation(paramPivots.paramID) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = paramPivots.paramID;
                                armature.animation.push(animation);
                            }
                            // Create timelines.
                            const colorTimeline = new dbft.SlotTimeline();
                            const deformTimeline = new dbft.SlotDeformTimeline();
                            colorTimeline.name = slot.name;
                            deformTimeline.name = meshDisplay.name;
                            deformTimeline.slot = slot.name;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
                                const l2ColorFrame = l2ColorFrames[i];
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
                            const paramPivotsA = paramPivotTable[0];
                            const paramPivotsB = paramPivotTable[1];
                            const paramDefA = modelConfig.modelImpl.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                            const paramDefB = modelConfig.modelImpl.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;
                            const totalValueA = paramDefA.maxValue - paramDefA.minValue;
                            const totalValueB = paramDefB.maxValue - paramDefB.minValue;
                            // Create parameters animaiton.
                            let animationA = armature.getAnimation(paramPivotsA.paramID) as dbft.Animation | null;
                            if (!animationA) {
                                animationA = new dbft.Animation();
                                animationA.playTimes = 0;
                                animationA.duration = result.frameRate;
                                animationA.name = paramPivotsA.paramID;
                                animationA.type = dbft.AnimationType.Tree;
                                animationA.blendType = dbft.AnimationBlendType.E1D;
                                armature.animation.push(animationA);
                            }
                            // Create weight and time animaiton.
                            let animationB = armature.getAnimation(paramPivotsB.paramID) as dbft.Animation | null;
                            if (!animationB) {
                                animationB = new dbft.Animation();
                                animationB.playTimes = 0;
                                animationB.duration = result.frameRate;
                                animationB.name = paramPivotsB.paramID;
                                animationB.type = dbft.AnimationType.Tree;
                                armature.animation.push(animationB);
                            }
                            // Create animations and timelines.
                            const animation = new dbft.Animation();
                            animation.playTimes = 0;
                            animation.duration = result.frameRate;
                            animation.name = slot.name;
                            animation.type = dbft.AnimationType.Tree;
                            animation.blendType = dbft.AnimationBlendType.E1D;
                            armature.animation.push(animation);

                            for (let col = 0; col < paramPivotsA.pivotCount; ++col) {
                                const childAnimationName = slot.name + "_" + col.toString().padStart(2, "0");
                                let childAnimation = armature.getAnimation(childAnimationName) as dbft.Animation | null;
                                if (!childAnimation) {
                                    childAnimation = new dbft.Animation();
                                    childAnimation.playTimes = 0;
                                    childAnimation.duration = animationB.duration;
                                    childAnimation.name = childAnimationName;
                                    childAnimation.type = dbft.AnimationType.Node;
                                    armature.animation.push(childAnimation);
                                }
                                // Create timelines.
                                const colorTimeline = new dbft.SlotTimeline();
                                const deformTimeline = new dbft.SlotDeformTimeline();
                                colorTimeline.name = slot.name;
                                deformTimeline.name = meshDisplay.name;
                                deformTimeline.slot = slot.name;

                                for (let row = 0; row < paramPivotsB.pivotCount; ++row) {
                                    const frameIndex = col + row * paramPivotsA.pivotCount;
                                    const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
                                    const l2ColorFrame = l2ColorFrames[frameIndex];
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
                                    animationA, animationB, animation, childAnimation,
                                    (paramPivotsA.pivotValue[col] - paramDefA.minValue) / totalValueA * 2.0 - 1.0
                                );
                            }
                            break;
                        }

                        case 3: { // TODO
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

                const animationName = motionName + "_" + index.toString().padStart(2, "0");
                const animation = new dbft.Animation();
                animation.playTimes = 0;
                animation.name = animationName;
                animation.type = dbft.AnimationType.Tree;

                for (const timelineName in motionConfig.motion.values) {
                    const paramDef = modelConfig.modelImpl.getParamDef(timelineName);
                    if (!paramDef) {
                        continue;
                    }

                    const values = motionConfig.motion.values[timelineName];
                    const timeline = new dbft.AnimationTimeline();
                    timeline.name = timelineName;

                    for (const value of values) {
                        const frame = new dbft.FloatFrame();
                        frame.tweenEasing = 0;
                        frame.value = (value - paramDef.minValue) / (paramDef.maxValue - paramDef.minValue);
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
            deformFrame.vertices[j] = l2DeformFrame[j] - pose[j] - modelConfig.modelImpl.canvasWidth * 0.5;
            deformFrame.vertices[j + 1] = l2DeformFrame[j + 1] - pose[j + 1] - modelConfig.modelImpl.canvasHeight;
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
        // frameBegin.x = 1.0;
        frameBegin.tweenEasing = 0.0;
        frameEnd._position = animationA.duration;
        frameEnd.x = 1.0;
        // frameBegin.x = 0.0;
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

function vertivesCopyFrom(source: number[], target: number[]): void {
    source.length = target.length;
    for (let i = 0, l = target.length; i < l; ++i) {
        source[i] = target[i];
    }
}

function vertivesAdd(source: number[], target: number[]): void {
    source.length = target.length;
    for (let i = 0, l = target.length; i < l; ++i) {
        source[i] += target[i];
    }
}

function vertivesMinus(source: number[], target: number[]): void {
    source.length = target.length;
    for (let i = 0, l = target.length; i < l; ++i) {
        source[i] -= target[i];
    }
}

function vertivesInterpolation(source: number[], targetA: number[], targetB: number[], progress: number): void {
    if (!targetA) { 
        debugger;
    }
    
    source.length = targetA.length;

    const helper: number[] = [];
    vertivesCopyFrom(helper, targetB);
    vertivesMinus(helper, targetA);

    for (let i = 0, l = helper.length; i < l; ++i) {
        helper[i] *= progress;
    }

    vertivesCopyFrom(source, targetA);
    vertivesAdd(source, helper);
}