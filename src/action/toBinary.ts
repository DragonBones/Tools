import * as object from "../common/object";
import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";

const enum FrameValueType {
    Step,
    Int,
    Float,
}

const intArray: Array<number> = [];
const floatArray: Array<number> = [];
const timelineArray: Array<number> = [];
const frameArray: Array<number> = [];
const frameIntArray: Array<number> = [];
const frameFloatArray: Array<number> = [];
const colorArray: Array<number> = [];
const colors: { [key: string]: number } = {};

let currentArmature: dbft.Armature;
let currentAnimationBinary: dbft.AnimationBinary;
/**
 * Convert DragonBones format to binary.
 */
export default function (data: dbft.DragonBones): ArrayBuffer {
    // Clean helper.
    intArray.length = 0;
    floatArray.length = 0;
    timelineArray.length = 0;
    frameArray.length = 0;
    frameIntArray.length = 0;
    frameFloatArray.length = 0;
    colorArray.length = 0;
    for (let k in colors) {
        delete colors[k];
    }

    const binaryDatas = new Array<dbft.BaseData>();

    for (currentArmature of data.armature) {
        for (const bone of currentArmature.bone) {
            if (bone instanceof dbft.Surface) {
                bone.offset = createVertices(bone);
                binaryDatas.push(bone);
            }
        }

        for (const skin of currentArmature.skin) {
            for (const slot of skin.slot) {
                for (const display of slot.display) {
                    if (display instanceof dbft.MeshDisplay) {
                        display.offset = createMesh(display);
                        binaryDatas.push(display);
                    }
                    else if (display instanceof dbft.PathDisplay) {
                        display.offset = createVertices(display);
                        binaryDatas.push(display);
                    }
                    else if (display instanceof dbft.PolygonBoundingBoxDisplay) {
                        display.offset = createVertices(display);
                        binaryDatas.push(display);
                    }
                }
            }
        }

        const animationBinarys = new Array<dbft.AnimationBinary>();
        for (const animation of currentArmature.animation as dbft.Animation[]) {
            currentAnimationBinary = new dbft.AnimationBinary();
            currentAnimationBinary.type = animation.type;
            currentAnimationBinary.blendType = animation.blendType;
            currentAnimationBinary.duration = animation.duration;
            currentAnimationBinary.playTimes = animation.playTimes;
            currentAnimationBinary.scale = animation.scale;
            currentAnimationBinary.fadeInTime = animation.fadeInTime;
            currentAnimationBinary.name = animation.name;
            currentAnimationBinary.offset[dbft.OffsetOrder.FrameInt] = frameIntArray.length;
            currentAnimationBinary.offset[dbft.OffsetOrder.FrameFloat] = frameFloatArray.length;
            currentAnimationBinary.offset[dbft.OffsetOrder.Frame] = frameArray.length;
            animationBinarys.push(currentAnimationBinary);

            if (animation.frame.length > 0) {
                currentAnimationBinary.action = createTimeline(animation, animation.frame, FrameValueType.Step, 0, createActionFrame);
            }

            if (animation.zOrder) {
                currentAnimationBinary.zOrder = createTimeline(animation.zOrder, animation.zOrder.frame, FrameValueType.Step, 0, createZOrderFrame);
            }

            for (const timeline of animation.bone) {
                currentAnimationBinary.bone[timeline.name] = createBoneTimeline(timeline);
            }

            for (const timeline of animation.slot) {
                if (!(timeline.name in currentAnimationBinary.slot)) {
                    currentAnimationBinary.slot[timeline.name] = [];
                }

                const timelines = currentAnimationBinary.slot[timeline.name];

                if (timeline.displayFrame.length > 0) {
                    timelines.push(dbft.TimelineType.SlotDisplay);
                    timelines.push(createTimeline(timeline, timeline.displayFrame, FrameValueType.Step, 0, (frame, frameStart) => {
                        const offset = createFrame(frame, frameStart);
                        frameArray.push(frame.value);

                        return offset;
                    }));
                }

                if (timeline.colorFrame.length > 0) {
                    timelines.push(dbft.TimelineType.SlotColor);
                    timelines.push(createTimeline(timeline, timeline.colorFrame, FrameValueType.Int, 1, (frame, frameStart) => {
                        const offset = createTweenFrame(frame, frameStart);

                        // Color.
                        const colorString = frame.value.toString();
                        if (!(colorString in colors)) {
                            colors[colorString] = createColor(frame.value);
                        }

                        frameIntArray.push(colors[colorString]);

                        return offset;
                    }));
                }
            }

            for (const timeline of animation.ffd) {
                if (!(timeline.slot in currentAnimationBinary.slot)) {
                    currentAnimationBinary.slot[timeline.slot] = [];
                }

                const timelines = currentAnimationBinary.slot[timeline.slot];
                timelines.push(dbft.TimelineType.SlotDeform);
                timelines.push(createDeformTimeline(timeline));
            }

            for (const timeline of animation.ik) {
                if (!(timeline.name in currentAnimationBinary.constraint)) {
                    currentAnimationBinary.constraint[timeline.name] = [];
                }

                const timelines = currentAnimationBinary.constraint[timeline.name];
                if (timeline.frame.length > 0) {
                    timelines.push(dbft.TimelineType.IKConstraint);
                    timelines.push(createTimeline(timeline, timeline.frame as dbft.IKConstraintFrame[], FrameValueType.Int, 2, (frame, frameStart) => {
                        const offset = createTweenFrame(frame, frameStart);
                        frameIntArray.push(frame.bendPositive ? 1 : 0); // TODO 100
                        frameIntArray.push(Math.round(frame.weight * 100.0));

                        return offset;
                    }));
                }

                currentAnimationBinary.constraint[timeline.name] = timelines;
            }

            for (const timeline of animation.timeline) {
                timeline.offset = createTypeTimeline(timeline);

                if (timeline.offset >= 0) {
                    currentAnimationBinary.timeline.push(timeline);
                    timeline.clearToBinary();
                }
            }
        }

        currentArmature.animation.length = 0;

        for (const animation of animationBinarys) {
            currentArmature.animation.push(animation);
        }
    }

    // Clear binary data. 
    for (const data of binaryDatas) {
        data.clearToBinary();
    }

    // Align.
    if ((intArray.length % Int16Array.BYTES_PER_ELEMENT) !== 0) {
        intArray.push(0);
    }

    if ((frameIntArray.length % Int16Array.BYTES_PER_ELEMENT) !== 0) {
        frameIntArray.push(0);
    }

    if ((frameArray.length % Int16Array.BYTES_PER_ELEMENT) !== 0) {
        frameArray.push(0);
    }

    if ((timelineArray.length % Uint16Array.BYTES_PER_ELEMENT) !== 0) {
        timelineArray.push(0);
    }

    if ((colorArray.length % Int16Array.BYTES_PER_ELEMENT) !== 0) {
        colorArray.push(0);
    }

    // Offset.
    let byteLength = 0;
    let byteOffset = 0;
    data.offset[0] = 0;
    byteLength += data.offset[1] = intArray.length * Int16Array.BYTES_PER_ELEMENT;
    data.offset[2] = data.offset[0] + data.offset[1];
    byteLength += data.offset[3] = floatArray.length * Float32Array.BYTES_PER_ELEMENT;
    data.offset[4] = data.offset[2] + data.offset[3];
    byteLength += data.offset[5] = frameIntArray.length * Int16Array.BYTES_PER_ELEMENT;
    data.offset[6] = data.offset[4] + data.offset[5];
    byteLength += data.offset[7] = frameFloatArray.length * Float32Array.BYTES_PER_ELEMENT;
    data.offset[8] = data.offset[6] + data.offset[7];
    byteLength += data.offset[9] = frameArray.length * Int16Array.BYTES_PER_ELEMENT;
    data.offset[10] = data.offset[8] + data.offset[9];
    byteLength += data.offset[11] = timelineArray.length * Uint16Array.BYTES_PER_ELEMENT;
    data.offset[12] = data.offset[10] + data.offset[11];
    byteLength += data.offset[13] = colorArray.length * Int16Array.BYTES_PER_ELEMENT;
    object.compress(data, dbft.compressConfig);
    //
    const jsonString = JSON.stringify(data);
    const jsonArray = stringToUTF8Array(jsonString);
    modifyBytesPosition(jsonArray, " ".charCodeAt(0));
    //
    const buffer = new ArrayBuffer(4 + 4 + 4 + jsonArray.length + byteLength);
    const dataView = new DataView(buffer);
    // Write DragonBones format tag.
    dataView.setUint8(byteOffset++, "D".charCodeAt(0));
    dataView.setUint8(byteOffset++, "B".charCodeAt(0));
    dataView.setUint8(byteOffset++, "D".charCodeAt(0));
    dataView.setUint8(byteOffset++, "T".charCodeAt(0));
    // Write version.
    dataView.setUint8(byteOffset++, 0);
    dataView.setUint8(byteOffset++, 0);
    dataView.setUint8(byteOffset++, 0);
    dataView.setUint8(byteOffset++, 3);
    // Write json length.
    dataView.setUint32(byteOffset, jsonArray.length, true); byteOffset += 4;

    for (const value of jsonArray) {
        dataView.setUint8(byteOffset, value); byteOffset++;
    }

    for (const value of intArray) {
        dataView.setInt16(byteOffset, value, true); byteOffset += 2;
    }

    for (const value of floatArray) {
        dataView.setFloat32(byteOffset, value, true); byteOffset += 4;
    }

    for (const value of frameIntArray) {
        dataView.setInt16(byteOffset, value, true); byteOffset += 2;
    }

    for (const value of frameFloatArray) {
        dataView.setFloat32(byteOffset, value, true); byteOffset += 4;
    }

    for (const value of frameArray) {
        dataView.setInt16(byteOffset, value, true); byteOffset += 2;
    }

    for (const value of timelineArray) {
        dataView.setUint16(byteOffset, value, true); byteOffset += 2;
    }

    for (const value of colorArray) {
        dataView.setInt16(byteOffset, value, true); byteOffset += 2;
    }

    return buffer;
}

