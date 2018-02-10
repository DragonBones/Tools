import { Map } from "../common/types";
import * as utils from "../common/utils";
import { Endian, ByteArray } from "../common/byteArray";
import * as geom from "../format/geom";
import * as dbft from "../format/dragonBonesFormat";

const byteArray: ByteArray = new ByteArray();

const intArray: Array<number> = [];
const floatArray: Array<number> = [];
const timelineArray: Array<number> = [];
const frameArray: Array<number> = [];
const frameIntArray: Array<number> = [];
const frameFloatArray: Array<number> = [];
const colors: Map<number> = {};

let currentArmature: dbft.Armature;
let currentAnimationBinary: dbft.AnimationBinary;
// let currentTimeline: dbft.Timeline<any>;
/**
 * Convert DragonBones format to binary.
 */
export default function (data: dbft.DragonBones): ArrayBuffer {
    // Clean helper.
    byteArray.clear();
    intArray.length = 0;
    floatArray.length = 0;
    timelineArray.length = 0;
    frameArray.length = 0;
    frameIntArray.length = 0;
    frameFloatArray.length = 0;
    for (let k in colors) {
        delete colors[k];
    }

    const binaryDatas = new Array<dbft.MeshDisplay>();
    const pathBinaryDatas = new Array<dbft.PathDisplay>();
    for (currentArmature of data.armature) {
        for (const skin of currentArmature.skin) {
            for (const slot of skin.slot) {
                for (const display of slot.display) {
                    if (display instanceof dbft.MeshDisplay) {
                        display.offset = createMesh(display);
                        binaryDatas.push(display);
                    }
                    else if (display instanceof dbft.PathDisplay) {
                        display.offset = createPath(display);
                        pathBinaryDatas.push(display);
                    }
                }
            }
        }

        const animationBinarys = new Array<dbft.AnimationBinary>();
        for (const animation of currentArmature.animation as dbft.Animation[]) {
            currentAnimationBinary = new dbft.AnimationBinary();
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
                currentAnimationBinary.action = createTimeline(animation, animation.frame, false, false, 0, createActionFrame);
            }

            if (animation.zOrder) {
                currentAnimationBinary.zOrder = createTimeline(animation.zOrder, animation.zOrder.frame, false, false, 0, createZOrderFrame);
            }

            for (const timeline of animation.bone) {
                currentAnimationBinary.bone[timeline.name] = createBoneTimeline(timeline);
            }

            for (const timeline of animation.surface) {
                currentAnimationBinary.surface[timeline.name] = createSurfaceTimeline(timeline);
            }

            for (const timeline of animation.slot) {
                currentAnimationBinary.slot[timeline.name] = createSlotTimeline(timeline);
            }

            for (const timeline of animation.ffd) {
                if (!(timeline.slot in currentAnimationBinary.slot)) {
                    currentAnimationBinary.slot[timeline.slot] = [];
                }

                const timelines = currentAnimationBinary.slot[timeline.slot];
                for (const value of createMeshDeformTimeline(timeline)) {
                    timelines.push(value);
                }
            }

            for (const timeline of animation.ik) {
                currentAnimationBinary.constraint[timeline.name] = createIKConstraintTimeline(timeline);
            }
        }

        currentArmature.animation.length = 0;
        for (const animation of animationBinarys) {
            currentArmature.animation.push(animation);
        }

        // Clear binary data. 
        for (const data of binaryDatas) {
            data.clearToBinary();
        }

        for (const data of pathBinaryDatas) {
            data.clearToBinary();
        }

        binaryDatas.length = 0;
        pathBinaryDatas.length = 0;
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

    // Offset.
    data.offset[0] = 0;
    data.offset[1] = intArray.length * Int16Array.BYTES_PER_ELEMENT;
    data.offset[2] = data.offset[0] + data.offset[1];
    data.offset[3] = floatArray.length * Float32Array.BYTES_PER_ELEMENT;
    data.offset[4] = data.offset[2] + data.offset[3];
    data.offset[5] = frameIntArray.length * Int16Array.BYTES_PER_ELEMENT;
    data.offset[6] = data.offset[4] + data.offset[5];
    data.offset[7] = frameFloatArray.length * Float32Array.BYTES_PER_ELEMENT;
    data.offset[8] = data.offset[6] + data.offset[7];
    data.offset[9] = frameArray.length * Int16Array.BYTES_PER_ELEMENT;
    data.offset[10] = data.offset[8] + data.offset[9];
    data.offset[11] = timelineArray.length * Uint16Array.BYTES_PER_ELEMENT;
    utils.compress(data, dbft.compressConfig);

    // Write DragonBones format tag.
    byteArray.endian = Endian.LITTLE_ENDIAN;
    byteArray.writeByte("D".charCodeAt(0));
    byteArray.writeByte("B".charCodeAt(0));
    byteArray.writeByte("D".charCodeAt(0));
    byteArray.writeByte("T".charCodeAt(0));
    byteArray.writeByte(0);
    byteArray.writeByte(0);
    byteArray.writeByte(0);
    byteArray.writeByte(1);

    const jsonString = JSON.stringify(data);
    byteArray.writeUTF(jsonString, true);

    // Modify json length.
    modifyBytesPosition(byteArray, " ".charCodeAt(0));
    const position = byteArray.position;
    byteArray.position = 8;
    byteArray.writeUnsignedInt(position - 8 - 4);
    byteArray.position = position;

    byteArray.length +=
        intArray.length * Int16Array.BYTES_PER_ELEMENT +
        floatArray.length * Float32Array.BYTES_PER_ELEMENT +
        frameIntArray.length * Int16Array.BYTES_PER_ELEMENT +
        frameFloatArray.length * Float32Array.BYTES_PER_ELEMENT +
        frameArray.length * Int16Array.BYTES_PER_ELEMENT +
        timelineArray.length * Uint16Array.BYTES_PER_ELEMENT;

    for (const value of intArray) {
        byteArray.writeShort(value);
    }

    for (const value of floatArray) {
        byteArray.writeFloat(value);
    }

    for (const value of frameIntArray) {
        byteArray.writeShort(value);
    }

    for (const value of frameFloatArray) {
        byteArray.writeFloat(value);
    }

    for (const value of frameArray) {
        byteArray.writeShort(value);
    }

    for (const value of timelineArray) {
        byteArray.writeUnsignedShort(value);
    }

    return byteArray.buffer;
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

    return offset;
}

