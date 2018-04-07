import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";
import * as l2ft from "../format/live2DFormat";

type Input = {
    name: string;
    data: l2ft.ModelImpl;
    textureAtlas: string;
    textureAtlasWidth: number;
    textureAtlasHeight: number;
};

const rotateMatrix = geom.helpMatrixA;
const helpAffineA = new l2ft.Transform();
const helpAffineB = new l2ft.Transform();
const helpVerticesA: number[] = [];
const helpVerticesB: number[] = [];

let model: l2ft.ModelImpl;
let result: dbft.DragonBones;
let armature: dbft.Armature;
let defaultSkin: dbft.Skin;
/**
 * Convert Live2D format to DragonBones format.
 */
export default function (data: Input): dbft.DragonBones | null {
    model = data.data;
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
    subTexture.name = textureAtlas.name;
    subTexture.x = 0;
    subTexture.y = 0;
    subTexture.width = data.textureAtlasWidth;
    subTexture.height = data.textureAtlasHeight;
    textureAtlas.SubTexture.push(subTexture);
    // Create dragonBones.
    result = new dbft.DragonBones();
    result.frameRate = model.frameRate;
    result.name = data.name;
    result.version = dbft.DATA_VERSION_5_5;
    result.compatibleVersion = dbft.DATA_VERSION_5_5;
    result.textureAtlas.push(textureAtlas);
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

    for (const partsData of model.partsDataList) {
        for (const baseData of partsData.baseDataList) {
            const isSurfaceParent = model.isSurface(baseData.targetBaseDataID);
            const paramPivotTable = baseData.pivotManager.paramPivotTable;

            if (baseData instanceof l2ft.AffineData) {
                const bone = new dbft.Bone();
                bone.length = 150.0;
                bone.name = baseData.baseDataID;
                bone.parent = baseData.targetBaseDataID === rootBone.name ? "" : baseData.targetBaseDataID;

                switch (paramPivotTable.length) {
                    case 1: {
                        const paramPivots = paramPivotTable[0];
                        const paramDef = model.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
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
                        const paramDefA = model.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                        const paramDefB = model.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;

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
                    bone.transform.x = helpAffineA.originX - model.canvasWidth * 0.5;
                    bone.transform.y = helpAffineA.originY - model.canvasHeight;
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
                        const paramDef = model.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
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
                        const paramDefA = model.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                        const paramDefB = model.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;

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
                        surface.vertices[i] = helpVerticesA[i] - model.canvasWidth * 0.5;
                        surface.vertices[i + 1] = helpVerticesA[i + 1] - model.canvasHeight;
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
        const isSurfaceParent = model.isSurface(drawData.targetBaseDataID);
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
            display.path = subTexture.name;
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
                    const paramDef = model.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
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
                    const paramDefA = model.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                    const paramDefB = model.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;

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
                    display.vertices[i] = helpVerticesA[i] - model.canvasWidth * 0.5;
                    display.vertices[i + 1] = helpVerticesA[i + 1] - model.canvasHeight;
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
    if (model.paramDefSet.paramDefSet.length > 0) {
        for (const partsData of model.partsDataList) {
            // Create bone timelines.
            for (const baseData of partsData.baseDataList) {
                const isSurfaceParent = model.isSurface(baseData.targetBaseDataID);
                const paramPivotTable = baseData.pivotManager.paramPivotTable;

                if (baseData instanceof l2ft.AffineData) {
                    const bone = armature.getBone(baseData.baseDataID);
                    if (!bone) {
                        continue;
                    }

                    const keyFrames = baseData.affines;

                    switch (paramPivotTable.length) {
                        case 0:
                            break;

                        case 1: {
                            const paramPivots = paramPivotTable[0];
                            const paramDef = model.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                            const totalValue = paramDef.maxValue - paramDef.minValue;
                            // Create animation.
                            let animation = armature.getAnimation(paramPivots.paramID) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = paramPivots.paramID;
                                animation.type = dbft.AnimationType.Tree;
                                armature.animation.push(animation);
                            }
                            // Create timeline.
                            const timeline = new dbft.BoneTimeline();
                            timeline.name = bone.name;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const translateFrame = new dbft.BoneTranslateFrame();
                                const rotateFrame = new dbft.BoneRotateFrame();
                                const scaleFrame = new dbft.BoneScaleFrame();
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
                                const keyFrame = keyFrames[i];
                                let x = 0.0;
                                let y = 0.0;

                                translateFrame._position = rotateFrame._position = scaleFrame._position = Math.floor(progress * animation.duration);
                                translateFrame.tweenEasing = rotateFrame.tweenEasing = scaleFrame.tweenEasing = 0.0;

                                if (isSurfaceParent) {
                                    x = (keyFrame.originX - 0.5) * 400.0;
                                    y = (keyFrame.originY - 0.5) * 400.0;
                                }
                                else {
                                    x = keyFrame.originX;
                                    y = keyFrame.originY;
                                }

                                if (!bone.parent || isSurfaceParent) {
                                    if (!bone.parent) {
                                        translateFrame.x = x - bone.transform.x - model.canvasWidth * 0.5;
                                        translateFrame.y = y - bone.transform.y - model.canvasHeight;
                                    }
                                    else {
                                        translateFrame.x = x - bone.transform.x;
                                        translateFrame.y = y - bone.transform.y;
                                    }

                                    rotateFrame.rotate = keyFrame.rotateDeg - bone.transform.skY - 90.0;
                                }
                                else {
                                    rotateMatrix.transformPoint(x, y, translateFrame);
                                    translateFrame.x -= bone.transform.x;
                                    translateFrame.y -= bone.transform.y;
                                    rotateFrame.rotate = keyFrame.rotateDeg - bone.transform.skY;
                                }

                                scaleFrame.x = keyFrame.scaleX * (keyFrame.reflectX ? -1.0 : 1.0) - bone.transform.scX;
                                scaleFrame.y = keyFrame.scaleY * (keyFrame.reflectY ? -1.0 : 1.0) - bone.transform.scY;

                                timeline.translateFrame.push(translateFrame);
                                timeline.rotateFrame.push(rotateFrame);
                                timeline.scaleFrame.push(scaleFrame);
                            }

                            modifyFrames(timeline.translateFrame);
                            modifyFrames(timeline.rotateFrame);
                            modifyFrames(timeline.scaleFrame);
                            animation.bone.push(timeline);
                            break;
                        }

                        case 2: {
                            const paramPivotsA = paramPivotTable[0];
                            const paramPivotsB = paramPivotTable[1];
                            const paramDefA = model.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                            const paramDefB = model.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;
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
                            for (let col = 0; col < paramPivotsA.pivotCount; ++col) {
                                const childAnimationName = animationB.name + "_" + col.toString().padStart(2, "0");
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
                                    const frameIndex = col * paramPivotsB.pivotCount + row;
                                    const translateFrame = new dbft.BoneTranslateFrame();
                                    const rotateFrame = new dbft.BoneRotateFrame();
                                    const scaleFrame = new dbft.BoneScaleFrame();
                                    const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
                                    const keyFrame = keyFrames[frameIndex];
                                    let x = 0.0;
                                    let y = 0.0;

                                    translateFrame._position = rotateFrame._position = scaleFrame._position = Math.floor(progress * childAnimation.duration);
                                    translateFrame.tweenEasing = rotateFrame.tweenEasing = scaleFrame.tweenEasing = 0.0;

                                    if (isSurfaceParent) {
                                        x = (keyFrame.originX - 0.5) * 400.0;
                                        y = (keyFrame.originY - 0.5) * 400.0;
                                    }
                                    else {
                                        x = keyFrame.originX;
                                        y = keyFrame.originY;
                                    }

                                    if (!bone.parent || isSurfaceParent) {
                                        if (!bone.parent) {
                                            translateFrame.x = x - bone.transform.x - model.canvasWidth * 0.5;
                                            translateFrame.y = y - bone.transform.y - model.canvasHeight;
                                        }
                                        else {
                                            translateFrame.x = x - bone.transform.x;
                                            translateFrame.y = y - bone.transform.y;
                                        }

                                        rotateFrame.rotate = keyFrame.rotateDeg - bone.transform.skY - 90.0;
                                    }
                                    else {
                                        rotateMatrix.transformPoint(x, y, translateFrame);
                                        translateFrame.x -= bone.transform.x;
                                        translateFrame.y -= bone.transform.y;
                                        rotateFrame.rotate = keyFrame.rotateDeg - bone.transform.skY;
                                    }

                                    timeline.translateFrame.push(translateFrame);
                                    timeline.rotateFrame.push(rotateFrame);
                                    timeline.scaleFrame.push(scaleFrame);
                                }

                                modifyFrames(timeline.translateFrame);
                                modifyFrames(timeline.rotateFrame);
                                modifyFrames(timeline.scaleFrame);
                                childAnimation.bone.push(timeline);
                                createAnimationController(animationA, animationB, childAnimationName, (paramPivotsA.pivotValue[col] - paramDefA.minValue) / totalValueA * 2.0 - 1.0);
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

                    const keyFrames = baseData.pivotPoints;

                    switch (paramPivotTable.length) {
                        case 0:
                            break;

                        case 1: {
                            const paramPivots = paramPivotTable[0];
                            const paramDef = model.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                            const totalValue = paramDef.maxValue - paramDef.minValue;
                            // Create animation.
                            let animation = armature.getAnimation(paramPivots.paramID) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = paramPivots.paramID;
                                animation.type = dbft.AnimationType.Tree;
                                armature.animation.push(animation);
                            }
                            // Create timeline.
                            const timeline = new dbft.DeformTimeline();
                            timeline.name = surface.name;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const deformFrame = new dbft.DeformFrame();
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
                                const keyFrame = keyFrames[i];
                                deformFrame._position = Math.floor(progress * animation.duration);
                                deformFrame.tweenEasing = 0.0;
                                createDeformFrame(
                                    deformFrame,
                                    keyFrame,
                                    surface.vertices,
                                    isSurfaceParent,
                                    surface.parent.length > 0
                                );
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
                            // Create parameters animaiton.
                            let animationA = armature.getAnimation(paramPivotsA.paramID) as dbft.Animation | null;
                            if (!animationA) {
                                animationA = new dbft.Animation();
                                animationA.playTimes = 0;
                                animationA.duration = result.frameRate;
                                animationA.name = paramPivotsA.paramID;
                                animationA.type = dbft.AnimationType.Tree;
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
                            for (let col = 0; col < paramPivotsA.pivotCount; ++col) {
                                const childAnimationName = animationB.name + "_" + col.toString().padStart(2, "0");
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
                                    const deformFrame = new dbft.DeformFrame();
                                    const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
                                    const keyFrame = keyFrames[frameIndex];
                                    deformFrame._position = Math.floor(progress * childAnimation.duration);
                                    deformFrame.tweenEasing = 0.0;
                                    createDeformFrame(
                                        deformFrame,
                                        keyFrame,
                                        surface.vertices,
                                        isSurfaceParent,
                                        surface.parent.length > 0
                                    );
                                    timeline.frame.push(deformFrame);
                                }

                                modifyFrames(timeline.frame);
                                childAnimation.surface.push(timeline);
                                createAnimationController(animationA, animationB, childAnimationName, (paramPivotsA.pivotValue[col] - paramDefA.minValue) / totalValueA * 2.0 - 1.0);
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
                const isSurfaceParent = model.isSurface(drawData.targetBaseDataID);
                const paramPivotTable = drawData.pivotManager.paramPivotTable;

                if (drawData instanceof l2ft.MeshData) {
                    const slot = armature.getSlot(drawData.drawDataID);
                    const meshDisplay = armature.getMesh(defaultSkin.name, drawData.drawDataID, drawData.drawDataID);
                    if (!slot || !meshDisplay) {
                        continue;
                    }

                    const colorFrames = drawData.pivotOpacity;
                    const deformFrames = drawData.pivotPoints;

                    switch (paramPivotTable.length) {
                        case 0:
                            break;

                        case 1: {
                            const paramPivots = paramPivotTable[0];
                            const paramDef = model.getParamDef(paramPivots.paramID) as l2ft.ParamDefFloat;
                            const totalValue = paramDef.maxValue - paramDef.minValue;
                            // Create animation.
                            let animation = armature.getAnimation(paramPivots.paramID) as dbft.Animation | null;
                            if (!animation) {
                                animation = new dbft.Animation();
                                animation.playTimes = 0;
                                animation.duration = result.frameRate;
                                animation.name = paramPivots.paramID;
                                animation.type = dbft.AnimationType.Tree;
                                armature.animation.push(animation);
                            }
                            // Create colorTimeline.
                            const colorTimeline = new dbft.SlotTimeline();
                            colorTimeline.name = slot.name;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const colorFrame = new dbft.SlotColorFrame();
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
                                const keyFrame = colorFrames[i];
                                colorFrame._position = Math.floor(progress * animation.duration);
                                colorFrame.tweenEasing = 0.0;
                                colorFrame.value.aM = Math.max(Math.round(keyFrame * 100), 100);
                                colorTimeline.colorFrame.push(colorFrame);
                            }

                            modifyFrames(colorTimeline.colorFrame);
                            animation.slot.push(colorTimeline);
                            // Create defromTimeline.
                            const deformTimeline = new dbft.SlotDeformTimeline();
                            deformTimeline.name = meshDisplay.name;
                            deformTimeline.slot = slot.name;

                            for (let i = 0; i < paramPivots.pivotCount; ++i) {
                                const deformFrame = new dbft.DeformFrame();
                                const progress = (paramPivots.pivotValue[i] - paramDef.minValue) / totalValue;
                                const keyFrame = deformFrames[i];
                                deformFrame._position = Math.floor(progress * animation.duration);
                                deformFrame.tweenEasing = 0.0;
                                createDeformFrame(
                                    deformFrame,
                                    keyFrame,
                                    meshDisplay.vertices,
                                    isSurfaceParent,
                                    slot.parent !== rootBone.name
                                );
                                deformTimeline.frame.push(deformFrame);
                            }

                            modifyFrames(deformTimeline.frame);
                            animation.ffd.push(deformTimeline);
                            break;
                        }

                        case 2: {
                            const paramPivotsA = paramPivotTable[0];
                            const paramPivotsB = paramPivotTable[1];
                            const paramDefA = model.getParamDef(paramPivotsA.paramID) as l2ft.ParamDefFloat;
                            const paramDefB = model.getParamDef(paramPivotsB.paramID) as l2ft.ParamDefFloat;
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
                            for (let col = 0; col < paramPivotsA.pivotCount; ++col) {
                                const childAnimationName = animationB.name + "_" + col.toString().padStart(2, "0");
                                let childAnimation = armature.getAnimation(childAnimationName) as dbft.Animation | null;
                                if (!childAnimation) {
                                    childAnimation = new dbft.Animation();
                                    childAnimation.playTimes = 0;
                                    childAnimation.duration = animationB.duration;
                                    childAnimation.name = childAnimationName;
                                    childAnimation.type = dbft.AnimationType.Node;
                                    armature.animation.push(childAnimation);
                                }
                                // Create colorTimeline.
                                const colorTimeline = new dbft.SlotTimeline();
                                colorTimeline.name = slot.name;

                                for (let row = 0; row < paramPivotsB.pivotCount; ++row) {
                                    const frameIndex = col * paramPivotsB.pivotCount + row;
                                    const colorFrame = new dbft.SlotColorFrame();
                                    const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
                                    const keyFrame = colorFrames[frameIndex];
                                    colorFrame._position = Math.floor(progress * childAnimation.duration);
                                    colorFrame.tweenEasing = 0.0;
                                    colorFrame.value.aM = Math.max(Math.round(keyFrame * 100), 100);
                                    colorTimeline.colorFrame.push(colorFrame);
                                }

                                modifyFrames(colorTimeline.colorFrame);
                                childAnimation.slot.push(colorTimeline);
                                // Create defromTimeline.
                                const deformTimeline = new dbft.SlotDeformTimeline();
                                deformTimeline.name = meshDisplay.name;
                                deformTimeline.slot = slot.name;

                                for (let row = 0; row < paramPivotsB.pivotCount; ++row) {
                                    const frameIndex = col * paramPivotsB.pivotCount + row;
                                    const deformFrame = new dbft.DeformFrame();
                                    const progress = (paramPivotsB.pivotValue[row] - paramDefB.minValue) / totalValueB;
                                    const keyFrame = deformFrames[frameIndex];
                                    deformFrame._position = Math.floor(progress * childAnimation.duration);
                                    deformFrame.tweenEasing = 0.0;
                                    createDeformFrame(
                                        deformFrame,
                                        keyFrame,
                                        meshDisplay.vertices,
                                        isSurfaceParent,
                                        slot.parent !== rootBone.name
                                    );
                                    deformTimeline.frame.push(deformFrame);
                                }

                                modifyFrames(deformTimeline.frame);
                                childAnimation.ffd.push(deformTimeline);
                                createAnimationController(animationA, animationB, childAnimationName, (paramPivotsA.pivotValue[col] - paramDefA.minValue) / totalValueA * 2.0 - 1.0);
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

    return result;
}

function createDeformFrame(
    deformFrame: dbft.DeformFrame,
    keyFrame: number[],
    pose: number[],
    isSurfaceParent: boolean,
    isRotatedParent: boolean
): void {
    for (let j = 0, lJ = keyFrame.length; j < lJ; j += 2) {
        if (isSurfaceParent) { // Scale.
            deformFrame.vertices[j] = (keyFrame[j] - 0.5) * 400.0 - pose[j];
            deformFrame.vertices[j + 1] = (keyFrame[j + 1] - 0.5) * 400.0 - pose[j + 1];
        }
        else if (isRotatedParent) { // Rotate.
            rotateMatrix.transformPoint(keyFrame[j], keyFrame[j + 1], geom.helpPointA);
            deformFrame.vertices[j] = geom.helpPointA.x - pose[j];
            deformFrame.vertices[j + 1] = geom.helpPointA.y - pose[j + 1];
        }
        else { // Offset.
            deformFrame.vertices[j] = keyFrame[j] - pose[j] - model.canvasWidth * 0.5;
            deformFrame.vertices[j + 1] = keyFrame[j + 1] - pose[j + 1] - model.canvasHeight;
        }
    }
}

function createAnimationController(animationA: dbft.Animation, animationB: dbft.Animation, childAnimationName: string, positionX: number): void {
    if (!animationB.getAnimationTimeline(childAnimationName)) {
        const animationTimeline = new dbft.AnimationTimeline();
        animationTimeline.name = childAnimationName;
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
        modifyFrames(animationTimeline.progressFrame);
        animationB.animation.push(animationTimeline);
    }

    if (!animationA.getAnimationTimeline(animationB.name)) {
        const animationTimeline = new dbft.AnimationTimeline();
        animationTimeline.name = animationB.name;
        const frameBegin = new dbft.BoneTranslateFrame();
        const frameEnd = new dbft.BoneTranslateFrame();
        frameBegin._position = 0;
        frameBegin.x = -1.0;
        // frameBegin.x = 0.0;
        frameBegin.tweenEasing = 0.0;
        frameEnd._position = animationA.duration;
        frameEnd.x = 1.0;
        frameEnd.tweenEasing = 0.0;
        animationTimeline.parameterFrame.push(frameBegin, frameEnd);
        modifyFrames(animationTimeline.parameterFrame);
        animationA.animation.push(animationTimeline);
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