function createColor(value: geom.ColorTransform): number {
    const offset = intArray.length;
    intArray.length += 8;
    intArray[offset + 0] = value.aM;
    intArray[offset + 1] = value.rM;
    intArray[offset + 2] = value.gM;
    intArray[offset + 3] = value.bM;
    intArray[offset + 4] = value.aO;
    intArray[offset + 5] = value.rO;
    intArray[offset + 6] = value.gO;
    intArray[offset + 7] = value.bO;

    if (offset >= 65536) {
        // TODO
    }

    return offset;
}

function createVertices(value: dbft.VerticesData): number {
    const vertexCount = value.vertexCount;
    const offset = intArray.length;
    const vertexOffset = floatArray.length;

    intArray.length += 1 + 1 + 1 + 1;
    intArray[offset + dbft.BinaryOffset.GeometryVertexCount] = vertexCount;
    intArray[offset + dbft.BinaryOffset.GeometryTriangleCount] = 0;
    intArray[offset + dbft.BinaryOffset.GeometryFloatOffset] = vertexOffset;

    if (value.weights.length === 0) {
        floatArray.length += value.vertices.length;

        for (let i = 0, l = value.vertices.length; i < l; i++) {
            floatArray[vertexOffset + i] = value.vertices[i];
        }

        intArray[offset + dbft.BinaryOffset.GeometryWeightOffset] = -1;
    }
    else {
        const weightBoneCount = value.bones.length;
        const weightCount = Math.floor(value.weights.length - vertexCount) / 2; // uint
        const weightOffset = intArray.length;
        const floatOffset = floatArray.length;

        intArray.length += 1 + 1 + weightBoneCount;
        intArray[weightOffset + dbft.BinaryOffset.WeigthBoneCount] = weightBoneCount;
        intArray[weightOffset + dbft.BinaryOffset.WeigthFloatOffset] = floatOffset;

        for (let i = 0; i < weightBoneCount; i++) {
            intArray[weightOffset + dbft.BinaryOffset.WeigthBoneIndices + i] = value.bones[i];
        }

        floatArray.length += weightCount * 3;

        for (let i = 0, iV = 0, iW = 0, iB = weightOffset + dbft.BinaryOffset.WeigthBoneIndices + weightBoneCount, iF = floatOffset; i < weightCount; i++) {
            const boneCount = value.weights[iW++];
            intArray[iB++] = boneCount;

            for (let j = 0; j < boneCount; j++) {
                const boneIndex = value.weights[iW++];
                const boneWeight = value.weights[iW++];

                intArray[iB++] = value.bones.indexOf(boneIndex);
                floatArray[iF++] = boneWeight;
                floatArray[iF++] = value.vertices[iV++];
                floatArray[iF++] = value.vertices[iV++];
            }
        }

        intArray[offset + dbft.BinaryOffset.GeometryWeightOffset] = weightOffset;
    }

    return offset;
}