function createPath(value: dbft.PathDisplay): number {
    const vertexCount = value.vertexCount;
    const offset = intArray.length;
    const vertexOffset = floatArray.length;

    intArray.length += 1 + 1 + 1 + 1;
    intArray[offset + dbft.BinaryOffset.PathVertexCount] = vertexCount;
    intArray[offset + dbft.BinaryOffset.PathFloatOffset] = vertexOffset;

    if (value.weights.length === 0) {
        floatArray.length += value.vertices.length;

        for (let i = 0, l = value.vertices.length; i < l; i++) {
            floatArray[vertexOffset + i] = value.vertices[i];
        }

        intArray[offset + dbft.BinaryOffset.PathWeightOffset] = -1;
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

        intArray[offset + dbft.BinaryOffset.PathWeightOffset] = weightOffset;
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
    intArray[offset + dbft.BinaryOffset.MeshVertexCount] = vertexCount;
    intArray[offset + dbft.BinaryOffset.MeshTriangleCount] = triangleCount;
    intArray[offset + dbft.BinaryOffset.MeshFloatOffset] = vertexOffset;
    for (let i = 0, l = triangleCount * 3; i < l; ++i) {
        intArray[offset + dbft.BinaryOffset.MeshVertexIndices + i] = value.triangles[i];
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

        intArray[offset + dbft.BinaryOffset.MeshWeightOffset] = weightOffset;
    }
    else {
        intArray[offset + dbft.BinaryOffset.MeshWeightOffset] = -1;
    }

    return offset;
}

function createTimeline<T extends dbft.Frame>(
    value: dbft.Timeline | dbft.Animation, frames: T[],
    addIntOffset: boolean, addFloatOffset: boolean, frameValueCount: number,
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
    if (addIntOffset) {
        timelineArray[offset + dbft.BinaryOffset.TimelineFrameValueOffset] = frameIntArray.length - currentAnimationBinary.offset[dbft.OffsetOrder.FrameInt];
    }
    else if (addFloatOffset) {
        timelineArray[offset + dbft.BinaryOffset.TimelineFrameValueOffset] = frameFloatArray.length - currentAnimationBinary.offset[dbft.OffsetOrder.FrameFloat];
    }
    else {
        timelineArray[offset + dbft.BinaryOffset.TimelineFrameValueOffset] = 0;
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
            const sampleCount = frame.duration + 1;
            const samples = new Array<number>(sampleCount);
            dbft.samplingEasingCurve(frame.curve, samples);

            frameArray.length += 1 + 1 + samples.length;
            frameArray[frameOffset + dbft.BinaryOffset.FrameTweenType] = dbft.TweenType.Curve;
            frameArray[frameOffset + dbft.BinaryOffset.FrameTweenEasingOrCurveSampleCount] = sampleCount;
            for (let i = 0; i < sampleCount; ++i) {
                frameArray[frameOffset + dbft.BinaryOffset.FrameCurveSamples + i] = Math.round(samples[i] * 10000.0);
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

function createZOrderFrame(frame: dbft.ZOrderFrame, frameStart: number): number {
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

function createBoneTimeline(value: dbft.BoneTimeline): number[] {
    const timelines = new Array<number>();

    if (value.frame.length > 0) {
        let clockwise = 0;
        let prevRotate = 0.0;

        timelines.push(dbft.TimelineType.BoneAll);
        timelines.push(createTimeline(value, value.frame, false, true, 6, (frame, frameStart): number => {
            const offset = createTweenFrame(frame, frameStart);
            let rotate = frame.transform.skY;
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

            clockwise = frame.tweenRotate;
            prevRotate = rotate;

            frameFloatArray.push(frame.transform.x);
            frameFloatArray.push(frame.transform.y);
            frameFloatArray.push(rotate * geom.DEG_RAD);
            frameFloatArray.push(geom.normalizeDegree(frame.transform.skX - frame.transform.skY) * geom.DEG_RAD); //
            frameFloatArray.push(frame.transform.scX);
            frameFloatArray.push(frame.transform.scY);

            return offset;
        }));
    }

    if (value.translateFrame.length > 0) {
        timelines.push(dbft.TimelineType.BoneTranslate);
        timelines.push(createTimeline(value, value.translateFrame, false, true, 2, (frame, frameStart): number => {
            const offset = createTweenFrame(frame, frameStart);
            frameFloatArray.push(frame.x);
            frameFloatArray.push(frame.y);

            return offset;
        }));
    }

    if (value.rotateFrame.length > 0) {
        let clockwise = 0;
        let prevRotate = 0.0;
        timelines.push(dbft.TimelineType.BoneRotate);
        timelines.push(createTimeline(value, value.rotateFrame, false, true, 2, (frame, frameStart): number => {
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

    if (value.scaleFrame.length > 0) {
        timelines.push(dbft.TimelineType.BoneScale);
        timelines.push(createTimeline(value, value.scaleFrame, false, true, 2, (frame, frameStart): number => {
            const offset = createTweenFrame(frame, frameStart);
            frameFloatArray.push(frame.x);
            frameFloatArray.push(frame.y);

            return offset;
        }));
    }

    return timelines;
}

function createSurfaceTimeline(value: dbft.SurfaceTimeline): number[] {
    const timelines = new Array<number>();

    const surface = currentArmature.getBone(value.name) as dbft.Surface;
    if (!surface || surface.type !== dbft.BoneType.Surface) {
        return timelines;
    }

    const vertexCount = surface.vertices.length / 2;
    for (const frame of value.frame) {
        let x = 0.0;
        let y = 0.0;

        const vertices = new Array<number>();
        for (
            let i = 0;
            i < vertexCount * 2;
            i += 2
        ) {
            if (frame.vertices.length === 0) {
                x = 0.0;
                y = 0.0;
            }
            else {
                if (i < frame.offset || i - frame.offset >= frame.vertices.length) {
                    x = 0.0;
                }
                else {
                    x = frame.vertices[i - frame.offset];
                }

                if (i + 1 < frame.offset || i + 1 - frame.offset >= frame.vertices.length) {
                    y = 0.0;
                }
                else {
                    y = frame.vertices[i + 1 - frame.offset];
                }
            }

            vertices.push(x, y);
        }

        frame.vertices = vertices;
    }

    const firstValues = value.frame[0].vertices;
    const count = firstValues.length;
    let completedBegin = false;
    let completedEnd = false;
    let begin = 0;
    let end = count - 1;

    while (!completedBegin || !completedEnd) {
        if (!completedBegin) {
            for (const frame of value.frame) {
                if (frame.vertices[begin] !== firstValues[begin]) {
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
            for (const frame of value.frame) {
                if (frame.vertices[end] !== firstValues[end]) {
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
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformMeshOffset] = 0; // Empty.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformCount] = count; // Deform count.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformValueCount] = valueCount; // Value count.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformValueOffset] = begin; // Value offset.
    frameIntArray[frameIntOffset + dbft.BinaryOffset.DeformFloatOffset] = frameFloatArray.length - currentAnimationBinary.offset[dbft.OffsetOrder.FrameFloat]; // Float offset.

    for (let i = 0; i < begin; ++i) {
        frameFloatArray.push(firstValues[i]);
    }

    for (let i = count - 1; i > end; --i) {
        frameFloatArray.push(firstValues[i]);
    }

    const timelineOffset = createTimeline(value, value.frame, false, true, valueCount, (frame, frameStart) => {
        const offset = createTweenFrame(frame, frameStart);
        for (let i = 0; i < valueCount; ++i) {
            frameFloatArray.push(frame.vertices[begin + i]);
        }

        return offset;
    });

    // Get more infomation form value count offset.
    timelineArray[timelineOffset + dbft.BinaryOffset.TimelineFrameValueCount] = frameIntOffset - currentAnimationBinary.offset[dbft.OffsetOrder.FrameInt];

    timelines.push(dbft.TimelineType.Surface);
    timelines.push(timelineOffset);

    return timelines;
}

function createSlotTimeline(value: dbft.SlotTimeline): number[] {
    const timelines = new Array<number>();

    if (value.displayFrame.length > 0) {
        timelines.push(dbft.TimelineType.SlotDisplay);
        timelines.push(createTimeline(value, value.displayFrame, false, false, 0, (frame, frameStart) => {
            const offset = createFrame(frame, frameStart);
            frameArray.push(frame.value);

            return offset;
        }));
    }

    if (value.colorFrame.length > 0) {
        timelines.push(dbft.TimelineType.SlotColor);
        timelines.push(createTimeline(value, value.colorFrame, true, false, 1, (frame, frameStart) => {
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

    return timelines;
}

function createMeshDeformTimeline(value: dbft.MeshDeformTimeline): number[] {
    const timelines = new Array<number>();

    const mesh = currentArmature.getMesh(value.skin, value.slot, value.name);
    if (!mesh) {
        return timelines;
    }

    const vertexCount = mesh.vertices.length / 2;
    for (const frame of value.frame) {
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

        const vertices = new Array<number>();
        for (
            let i = 0;
            i < vertexCount * 2;
            i += 2
        ) {
            if (frame.vertices.length === 0) {
                x = 0.0;
                y = 0.0;
            }
            else {
                if (i < frame.offset || i - frame.offset >= frame.vertices.length) {
                    x = 0.0;
                }
                else {
                    x = frame.vertices[i - frame.offset];
                }

                if (i + 1 < frame.offset || i + 1 - frame.offset >= frame.vertices.length) {
                    y = 0.0;
                }
                else {
                    y = frame.vertices[i + 1 - frame.offset];
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

        frame.vertices = vertices;
    }

    const firstValues = value.frame[0].vertices;
    const count = firstValues.length;
    let completedBegin = false;
    let completedEnd = false;
    let begin = 0;
    let end = count - 1;

    while (!completedBegin || !completedEnd) {
        if (!completedBegin) {
            for (const frame of value.frame) {
                if (frame.vertices[begin] !== firstValues[begin]) {
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
            for (const frame of value.frame) {
                if (frame.vertices[end] !== firstValues[end]) {
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

    for (let i = count - 1; i > end; --i) {
        frameFloatArray.push(firstValues[i]);
    }

    const timelineOffset = createTimeline(value, value.frame, false, true, valueCount, (frame, frameStart) => {
        const offset = createTweenFrame(frame, frameStart);
        for (let i = 0; i < valueCount; ++i) {
            frameFloatArray.push(frame.vertices[begin + i]);
        }

        return offset;
    });

    // Get more infomation form value count offset.
    timelineArray[timelineOffset + dbft.BinaryOffset.TimelineFrameValueCount] = frameIntOffset - currentAnimationBinary.offset[dbft.OffsetOrder.FrameInt];

    timelines.push(dbft.TimelineType.MeshDeform);
    timelines.push(timelineOffset);

    return timelines;
}

function createIKConstraintTimeline(value: dbft.IKConstraintTimeline): number[] {
    const timelines = new Array<number>();

    const timelineOffset = createTimeline(value, value.frame, true, false, 2, (frame, frameStart) => {
        const offset = createTweenFrame(frame, frameStart);
        frameIntArray.push(frame.bendPositive ? 1 : 0);
        frameIntArray.push(Math.round(frame.weight * 100.0));

        return offset;
    });

    timelines.push(dbft.TimelineType.IKConstraint);
    timelines.push(timelineOffset);

    return timelines;
}

function modifyBytesPosition(bytes: ByteArray, byte: number = 0): void {
    while ((bytes.position % 4) !== 0) {
        bytes.writeByte(byte);
    }
}