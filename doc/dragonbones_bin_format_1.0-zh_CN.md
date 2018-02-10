# DragonBones 5.1 二进制数据格式标准说明

##
* 不需要反序列化
* 运行效率
* 扩展性
* 结构复杂度
* 文件尺寸


## Data Fromat
* [Data Tag](#data_tag)
* [Header](#header)
* [Color](#color)
* [Mesh](#mesh)
* [Timeline](#timeline)
* [Frame](#frame)
* [Tween Frame](#tween_frame)
* [Action Frame](#action_frame)
* [ZOrder Frame](#zorder_frame)
* [FFD Frame](#ffd_frame)
* [Tween Type](#tween_type)


<h2 id="data_tag">Data Tag</h2>

Name | Data Type | Size (Bytes)
:---:|:---------:|:-----------:
Tag | Uint32 | 4
Version | Uint32 | 4
  |  |


<h2 id="header">Header</h2>

Name | Data Type | Size (Bytes)
:---:|:---------:|:-----------:
Header Length | Uint32 | 4
Header | Uint16 | 2
... | ... | ...
  |  |

```javascript
{
    // DragonBones 数据名称（请区分 DragonBones 数据名称和骨架名称，一个 DragonBones 数据可包含多个骨架）
    "name": "dragonBonesName",
    // 数据版本
    "version": "5.0",
    // 最低兼容版本
    "compatibleVersion": "4.5",
    // 动画帧频
    "frameRate": 24,
    // 自定义数据 (可选属性 默认: null)
    "userData": null,

     // 区块偏移和长度
    "offset"：[
        IntOffset, length, 
        FloatOffset, length, 
        FrameIntOffset, length, 
        FrameFloatOffset, length, 
        FrameOffset, length, 
        TimelineOffset, length, 
        ColorOffset, length
    ],

    "search":{
        "color": 0;
    }

    // 骨架列表
    "armature": [{
        // 骨架名称
        "name": "armatureName",
        // 动画帧频 (可选属性 默认: 使用 DragonBones 数据的动画帧频)
        "frameRate": 24,
        // 骨架类型 (可选属性 默认: "Armature")
        // ["Armature": 骨骼动画, "MovieClip": 基本动画, "Stage": 场景动画]
        "type": "Armature",
        // 自定义数据 (可选属性 默认: null)
        "userData": null,

        // 区块偏移
        "offset"：[IntOffset, FloatOffset, FrameOffset],

        // 骨骼列表
        "bone": [{
            // 骨骼名称
            "name": "boneName",
            // 父级骨骼名称
            "parent": "parentBoneName",
            // 是否继承移动 (可选属性 默认: true)
            "inheritTranslation": true,
            // 是否继承旋转 (可选属性 默认: true)
            "inheritRotation": true,
            // 是否继承缩放 (可选属性 默认: true)
            "inheritScale": true,
            // 是否继承镜像 (可选属性 默认: true)
            "inheritReflection": true,
            // 长度 (可选属性 默认: 0.00)
            "length": 0.00,
            // 自定义数据 (可选属性 默认: null)
            "userData": null,

            // 注册到骨架的位移/ 旋转/ 斜切/ 缩放 (可选属性 默认: null)
            "transform": {
                "x": 0.0000,
                "y": 0.0000,
                "r": 0.0000,
                "sk": 0.0000,
                "scX": 1.0000,
                "scY": 1.0000
            }
        }],

        // 插槽列表
        "slot": [{
            // 插槽名称
            "name": "slotName",
            // 插槽所属骨骼名称
            "parent": "parentBoneName",
            // 插槽默认显示对象
            "displayIndex": 0,
            // 插槽显示混合模式
            "blendMode": null,
            // 自定义数据 (可选属性 默认: null)
            "userData": null,
            // 插槽默认颜色
            "color": {
                "aM": 100,
                "rM": 100,
                "gM": 100,
                "bM": 100,
                "aO": 0,
                "rO": 0,
                "gO": 0,
                "bO": 0,
            }
        }],

        // 皮肤列表
        "skin": [{
            // 皮肤名称
            "name": "skinName",
            
            // 皮肤插槽配置列表
            "slot": {
                "name": [{
                    // 显示对象名称
                    "name": "displayName",
                    // 显示对象类型
                    "type": "image",

                    "subType": "rectangle",
                    // 如果共享网格是否继承 FFD 动画
                    "inheritFFD": true,
                    // 数据地址
                    "offset": 10000,
                    // 矩形或椭圆的宽高 (可选属性 默认: 0, 仅对边界框有效)，
                    "width": 100, "height": 100
                    // 
                    "share": "meshName",
                    // 子骨架指向的骨架名称或网格包含的贴图名称 (可选属性 默认: null, 仅对子骨架、网格有效)
                    "path": "path",

                    // 图片显示对象的轴点 (可选属性 默认: null)
                    "pivot": {
                        "x": 0.50, // 水平轴点 [0.00~1.00] (可选属性 默认: 0.50)
                        "y": 0.50, // 垂直轴点 [0.00~1.00] (可选属性 默认: 0.50)
                    },

                    // 注册到骨骼的位移/ 旋转/ 斜切/ 缩放 (可选属性 默认: null)
                    "transform": {
                        "x": 0.0000,
                        "y": 0.0000,
                        "rt": 0.0000,
                        "sk": 0.0000,
                        "scX": 1.0000,
                        "scY": 1.0000
                    },

                    // 添加到舞台后的默认行为列表 (可选属性 默认: null)
                    "actions":[{
                        "type": "play",
                        "name": "animationName"
                    }]
                }]
            }
        }],

        // ik 约束列表
        "ik": [{
            // ik 约束名称
            "name": "ikName",
            // 绑定骨骼名称
            "bone": "boneName",
            // 目标骨骼名称
            "target": "ikBoneName",
            // 弯曲方向 (可选属性 默认: true)
            // [true: 正方向/ 顺时针, false: 反方向/ 逆时针]
            "bendPositive": true,
            // 骨骼链的长度 (可选属性 默认: 0)
            // [0: 只约束 bone, n: 约束 bone 及 bone 向上 n 级的父骨骼]
            "chain": 0,
            // 权重 [0.00: 不约束 ~ 1.00: 完全约束] (可选属性 默认: 1.00)
            "weight": 1.00
        }],

        // 添加到舞台后的默认行为列表 (可选属性 默认: null)
        "defaultActions":[{
            "type": "play",
            "name": "animationName"
        }],

        // 动画列表
        "animation": [{
            // 动画名称
            "name": "animationName",
            // 持续的帧 (可选属性 默认: 1)
            "duration": 1,
            // 循环播放次数 [0: 循环播放无限次, n: 循环播放 n 次] (可选属性 默认: 1)
            "playTimes": 1,
            // 动画淡入时间 (以秒为单位，可选属性 默认: 0)
            "fadeInTime": 1.00,
            // 动画时间的缩放
            "scale": 1.00,
            // 自定义数据 (可选属性 默认: null)
            "userData": null,

            // 行为时间轴地址
            "action": 00000,
            // 层级时间轴地址
            "zOrder": 00001,

            // 区块偏移
            "offset"：[FrameIntOffset, FrameFloatOffset, FrameOffset],
            
            "bone": {
                "name": [TimelineTag, TimelineOffset, TimelineTag, TimelineOffset, ...]
            },

            "slot": {
                "name": [TimelineTag, TimelineOffset, TimelineTag, TimelineOffset, ...]
            },

            "animation": {
                "name": [TimelineTag, TimelineOffset, TimelineTag, TimelineOffset, ...]
            }
        }]
    }]
}
```


<h2 id="color">Color (Int Array)</h2>

Name | Data Type | Size (Bytes) | Value range
:---:|:---------:|:------------:|:----------:
Alpha Multiplier | Int16 | 2 | 0 ~ 100
Red Multiplier | Int16 | 2 | 0 ~ 100
Greed Multiplier | Int16 | 2 | 0 ~ 100
Blue Multiplier | Int16 | 2 | 0 ~ 100
Alpha Offset | Int16 | 2 | -256 ~ 256
Red Offset | Int16 | 2 | -256 ~ 256
Greed Offset | Int16 | 2 | -256 ~ 256
Blue Offset | Int16 | 2 | -256 ~ 256
  |  |


<h2 id="weight">Weight (Int Array)</h2>

Name | Data Type | Size (Bytes) | Value range
:---:|:---------:|:------------:|:-----------:
Bone Count | Int16 | 2
Float Array Offset | Int16 | 2
Bone Indices | Int16 | 2
... | ... | ...
Vertex Bone Count, Vertex Bone Indices | Int16 | 2 | 3, 4, 7, 6
... | ... | ...
Weight, X, Y (Float Array) | Float32 | 4 | 1.0, 12.3, 45.6
... | ... | ...
  |  |


<h2 id="mesh">Mesh (Int Array)</h2>

Name | Data Type | Size (Bytes) | Value range
:---:|:---------:|:------------:|:-----------:
Vertex Count | Int16 | 2
Triangle Count | Int16 | 2
Float Array Offset | Int16 | 2
Weight Offset | Int16 | 2 | -1: No Weight, N: Int Array Offset
Vertex indices | Int16 | 2
... | ... | ...
Vertices (Float Array) | Float32 | 4 | Vertex
... | ... | ...
UVs (Float Array) | Float32 | 4 | UV
... | ... | ...
  |  |


<h2 id="path">Path / Polygon BoundingBox (Int Array)</h2>

Name | Data Type | Size (Bytes) | Value range
:---:|:---------:|:------------:|:-----------:
Vertex Count | Int16 | 2
Empty | Int16 | 2 | 0
Float Array Offset | Int16 | 2 |-1: No Vertices, N: Float Array Offset
Weight Offset | Int16 | 2 | -1: No Weight, N: Int Array Offset
Vertices (Float Array) | Float32 | 4 | Vertex
... | ... | ...
  |  |


<h2 id="timeline">Timeline (Uint Array)</h2>

Name | Data Type | Size (Bytes)
:---:|:---------:|:-----------:
Scale | Uint16 | 2
Offset | Uint16 | 2
Key Frame Count | Uint16 | 2
Frame Value Count or Value Offset (Int Array or Float Array) | Uint16 | 2
Frame Value Offset (Frame Int Array or Frame Float Array) | Uint16 | 2
Frame Array Offsets | Uint16 | 2
... | ... | ...
  |  |


<h2 id="frame">Frame (Frame Array)</h2>

Name | Data Type | Size (Bytes)
:---:|:---------:|:-----------:
Position | Int16 | 2
  |  |


<h2 id="tween_frame">Tween Frame (Frame Array)</h2>

Name | Data Type | Size (Bytes) | Value range
:---:|:---------:|:------------:|:----------:
Tween Type | Int16 | 2 | [Tween Type](#tween_type)
Tween Easing or Curve Sample Count | Int16 | 2 | 0 ~ 100 or Count
Curve Samples | Int16 | 2
... | ... | ...
  |  |


<h2 id="action_frame">Action Frame (Frame Array)</h2>

Name | Data Type | Size (Bytes)
:---:|:---------:|:-----------:
Action Count | Int16 | 2
Action Indices | Int16 | 2
... | ... | ...
  |  |


<h2 id="zorder_frame">ZOrder Frame (Frame Array)</h2>

Name | Data Type | Size (Bytes)
:---:|:---------:|:-----------:
ZOrder Count | Int16 | 2
ZOrders | Int16 | 2
... | ... | ...
  |  |


<h2 id="tween_type">Tween Type</h2>
Value | Type
:----:|:---:
0 | None
1 | Linear
2 | Curve
3 | EaseInQuad
4 | EaseOutQuad
5 | EaseInOutQuad
... | ...
  |  |