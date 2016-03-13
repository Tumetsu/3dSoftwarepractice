///<reference path="SoftEngine.ts"/>

var canvas: HTMLCanvasElement;
var device: SoftEngine.Device;
var meshes: SoftEngine.Mesh[] = [];
var mera: SoftEngine.Camera;


document.addEventListener("DOMContentLoaded", init, false);

function init() {
    canvas = <HTMLCanvasElement> document.getElementById("frontBuffer");
    mera = new SoftEngine.Camera();
    device = new SoftEngine.Device(canvas);
    mera.Position = new BABYLON.Vector3(0, 0, 10);
    mera.Target = new BABYLON.Vector3(0, 0, 0);

    device.LoadJSONFileAsync('models/monkey.babylon', function(meshesloaded: SoftEngine.Mesh[]) {
        meshes = meshesloaded;
        console.log(meshesloaded)
        // Calling the HTML5 rendering loop
        requestAnimationFrame(drawingLoop);
    });

}

function drawingLoop() {
    device.clear();

    //rotate meshes
    for (var i = 0; i < meshes.length; i++) {
        // rotating slightly the mesh during each frame rendered
        meshes[i].Rotation.x += 0.01;
        meshes[i].Rotation.y += 0.01;
    }

    // Doing the various matrix operations
    device.render(mera, meshes);
    // Flushing the back buffer into the front buffer
    device.present();

    // Calling the HTML5 rendering loop recursively
    requestAnimationFrame(drawingLoop);
}