function createMesh(value: dbft.MeshDisplay): number {
    const vertexCount = Math.floor(value.vertices.length / 2); // uint
    const triangleCount = Math.floor(value.triangles.length / 3); // uint
    const offset = intArray.length;
    const vertexOffset = floatArray.length;
    const uvOffset = vertexOffset + vertexCount * 2;

    intArray.length += 1 + 1 + 1 + 1 + triangleCount * 3;
    intArray[offset + dbft.BinaryOffset.GeometryVertexCount] = vertexCount;
    intArray[offset + dbft.BinaryOffset.GeometryTriangleCount] = triangleCount;
    intArray[offset + dbft.BinaryOffset.GeometryFloatOffset] = vertexOffset;
    for (let i = 0, l = triangleCount * 3; i < l; ++i) {
        intArray[offset + dbft.BinaryOffset.GeometryVertexIndices + i] = value.triangles[i];
    }

    floatArray.length += vertexCount * 2 + vertexCount * 2;
    for (let i = 0, l = vertexCount * 2; i < l; ++i) {
        floatArray[vertexOffset + i] = value.vertices[i];
        floatArray[uvOffset + i] = value.uvs[i];
    }

    if (value.weights.length > 0) {
        const weightOffset = intArray.length;
        const floatOffset = floatArray.length;
        value._boneCount = Math.floor(value.bonePose.length / 7);
        value._weightCount = Math.floor((value.weights.length - vertexCount) / 2);
        intArray.length += 1 + 1 + value._boneCount + vertexCount + value._weightCount;
        intArray[weightOffset + dbft.BinaryOffset.WeigthBoneCount] = value._boneCount;
        intArray[weightOffset + dbft.BinaryOffset.WeigthFloatOffset] = floatOffset;

        for (let i = 0; i < value._boneCount; ++i) {
            intArray[weightOffset + dbft.BinaryOffset.WeigthBoneIndices + i] = value.bonePose[i * 7];
        }

        floatArray.length += value._weightCount * 3;
        geom.helpMatrixA.copyFromArray(value.slotPose, 0);

        for (
            let i = 0, iW = 0, iB = weightOffset + dbft.BinaryOffset.WeigthBoneIndices + value._boneCount, iV = floatOffset;
            i < vertexCount;
            ++i
        ) {
            const iD = i * 2;
            const vertexBoneCount = intArray[iB++] = value.weights[iW++]; // uint

            let x = floatArray[vertexOffset + iD];
            let y = floatArray[vertexOffset + iD + 1];
            geom.helpMatrixA.transformPoint(x, y, geom.helpPointA);
            x = geom.helpPointA.x;
            y = geom.helpPointA.y;

            for (let j = 0; j < vertexBoneCount; ++j) {
                const rawBoneIndex = value.weights[iW++]; // uint
                const bonePoseOffset = value.getBonePoseOffset(rawBoneIndex);
                geom.helpMatrixB.copyFromArray(value.bonePose, bonePoseOffset + 1);
                geom.helpMatrixB.invert();
                geom.helpMatrixB.transformPoint(x, y, geom.helpPointA);
                intArray[iB++] = bonePoseOffset / 7; // 
                floatArray[iV++] = value.weights[iW++];
                floatArray[iV++] = geom.helpPointA.x;
                floatArray[iV++] = geom.helpPointA.y;
            }
        }

        intArray[offset + dbft.BinaryOffset.GeometryWeightOffset] = weightOffset;
    }
    else {
        intArray[offset + dbft.BinaryOffset.GeometryWeightOffset] = -1;
    }

    return offset;
}

