# DragonBones 5.5 JSON format
[中文](./dragonbones_json_format_5.5-zh_CN.md)
```javascript
{
    // The name of the DragonBones data.
    "name": "dragonBonesName",

    // The version of the DragonBones data.
    "version": "5.5",
    
    // The minimum compatible version of the DragonBones data.
    "compatibleVersion": "5.5",

    // The frame rate of animations. (Optional property, default: 24)
    "frameRate": 24,

    // The custom user data. (Optional property, default: null)
    "userData": null,

    // A list of the armatures. (Optional property, default: null)
    "armature": [{

        // The name of the armature.
        "name": "armatureName",

        // The frame rate of animations. (Optional property, default: null)
        // [null: Same as the frame rate of the DragonBones data, N: The frame rate.]
        "frameRate": 24,

        // Nonessential.
        "type": "Armature",

        // The custom user data. (Optional property, default: null)
        "userData": null,

        // A list of default actions when added to a parent armature. (Optional property, default: null)
        "defaultActions": [
            {
                "gotoAndPlay": "animationName"
            }
        ],

        // A list of the bones. (Optional property, default: null)
        "bone": [{

            // The name of the bone.
            "name": "boneName",

            // The name of the parent bone. (Optional property, default: null)
            "parent": "parentBoneName",

            // The custom user data. (Optional property, default: null)
            "userData": null,

            // The transform of the bone relative to the parent bone or the armature for the base pose.
            // (Optional property, default: null)
            "transform": {
                "x": 0.0, // The horizontal translate. (Optional property, default: 0.0)
                "y": 0.0, // The vertical translate. (Optional property, default: 0.0)
                "skX": 0.0, // The horizontal skew. (Optional property, default: 0.0)
                "skY": 0.0, // The vertical skew. (Optional property, default: 0.0)
                "scX": 1.0, // The horizontal scale. (Optional property, default: 1.0)
                "scY": 1.0  // The vertical scale. (Optional property, default: 1.0)
            }
        }],

        // A list of the slots.
        "slot": [{

            // The name of the slot.
            "name": "slotName",

            // The name of the parent bone.
            "parent": "parentBoneName",

            // The default display index of the slot. (Optional property, default: 0)
            "displayIndex": 0,

            // The blend mode of the slot. (Optional property, default: null)
            "blendMode": null,

            // The custom user data. (Optional property, default: null)
            "userData": null,

            // The color transform of the slot. (Optional property, default: null)
            "color": {
                "aM": 100, // The alpha multiplier. [0~100] (Optional property, default: 100)
                "rM": 100, // The red multiplier. [0~100] (Optional property, default: 100)
                "gM": 100, // The green multiplier. [0~100] (Optional property, default: 100)
                "bM": 100, // The blue multiplier. [0~100] (Optional property, default: 100)
                "aO": 0, // The alpha offset. [-255~255] (Optional property, default: 0)
                "rO": 0, // The red offset. [-255~255] (Optional property, default: 0)
                "gO": 0, // The green offset. [-255~255] (Optional property, default: 0)
                "bO": 0, // The blue offset. [-255~255] (Optional property, default: 0)
            }
        }],

        // A list of the skins.
        "skin": [{

            // The name of the skin.
            "name": "skinName",

            // A list of the slots.
            "slot": [{

                // The name of the slot.
                "name": "slotName",

                // A list of the displays.
                "display": [{

                    // The name of the display.
                    "name": "displayName",

                    // The type of the display. (Optional property, default: "image")
                    // [
                    //     "image": A textured rectangle, 
                    //     "armature": A nested child armature, 
                    //     "mesh": A textured mesh, 
                    //     "boundingBox": A bounding box
                    // ]
                    "type": "image",

                    // The resource path of the display. (Optional property, default: null)
                    "path": null,

                    // The name of the shared mesh. (Optional property, default: null)
                    "share": "meshName",

                    // Whether to inherit the FFD animations of the shared mesh. (Optional property, default: true)
                    "inheritFFD": true,

                    // The sub type of the display.
                    // If the display is a bounding box: (Optional property, default: "rectangle")
                    // ["rectangle": A rectangle, "ellipse": An ellipse, "polygon": A pllygon]
                    "subType": "rectangle", 

                    // Nonessential.
                    "color": 0x000000,

                    // The transform of the display relative to the slot's bone. (Optional property, default: null)
                    "transform": {
                        "x": 0.0, // The horizontal translate. (Optional property, default: 0.0)
                        "y": 0.0, // The vertical translate. (Optional property, default: 0.0)
                        "skX": 0.0, // The horizontal skew. (Optional property, default: 0.0)
                        "skY": 0.0, // The vertical skew. (Optional property, default: 0.0)
                        "scX": 1.0, // The horizontal scale. (Optional property, default: 1.0)
                        "scY": 1.0  // The vertical scale. (Optional property, default: 1.0)
                    },

                    // The relative pivot of the display. (Optional property, default: null)
                    "pivot": {
                        "x": 0.5, // The horizontal translate. [0.0~1.0] (Optional property, default: 0.5)
                        "y": 0.5, // The vertical translate. [0.0~1.0] (Optional property, default: 0.5)
                    },

                    // The size of display. (Valid for bounding box only)
                    "width": 100,
                    "height": 100,

                    "vertices": [-64.00, -64.00, 64.00, -64.00, 64.00, 64.00, -64.00, 64.00],

                    "uvs": [0.0000, 0.0000, 1.0000, 0.0000, 1.0000, 1.0000, 0.0000, 1.0000],

                    "triangles": [0, 1, 2, 2, 3, 0],

                    "weights": [1, 0, 1.00, 2, 0, 0.50, 1, 0.50],

                    "slotPose": [1.0000, 0.0000, 0.0000, 1.0000, 0.00, 0.00],

                    "bonePose": [0, 1.0000, 0.0000, 0.0000, 1.0000, 0.00, 0.00],

                    // Override the default actions of the nested child armature. (Optional property, default: null)
                    "actions": [
                        {
                            "gotoAndPlay": "animationName"
                        }
                    ]
                }]
            }]
        }],

        // A list of the IK constraints.
        "ik": [{

            // The name of the IK constraint.
            "name": "ikName",

            // The name of the bone.
            "bone": "boneName",

            // The name of the target bone.
            "target": "ikBoneName",

            // The IK constraint bend direction. (Optional property, default: true)
            // [true: Positive direction / Clockwise, false: Reverse Direction / Counterclockwise]
            "bendPositive": true,

            // The bone count of the bone chain in the constraint.
            // [0: Only the bone, N: The bone and the bone up N-level parent bones] (Optional property, default: 0)
            "chain": 0,

            // The weight of the IK constraint. [0.0~1.0] (Optional property, default: 1.0)
            "weight": 1.0
        }],

        // A list of the animations.
        "animation": [{

            // The name of animation.
            "name": "animationName",

            // The play times of the animation. [0: Loop play, N: Play N times] (Optional property, default: 1)
            "playTimes": 1,

            // The duration of the animation. (Optional property, default: 1)
            "duration": 1,

            // A list of the action keyframes. (Optional property, default: null)
            "frame": [{

                // The duration of the frame. (Optional property, default: 1)
                "duration": 1,

                // A list of actions. (Optional property, default: null)
                "actions": [{

                    // The type of the action. (Optional property, default: 0)
                    // [0: Play animation, 10: Frame event, 11: Frame sound event]
                    "type": 0,

                    // The name of the action. (The name of a animation or an event)
                    "name": "actionName",

                    // A bone name. (Optional property, default: null)
                    "bone": "boneName",

                    // A slot name. (Optional property, default: null)
                    "slot": "slotName",

                    // The list of custom data. (Optional property, default: null)
                    "ints":[0， 1， 2],
                    "floats":[0.01， 1.01， 2.01],
                    "strings":["a", "b", "c"]
                }]
            }],

            // The z order timeline.
            "zOrder": {
                "frame": [{
                    
                    // The duration of the frame. (Optional property, default: 1)
                    "duration": 1,

                    // A list of slot indeices and numeric offsets. [slotIndexA, offsetA, slotIndexB, offsetB, ...]
                    // (Optional property, default: null)
                    "zOrder": [0, 2, 4, 1, 6, -1]
                }]
            },

            // A list of the bone timelines.
            "bone": [{

                // The name of the bone.
                "name": "boneName",

                // The scale of the timeline. (Optional property, default: 0.0)
                "scale": 1.0,

                // The offset of the timeline. (Optional property, default: 0.0)
                "offset": 0.0,

                // A list of the translate keyframes. (Optional property, default: null)
                "translateFrame": [{

                    // The duration of the frame. (Optional property, default: 1)
                    "duration": 1,

                    // The tween easing of the frame. [0.0: Linear, null: No easing]. (Optional property, default: 0)
                    "tweenEasing": 0.0,

                    // The interpolation to use between this and the next keyframe. [x1, y1, x2, y2, ...]
                    // (Optional property, default: null)
                    "curve": [0.0, 0.0, 1.0, 1.0],
                    
                    // The horizontal translate of a bone in the keyframe. (Optional property, default: 0.0)
                    "x": 0.0,

                    // The vertical translate of a bone in the keyframe. (Optional property, default: 0.0)
                    "y": 0.00,
                }],

                // A list of the rotate keyframes. (Optional property, default: null)
                "rotateFrame": [{

                    // The duration of the frame. (Optional property, default: 1)
                    "duration": 1,

                    // The tween easing of the frame. [0.0: Linear, null: No easing]. (Optional property, default: 0)
                    "tweenEasing": 0.0,

                    // The interpolation to use between this and the next keyframe. [x1, y1, x2, y2, ...]
                    // (Optional property, default: null)
                    "curve": [0.0, 0.0, 1.0, 1.0],

                    // The rotation behavior during a tween. (Optional property, default: 0)
                    // [
                    //     0: Chooses a direction of rotation that requires the least amount of turning, 
                    //     1: Rotates clockwise, 
                    //     -1: Rotates counterclockwise, 
                    //     N: Rotates clockwise at least N-rings, 
                    //     -N: Rotates counterclockwise at least N-rings
                    // ]
                    "clockwise": 0,

                    // The rotation of a bone in the keyframe. [-PI ~ PI] (Optional property, default: 0.0)
                    "rotate": 0.0,

                    // The skew of a bone in the keyframe. [-PI ~ PI] (Optional property, default: 0.0)
                    "skew": 0.0
                }],

                // A list of the scale keyframes. (Optional property, default: null)
                "scaleFrame": [{

                    // The duration of the frame. (Optional property, default: 1)
                    "duration": 1,

                    // The tween easing of the frame. [0.0: Linear, null: No easing]. (Optional property, default: 0)
                    "tweenEasing": 0.0,

                    // The interpolation to use between this and the next keyframe. [x1, y1, x2, y2, ...]
                    // (Optional property, default: null)
                    "curve": [0.0, 0.0, 1.0, 1.0],

                    // The horizontal scale of a bone in the keyframe. (Optional property, default: 1.0)
                    "x": 1.0,

                    // The vertical scale of a bone in the keyframe. (Optional property, default: 1.0)
                    "y": 1.0
                }]
            }],

            // A list of the slot timelines.
            "slot": [{

                // The name of the slot.
                "name": "slotName",

                // A list of the display keyframes. (Optional property, default: null)
                "displayFrame": [{

                    // The duration of the frame. (Optional property, default: 1)
                    "duration": 1,

                    // The display index of a slot in the keyframe. (Optional property, default: 1)
                    "value": 0,

                    // The actions of a slot in the keyframe. (Optional property, default: null)
                    "actions": [
                        {
                            "gotoAndPlay": "animationName"
                        }
                    ]
                }],
                
                // A list of the color keyframes. (Optional property, default: null)
                "colorFrame": [{

                    // The duration of the frame. (Optional property, default: 1)
                    "duration": 1,

                    // The tween easing of the frame. [0.0: Linear, null: No easing]. (Optional property, default: 0)
                    "tweenEasing": 0.0,

                    // The interpolation to use between this and the next keyframe. [x1, y1, x2, y2, ...]
                    // (Optional property, default: null)
                    "curve": [0.0, 0.0, 1.0, 1.0],

                    // The color transform of a slot in the frame. (Optional property, default: null)
                    "color": {
                        "aM": 100, // The alpha multiplier. [0~100] (Optional property, default: 100)
                        "rM": 100, // The red multiplier. [0~100] (Optional property, default: 100)
                        "gM": 100, // The green multiplier. [0~100] (Optional property, default: 100)
                        "bM": 100, // The blue multiplier. [0~100] (Optional property, default: 100)
                        "aO": 0, // The alpha offset. [-255~255] (Optional property, default: 0)
                        "rO": 0, // The red offset. [-255~255] (Optional property, default: 0)
                        "gO": 0, // The green offset. [-255~255] (Optional property, default: 0)
                        "bO": 0, // The blue offset. [-255~255] (Optional property, default: 0)
                    }
                }]
            }],

            // A list of the FFD timelines. (Optional property, default: null)
            "ffd": [{

                // The name of the mesh.
                "name": "meshName",
                
                // The name of skin.
                "skin": "skinName",

                // The name of slot.
                "slot": "slotName",

                "frame": [{

                    // The duration of the frame. (Optional property, default: 1)
                    "duration": 1,

                    // The tween easing of the frame. [0.0: Linear, null: No easing]. (Optional property, default: 0)
                    "tweenEasing": 0.0,

                    // The interpolation to use between this and the next keyframe. [x1, y1, x2, y2, ...]
                    // (Optional property, default: null)
                    "curve": [0.0, 0.0, 1.0, 1.0],

                    // The number of vertices to skip before applying vertices. (Optional property, default: 0)
                    "offset": 0,

                    // A list of number pairs that are the amounts to add to the setup vertex positions for the keyframe.
                    // (Optional property, default: null)
                    // [x0, y0, x1, y1, ...]
                    "vertices": [0.1, 0.1]
                }]
            }]
        }]
    }]
}
```