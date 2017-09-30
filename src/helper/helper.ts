let internalID: number = -1;
const actions: any = {};
const canvasA = document.getElementById("helpCanvasA") as HTMLCanvasElement;
const canvasB = document.getElementById("helpCanvasB") as HTMLCanvasElement;
const contextA = canvasA.getContext("2d") as CanvasRenderingContext2D;
const contextB = canvasB.getContext("2d") as CanvasRenderingContext2D;

function load(url: string, data: any = null, callback: ((json: any) => void) | null = null): void {
    const xhr = new XMLHttpRequest();

    if (callback) {
        xhr.addEventListener("load", function () {
            callback(JSON.parse(xhr.response));
        });
        xhr.addEventListener("error", stopHelper);
        xhr.addEventListener("timeout", stopHelper);
    }

    if (data) {
        xhr.open("POST", `${url}?v=${Math.random()}`, true);
        xhr.send(JSON.stringify(data));
    }
    else {
        xhr.open("GET", `${url}?v=${Math.random()}`, true);
        xhr.send();
    }
}

function startHelper(): void {
    const actionKey = "modify_spine_textureatlas";
    actions[actionKey] = function (input: any) {
        const image = document.createElement("img");
        image.src = "data:image/png;base64," + input.data.texture;
        image.onload = function (): void {
            canvasA.width = image.width;
            canvasA.height = image.height;
            contextA.drawImage(image, 0, 0);

            for (const subTexture of input.data.config.SubTexture) {
                if (!subTexture.rotated) {
                    continue;
                }

                subTexture.x = subTexture.x || 0.0;
                subTexture.y = subTexture.y || 0.0;
                subTexture.width = subTexture.width || 0.0;
                subTexture.height = subTexture.height || 0.0;
                canvasB.width = subTexture.width;
                canvasB.height = subTexture.height;
                contextB.save();
                contextB.translate(subTexture.x + subTexture.width, subTexture.y + subTexture.height);
                contextB.rotate(Math.PI);
                contextB.drawImage(image, 0, 0);
                contextB.restore();

                const imageData = contextB.getImageData(0, 0, subTexture.width, subTexture.height);
                contextA.putImageData(imageData, subTexture.x, subTexture.y);
            }

            input.data.texture = canvasA.toDataURL("image/png").replace("data:image/png;base64,", "");
            load("../" + actionKey, input);
        };
    };

    internalID = setInterval(
        function () {
            load("../get_input", null, (result: any): void => {
                const input = result.data;

                if (input) {
                    const action = actions[input.type];

                    if (action) {
                        action(input);
                    }
                    else {
                        console.log("Unknown action:", input.type);
                    }
                }
                else {
                    console.log(result.code, result.message);
                }
            });
        },
        1000
    ) as any;
}

function stopHelper(): void {
    clearInterval(internalID);
    window.close();
}