function createTimeline<T extends dbft.Frame>(
    value: dbft.Timeline | dbft.Animation, frames: T[],
    frameValueType: FrameValueType, frameValueCount: number,
    createFrame: (frame: T, frameStart: number) => number
): number {
    const offset = timelineArray.length;

    timelineArray.length += 1 + 1 + 1 + 1 + 1;

    if (value instanceof dbft.Animation) {
        timelineArray[offset + dbft.BinaryOffset.TimelineScale] = 100;
        timelineArray[offset + dbft.BinaryOffset.TimelineOffset] = 0;
    }
    else {
        timelineArray[offset + dbft.BinaryOffset.TimelineScale] = Math.round(value.scale * 100.0);
        timelineArray[offset + dbft.BinaryOffset.TimelineOffset] = Math.round(value.offset * 100.0);
    }

    timelineArray[offset + dbft.BinaryOffset.TimelineFrameValueCount] = frameValueCount;

    switch (frameValueType) {
        case FrameValueType.Step:
            timelineArray[offset + dbft.BinaryOffset.TimelineFrameValueOffset] = 0;
            break;

        case FrameValueType.Int:
            timelineArray[offset + dbft.BinaryOffset.TimelineFrameValueOffset] = frameIntArray.length - currentAnimationBinary.offset[dbft.OffsetOrder.FrameInt];
            break;

        case FrameValueType.Float:
            timelineArray[offset + dbft.BinaryOffset.TimelineFrameValueOffset] = frameFloatArray.length - currentAnimationBinary.offset[dbft.OffsetOrder.FrameFloat];
            break;
    }

    let frameStart = 0;
    let keyFrameCount = 0;

    for (let i = 0, l = frames.length; i < l; ++i) { // Frame offsets.
        const frame = frames[i];
        const frameOffset = createFrame(frame as any, frameStart);
        frameStart += frame.duration;
        if (frameOffset >= 0) {
            timelineArray.push(frameOffset - currentAnimationBinary.offset[dbft.OffsetOrder.Frame]);
            keyFrameCount++;
        }
    }

    timelineArray[offset + dbft.BinaryOffset.TimelineKeyFrameCount] = keyFrameCount;

    return offset;
}

function createTypeTimeline(timeline: dbft.TypeTimeline) {
    let valueScale = 1.0;
    switch (timeline.type) {
        case dbft.TimelineType.SlotDisplay:
        // TODO
        case dbft.TimelineType.SlotZIndex:
            return createTimeline(timeline, timeline.frame, FrameValueType.Int, 1, (frame: dbft.SingleValueFrame0, frameStart) => {
                const offset = createTweenFrame(frame, frameStart);
                frameIntArray.push(frame.value);

                return offset;
            });

        case dbft.TimelineType.BoneAlpha:
        case dbft.TimelineType.SlotAlpha:
        case dbft.TimelineType.AnimationProgress:
        case dbft.TimelineType.AnimationWeight:
            valueScale = timeline.type === dbft.TimelineType.BoneAlpha || timeline.type === dbft.TimelineType.SlotAlpha ? 100.0 : 10000.0;
            return createTimeline(timeline, timeline.frame, FrameValueType.Int, 1, (frame: dbft.SingleValueFrame0 | dbft.SingleValueFrame1, frameStart) => {
                const offset = createTweenFrame(frame, frameStart);
                frameIntArray.push(Math.round(frame.value * valueScale));

                return offset;
            });

        case dbft.TimelineType.BoneTranslate:
        case dbft.TimelineType.BoneRotate:
        case dbft.TimelineType.BoneScale:
            valueScale = timeline.type === dbft.TimelineType.BoneRotate ? geom.DEG_RAD : 1.0;
            return createTimeline(timeline, timeline.frame, FrameValueType.Float, 2, (frame: dbft.DoubleValueFrame0 | dbft.DoubleValueFrame1, frameStart) => {
                const offset = createTweenFrame(frame, frameStart);
                frameFloatArray.push(frame.x * valueScale);
                frameFloatArray.push(frame.y * valueScale);

                return offset;
            });

        case dbft.TimelineType.IKConstraint:
        case dbft.TimelineType.AnimationParameter:
            valueScale = timeline.type === dbft.TimelineType.IKConstraint ? 100.0 : 10000.0;
            return createTimeline(timeline, timeline.frame, FrameValueType.Int, 2, (frame: dbft.DoubleValueFrame0 | dbft.DoubleValueFrame1, frameStart) => {
                const offset = createTweenFrame(frame, frameStart);
                frameIntArray.push(Math.round(frame.x * valueScale));
                frameIntArray.push(Math.round(frame.y * valueScale));

                return offset;
            });

        case dbft.TimelineType.ZOrder:
            // TODO
            break;

        case dbft.TimelineType.Surface:
            return createSurfaceTimeline(timeline);

        case dbft.TimelineType.SlotDeform:
            return createDeformTimeline(timeline);

        case dbft.TimelineType.SlotColor:
            return createTimeline(timeline, timeline.frame, FrameValueType.Int, 1, (frame: dbft.SlotColorFrame, frameStart) => {
                const offset = createTweenFrame(frame, frameStart);

                // Color.
                const colorString = frame.value.toString();
                if (!(colorString in colors)) {
                    colors[colorString] = createColor(frame.value);
                }

                frameIntArray.push(colors[colorString]);

                return offset;
            });
    }

    return -1;
}

function createFrame(value: dbft.Frame, frameStart: number): number {
    // tslint:disable-next-line:no-unused-expression
    value;

    const offset = frameArray.length;
    frameArray.push(frameStart);

    return offset;
}

function createTweenFrame(frame: dbft.TweenFrame, frameStart: number): number {
    const frameOffset = createFrame(frame, frameStart);

    if (frame.duration > 0) {
        if (frame.curve.length > 0) {
            const isOmited = (frame.curve.length % 3) === 1;
            const sampleCount = frame.duration + (isOmited ? 1 : 3);
            const samples = new Array<number>(sampleCount);
            dbft.samplingEasingCurve(frame.curve, samples, isOmited);

            frameArray.length += 1 + 1 + samples.length;
            frameArray[frameOffset + dbft.BinaryOffset.FrameTweenType] = dbft.TweenType.Curve;
            frameArray[frameOffset + dbft.BinaryOffset.FrameTweenEasingOrCurveSampleCount] = isOmited ? sampleCount : -sampleCount; // Notice: If not omit data, the count is negative number.

            for (let i = 0; i < sampleCount; ++i) {
                frameArray[frameOffset + dbft.BinaryOffset.FrameCurveSamples + i] = Math.round(samples[i] * 10000.0); // Min ~ Max [-3.00~3.00]
            }
        }
        else {
            if (isNaN(frame.tweenEasing)) {
                frameArray.length += 1;
                frameArray[frameOffset + dbft.BinaryOffset.FrameTweenType] = dbft.TweenType.None;
            }
            else if (frame.tweenEasing === 0.0) {
                frameArray.length += 1;
                frameArray[frameOffset + dbft.BinaryOffset.FrameTweenType] = dbft.TweenType.Line;
            }
            else if (frame.tweenEasing < 0.0) {
                frameArray.length += 1 + 1;
                frameArray[frameOffset + dbft.BinaryOffset.FrameTweenType] = dbft.TweenType.QuadIn;
                frameArray[frameOffset + dbft.BinaryOffset.FrameTweenEasingOrCurveSampleCount] = Math.round(-frame.tweenEasing * 100.0);
            }
            else if (frame.tweenEasing <= 1.0) {
                frameArray.length += 1 + 1;
                frameArray[frameOffset + dbft.BinaryOffset.FrameTweenType] = dbft.TweenType.QuadOut;
                frameArray[frameOffset + dbft.BinaryOffset.FrameTweenEasingOrCurveSampleCount] = Math.round(frame.tweenEasing * 100.0);
            }
            else {
                frameArray.length += 1 + 1;
                frameArray[frameOffset + dbft.BinaryOffset.FrameTweenType] = dbft.TweenType.QuadInOut;
                frameArray[frameOffset + dbft.BinaryOffset.FrameTweenEasingOrCurveSampleCount] = Math.round(frame.tweenEasing * 100.0 - 100.0);
            }
        }
    }
    else {
        frameArray.length += 1;
        frameArray[frameOffset + dbft.BinaryOffset.FrameTweenType] = dbft.TweenType.None;
    }

    return frameOffset;
}

function createActionFrame(frame: dbft.ActionFrame, frameStart: number): number {
    const frameOffset = createFrame(frame, frameStart);
    const actionCount = frame.actions.length;
    frameArray.length += 1 + 1 + actionCount;
    frameArray[frameOffset + dbft.BinaryOffset.FramePosition] = frameStart;
    frameArray[frameOffset + dbft.BinaryOffset.ActionFrameActionCount] = actionCount; // Action count.

    for (let i = 0; i < actionCount; ++i) { // Action offsets.
        const action = frame.actions[i];
        frameArray[frameOffset + dbft.BinaryOffset.ActionFrameActionIndices + i] = currentArmature.actions.length;
        currentArmature.actions.push(action);
    }

    frame.actions.length = 0;

    return frameOffset;
}

function createZOrderFrame(frame: dbft.MutilpleValueFrame, frameStart: number): number {
    const frameOffset = createFrame(frame, frameStart);

    if (frame.zOrder.length > 0) {
        const slotCount = currentArmature.slot.length;
        const unchanged = new Array<number>(slotCount - frame.zOrder.length / 2);
        const zOrders = new Array<number>(slotCount);

        for (let i = 0; i < unchanged.length; ++i) {
            unchanged[i] = 0;
        }

        for (let i = 0; i < slotCount; ++i) {
            zOrders[i] = -1;
        }

        let originalIndex = 0;
        let unchangedIndex = 0;
        for (let i = 0, l = frame.zOrder.length; i < l; i += 2) {
            const slotIndex = frame.zOrder[i];
            const zOrderOffset = frame.zOrder[i + 1];

            while (originalIndex !== slotIndex) {
                unchanged[unchangedIndex++] = originalIndex++;
            }

            zOrders[originalIndex + zOrderOffset] = originalIndex++;
        }

        while (originalIndex < slotCount) {
            unchanged[unchangedIndex++] = originalIndex++;
        }

        frameArray.length += 1 + slotCount;
        frameArray[frameOffset + 1] = slotCount;

        let i = slotCount;
        while (i--) {
            if (zOrders[i] === -1) {
                frameArray[frameOffset + 2 + i] = unchanged[--unchangedIndex] || 0;
            }
            else {
                frameArray[frameOffset + 2 + i] = zOrders[i] || 0;
            }
        }
    }
    else {
        frameArray.length += 1;
        frameArray[frameOffset + 1] = 0;
    }

    return frameOffset;
}

function createBoneTimeline(timeline: dbft.BoneTimeline): number[] {
    const timelines = new Array<number>();

    if (timeline.translateFrame.length > 0) {
        timelines.push(dbft.TimelineType.BoneTranslate);
        timelines.push(createTimeline(timeline, timeline.translateFrame, FrameValueType.Float, 2, (frame, frameStart): number => {
            const offset = createTweenFrame(frame, frameStart);
            frameFloatArray.push(frame.x);
            frameFloatArray.push(frame.y);

            return offset;
        }));
    }

    if (timeline.rotateFrame.length > 0) {
        let clockwise = 0;
        let prevRotate = 0.0;
        timelines.push(dbft.TimelineType.BoneRotate);
        timelines.push(createTimeline(timeline, timeline.rotateFrame, FrameValueType.Float, 2, (frame, frameStart): number => {
            const offset = createTweenFrame(frame, frameStart);

            let rotate = frame.rotate;
            if (frameStart !== 0) {
                if (clockwise === 0) {
                    rotate = prevRotate + geom.normalizeDegree(rotate - prevRotate);
                }
                else {
                    if (clockwise > 0 ? rotate >= prevRotate : rotate <= prevRotate) {
                        clockwise = clockwise > 0 ? clockwise - 1 : clockwise + 1;
                    }

                    rotate = prevRotate + rotate - prevRotate + geom.PI_D * clockwise * geom.RAD_DEG;
                }
            }

            clockwise = frame.clockwise;
            prevRotate = rotate;

            frameFloatArray.push(rotate * geom.DEG_RAD);
            frameFloatArray.push(geom.normalizeDegree(frame.skew) * geom.DEG_RAD);

            return offset;
        }));
    }

    if (timeline.scaleFrame.length > 0) {
        timelines.push(dbft.TimelineType.BoneScale);
        timelines.push(createTimeline(timeline, timeline.scaleFrame, FrameValueType.Float, 2, (frame, frameStart): number => {
            const offset = createTweenFrame(frame, frameStart);
            frameFloatArray.push(frame.x);
            frameFloatArray.push(frame.y);

            return offset;
        }));
    }

    return timelines;
}

function createSurfaceTimeline(timeline: dbft.TypeTimeline): number {
    const surface = currentArmature.getBone(timeline.name) as dbft.Surface;
    const vertexCount = surface.vertices.length / 2;
    const frames = timeline.frame as dbft.MutilpleValueFrame[];

    for (const frame of frames) {
        let x = 0.0;
        let y = 0.0;

        const vertices = new Array<number>();
        for (
            let i = 0;
            i < vertexCount * 2;
            i += 2
        ) {
            if (frame.value.length === 0) {
                x = 0.0;
                y = 0.0;
            }
            else {
                if (i < frame.offset || i - frame.offset >= frame.value.length) {
                    x = 0.0;
                }
                else {
                    x = frame.value[i - frame.offset];
                }

                if (i + 1 < frame.offset || i + 1 - frame.offset >= frame.value.length) {
                    y = 0.0;
                }
                else {
                    y = frame.value[i + 1 - frame.offset];
                }
            }

            vertices.push(x, y);
        }

        frame.value.length = 0;
        for (const value of vertices) {
            frame.value.push(value);
        }
    }

    const firstValues = frames[0].value;
    const count = firstValues.length;
    let completedBegin = false;
    let completedEnd = false;
    let begin = 0;
    let end = count - 1;

    while (!completedBegin || !completedEnd) {
        if (!completedBegin) {
            for (const frame of frames) {
                if (frame.value[begin] !== firstValues[begin]) {
                    completedBegin = true;
                    break;
                }
            }

            if (begin === count - 1) {
                completedBegin = true;
            }
            else if (!completedBegin) {
                begin++;
            }
        }

        if (completedBegin && !completedEnd) {
            for (const frame of frames) {
                if (frame.value[end] !== firstValues[end]) {
                    completedEnd = true;
                    break;
                }
            }

            if (end === begin) {
                completedEnd = true;
            }
            else if (!completedEnd) {
                end--;
            }
        }
    }

    const frameIntOffset = frameIntArray.length;
    const valueCount = end - begin + 1;

    frameIntArray.length += 5;
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformMeshOffset] = surface.offset; // Surface offset.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformCount] = count; // Deform count.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformValueCount] = valueCount; // Value count.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformValueOffset] = begin; // Value offset.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformFloatOffset] = frameFloatArray.length - currentAnimationBinary.offset[dbft.OffsetOrder.FrameFloat]; // Float offset.

    for (let i = 0; i < begin; ++i) {
        frameFloatArray.push(firstValues[i]);
    }

    for (let i = end + 1; i < count; ++i) {
        frameFloatArray.push(firstValues[i]);
    }

    const timelineOffset = createTimeline(timeline, frames, FrameValueType.Float, valueCount, (frame, frameStart) => {
        const offset = createTweenFrame(frame, frameStart);
        for (let i = 0; i < valueCount; ++i) {
            frameFloatArray.push(frame.value[begin + i]);
        }

        return offset;
    });

    // Get more infomation form value count offset.
    timelineArray[timelineOffset + dbft.BinaryOffset.TimelineFrameValueCount] = frameIntOffset - currentAnimationBinary.offset[dbft.OffsetOrder.FrameInt];

    return timelineOffset;
}

function createDeformTimeline(timeline: dbft.SlotDeformTimeline | dbft.TypeTimeline): number {
    const mesh = (
        timeline instanceof dbft.SlotDeformTimeline ?
            currentArmature.getDisplay(timeline.skin, timeline.slot, timeline.name) :
            currentArmature.getDisplay("", "", timeline.name)
    ) as dbft.MeshDisplay | null; // TODO

    if (!mesh) {
        return -1;
    }

    const vertexCount = mesh.vertices.length / 2;
    const frames = timeline.frame as dbft.MutilpleValueFrame[];

    for (const frame of frames) {
        let x = 0.0;
        let y = 0.0;
        let iB = 0;
        if (mesh.weights.length > 0) {
            geom.helpMatrixA.copyFromArray(mesh.slotPose, 0);
            // frameFloatArray.length += mesh._weightCount * 2; // TODO CK
        }
        else {
            // frameFloatArray.length += vertexCount * 2;
        }

        if (frame.vertices.length > 0) { // 
            frame.value.length = 0;
            for (const value of frame.vertices) {
                frame.value.push(value);
            }

            frame.vertices.length = 0;
        }

        const vertices = new Array<number>();
        for (
            let i = 0;
            i < vertexCount * 2;
            i += 2
        ) {
            if (frame.value.length === 0) {
                x = 0.0;
                y = 0.0;
            }
            else {
                if (i < frame.offset || i - frame.offset >= frame.value.length) {
                    x = 0.0;
                }
                else {
                    x = frame.value[i - frame.offset];
                }

                if (i + 1 < frame.offset || i + 1 - frame.offset >= frame.value.length) {
                    y = 0.0;
                }
                else {
                    y = frame.value[i + 1 - frame.offset];
                }
            }

            if (mesh.weights.length > 0) { // If mesh is skinned, transform point by bone bind pose.
                const vertexBoneCount = mesh.weights[iB++];

                geom.helpMatrixA.transformPoint(x, y, geom.helpPointA, true);
                x = geom.helpPointA.x;
                y = geom.helpPointA.y;

                for (let j = 0; j < vertexBoneCount; ++j) {
                    const rawBoneIndex = mesh.weights[iB];
                    geom.helpMatrixB.copyFromArray(mesh.bonePose, mesh.getBonePoseOffset(rawBoneIndex) + 1);
                    geom.helpMatrixB.invert();
                    geom.helpMatrixB.transformPoint(x, y, geom.helpPointA, true);

                    vertices.push(geom.helpPointA.x, geom.helpPointA.y);
                    iB += 2;
                }
            }
            else {
                vertices.push(x, y);
            }
        }

        frame.value.length = 0;
        for (const value of vertices) {
            frame.value.push(value);
        }
    }

    const firstValues = frames[0].value;
    const count = firstValues.length;
    let completedBegin = false;
    let completedEnd = false;
    let begin = 0;
    let end = count - 1;

    while (!completedBegin || !completedEnd) {
        if (!completedBegin) {
            for (const frame of frames) {
                if (frame.value[begin] !== firstValues[begin]) {
                    completedBegin = true;
                    break;
                }
            }

            if (begin === count - 1) {
                completedBegin = true;
            }
            else if (!completedBegin) {
                begin++;
            }
        }

        if (completedBegin && !completedEnd) {
            for (const frame of frames) {
                if (frame.value[end] !== firstValues[end]) {
                    completedEnd = true;
                    break;
                }
            }

            if (end === begin) {
                completedEnd = true;
            }
            else if (!completedEnd) {
                end--;
            }
        }
    }

    const frameIntOffset = frameIntArray.length;
    const valueCount = end - begin + 1;
    frameIntArray.length += 5;
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformMeshOffset] = mesh.offset; // Mesh offset.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformCount] = count; // Deform count.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformValueCount] = valueCount; // Value count.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformValueOffset] = begin; // Value offset.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformFloatOffset] = frameFloatArray.length - currentAnimationBinary.offset[dbft.OffsetOrder.FrameFloat]; // Float offset.

    for (let i = 0; i < begin; ++i) {
        frameFloatArray.push(firstValues[i]);
    }

    for (let i = end + 1; i < count; ++i) {
        frameFloatArray.push(firstValues[i]);
    }

    const timelineOffset = createTimeline(timeline, frames, FrameValueType.Float, valueCount, (frame, frameStart) => {
        const offset = createTweenFrame(frame, frameStart);
        for (let i = 0; i < valueCount; ++i) {
            frameFloatArray.push(frame.value[begin + i]);
        }

        return offset;
    });

    // Get more infomation form value count offset.
    timelineArray[timelineOffset + dbft.BinaryOffset.TimelineFrameValueCount] = frameIntOffset - currentAnimationBinary.offset[dbft.OffsetOrder.FrameInt];

    return timelineOffset;
}

function modifyBytesPosition(bytes: number[], byte: number = 0): void {
    while ((bytes.length % 4) !== 0) {
        bytes.push(byte);
    }
}

function stringToUTF8Array(string: string): number[] {
    const result: number[] = [];

    for (let i = 0; i < string.length; i++) {
        const c = string.charAt(i);
        const cc = c.charCodeAt(0);

        if (cc > 0xFFFF) {
            throw new Error("InvalidCharacterError");
        }

        if (cc > 0x80) {
            if (cc < 0x07FF) {
                const c1 = (cc >>> 6) | 0xC0;
                const c2 = (cc & 0x3F) | 0x80;
                result.push(c1, c2);
            }
            else {
                const c1 = (cc >>> 12) | 0xE0;
                const c2 = ((cc >>> 6) & 0x3F) | 0x80;
                const c3 = (cc & 0x3F) | 0x80;
                result.push(c1, c2, c3);
            }
        }
        else {
            result.push(cc);
        }
    }

    return result;
}