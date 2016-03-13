//<reference path="babylon.math.ts" />

module SoftEngine {
    export class Camera {
        Position: BABYLON.Vector3;
        Target: BABYLON.Vector3;

        constructor() {
            this.Position = BABYLON.Vector3.Zero();
            this.Target = BABYLON.Vector3.Zero();
        }
    }

    export interface Face {
        A: number;
        B: number;
        C: number;
    }

    export class Mesh {
        Position: BABYLON.Vector3;
        Rotation: BABYLON.Vector3;
        Vertices: BABYLON.Vector3[];
        Faces: Face[];

        constructor(public name:string, verticesCount:number, facesCount:number) {
            this.Vertices = new Array(verticesCount);
            this.Rotation = BABYLON.Vector3.Zero();
            this.Position = BABYLON.Vector3.Zero();
            this.Faces = new Array(facesCount);
        }
    }

    export class Device {
        // the back buffer size is equal to the number of pixels to draw
        // on screen (width*height) * 4 (R,G,B & Alpha values).
        private backbuffer: ImageData;
        private workingCanvas: HTMLCanvasElement;
        private workingContext: CanvasRenderingContext2D;
        private workingWidth: number;
        private workingHeight: number;
        // equals to backbuffer.data
        private backbufferdata;

        constructor(canvas: HTMLCanvasElement) {
            this.workingCanvas = canvas;
            this.workingWidth = canvas.width;
            this.workingHeight = canvas.height;
            this.workingContext = this.workingCanvas.getContext('2d');
        }

        // Loading the JSON file in an asynchronous manner and
        // calling back with the function passed providing the array of meshes loaded
        public LoadJSONFileAsync(fileName: string, callback: (result: Mesh[]) => any): void {
            var jsonObject = {};
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", fileName, true);
            var that = this;
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    jsonObject = JSON.parse(xmlhttp.responseText);
                    callback(that.CreateMeshesFromJSON(jsonObject));
                }
            };
            xmlhttp.send(null);
        }

        private CreateMeshesFromJSON(jsonObject): Mesh[] {
            var meshes: Mesh[] = [];
            jsonObject.meshes.forEach(function(mesh) {
                var vertices = mesh.vertices;
                //faces
                var indices = mesh.indices;
                var uvCount = mesh.uvCount;
                var verticesStep = 1;

                // Depending of the number of texture's coordinates per vertex
                // we're jumping in the vertices array  by 6, 8 & 10 windows frame
                switch (uvCount) {
                    case 0:
                        verticesStep = 6;
                        break;
                    case 1:
                        verticesStep = 8;
                        break;
                    case 2:
                        verticesStep = 10;
                        break;
                }

                // the number of interesting vertices information for us
                var verticesCount = vertices.length / verticesStep;
                // number of faces is logically the size of the array divided by 3 (A, B, C)
                var facesCount = indices.length / 3;

                var smesh = new SoftEngine.Mesh(mesh.name, verticesCount, facesCount);

                // Filling the Vertices array of our mesh first
                for (var i = 0; i < verticesCount; i++) {
                    var x = vertices[i*verticesStep];
                    var y = vertices[i*verticesStep+1];
                    var z = vertices[i*verticesStep+2];
                    smesh.Vertices[i] = new BABYLON.Vector3(x,y,z);
                }

                // Then filling the Faces array
                for (var i = 0; i < facesCount; i++) {
                    var a = indices[i*3];
                    var b = indices[i*3+1];
                    var c = indices[i*3+2];
                    smesh.Faces[i] = {
                        A: a,
                        B: b,
                        C: c
                    };
                }

                // Getting the position you've set in Blender
                var position = mesh.position;
                smesh.Position = new BABYLON.Vector3(position[0], position[1], position[2]);
                meshes.push(smesh);

            }, this);

            return meshes;
        }

        // This function is called to clear the back buffer with a specific color
        public clear(): void {
            // Clearing with black color by default
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            // once cleared with black pixels, we're getting back the associated image data to
            // clear out back buffer
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        }

        // Once everything is ready, we can flush the back buffer
        // into the front buffer.
        public present(): void {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        }

        // Called to put a pixel on screen at a specific X,Y coordinates
        public putPixel(x:number, y:number, color:BABYLON.Color4): void {
            this.backbufferdata = this.backbuffer.data;
            // As we have a 1-D Array for our back buffer
            // we need to know the equivalent cell index in 1-D based
            // on the 2D coordinates of the screen
            var index: number = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;

            // RGBA color space is used by the HTML5 canvas
            this.backbufferdata[index] = color.r * 255;
            this.backbufferdata[index +1] = color.g * 255;
            this.backbufferdata[index +2] = color.b * 255;
            this.backbufferdata[index +3] = color.a * 255;
        }

        // Project takes some 3D coordinates and transform them
        // in 2D coordinates using the transformation matrix
        public project(coord: BABYLON.Vector3, transMat: BABYLON.Matrix): BABYLON.Vector3 {
            // transforming the coordinates
            var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
            // The transformed coordinates will be based on coordinate system
            // starting on the center of the screen. But drawing on screen normally starts
            // from top left. We then need to transform them again to have x:0, y:0 on top left.
            var x = point.x * this.workingWidth + this.workingWidth / 2.0;
            var y = -point.y * this.workingHeight + this.workingHeight / 2.0;
            return (new BABYLON.Vector3(x, y, point.z));
        }


        // drawPoint calls putPixel but does the clipping operation before
        public drawPoint(point: BABYLON.Vector2, color: BABYLON.Color4): void {
            // Clipping what's visible on screen
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
                // Drawing a yellow point
                this.putPixel(point.x, point.y, color);
            }
        }

        public drawLine(point0:BABYLON.Vector2, point1:BABYLON.Vector2): void {
            var dist = point1.subtract(point0).length();
            // If the distance between the 2 points is less than 2 pixels
            // We're exiting
            if (dist < 2)
                return;

            // Find the middle point between first & second point
            var middlePoint = point0.add(point1.subtract(point0).scale(0.5));
            this.drawPoint(middlePoint);
            //recursive
            this.drawLine(point0, middlePoint);
            this.drawLine(middlePoint, point1);
        }

        public drawBline(point0: BABYLON.Vector2, point1: BABYLON.Vector2): void {
            var x0 = point0.x >> 0;
            var y0 = point0.y >> 0;
            var x1 = point1.x >> 0;
            var y1 = point1.y >> 0;
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = (x0 < x1) ? 1 : -1;
            var sy = (y0 < y1) ? 1 : -1;
            var err = dx - dy;

            while (true) {
                this.drawPoint(new BABYLON.Vector2(x0, y0));

                if ((x0 == x1) && (y0 == y1))
                    break;
                var e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y0 += sy;
                }
            }
        }

        // The main method of the engine that re-compute each vertex projection
        // during each frame
        public render(camera: Camera, meshes: Mesh[]): void {
            // To understand this part, please read the prerequisites resources
            var viewMatrix = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target, BABYLON.Vector3.Up());
            var projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(0.78, this.workingWidth/this.workingHeight, 0.01, 0.1);

            meshes.forEach(function(cMesh) {
                // Beware to apply rotation before translation
                var worldMatrix = BABYLON.Matrix.RotationYawPitchRoll(cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z)
                .multiply(BABYLON.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));

                var transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);

                //facejen piirtäminen
                cMesh.Faces.forEach(function(face, i) {
                    //hae facen vertexit meshistä
                    var vertexA = cMesh.Vertices[face.A];
                    var vertexB = cMesh.Vertices[face.B];
                    var vertexC = cMesh.Vertices[face.C];
                    //projisoi pikselit 2d:ksi
                    var pixelA = this.project(vertexA, transformMatrix);
                    var pixelB = this.project(vertexB, transformMatrix);
                    var pixelC = this.project(vertexC, transformMatrix);
                    //piirrä viivat pikseleiden välille 2d tasolle
                    //this.drawBline(pixelA, pixelB);
                    //this.drawBline(pixelB, pixelC);
                    //this.drawBline(pixelC, pixelA);
                    var color: number = 0.25 + ((i % cMesh.Faces.length) / cMesh.Faces.length) * 0.75;
                    this.drawTriangle(pixelA, pixelB, pixelC, new BABYLON.Color4(color, color, color, 1));

                }, this);

            }, this);

        }


        // Clamping values to keep them between 0 and 1
        public clamp(value: number, min: number = 0, max: number = 1): number {
            return Math.max(min, Math.min(value, max));
        }

        // Interpolating the value between 2 vertices
        // min is the starting point, max the ending point
        // and gradient the % between the 2 points
        public interpolate(min: number, max: number, gradient: number) {
            return min + (max - min)*this.clamp(gradient);
        }

        // drawing line between 2 points from left to right
        // papb -> pcpd
        // pa, pb, pc, pd must then be sorted before
        public processScanLine(y: number, pa: BABYLON.Vector3, pb: BABYLON.Vector3,
                               pc: BABYLON.Vector3, pd: BABYLON.Vector3, color: BABYLON.Color4): void {

            var gradient1:number = pa.y != pb.y ? (y - pa.y)/(pb.y - pa.y) : 1;
            var gradient2:number = pc.y != pd.y ? (y - pc.y)/(pd.y - pc.y) : 1;
            var sx:number = this.interpolate(pa.x, pb.x, gradient1);
            var ex:number = this.interpolate(pc.x, pd.x, gradient2);

            //draw line
            for (var x:number = sx; x <= ex; x++) {
                this.drawPoint(new BABYLON.Vector2(x, y), color);
            }

        }

        public drawTriangle(p1: BABYLON.Vector3, p2: BABYLON.Vector3,
                            p3: BABYLON.Vector3, color: BABYLON.Color4): void {

            //sort vectors based on y
            if (p1.y > p2.y) {
                var temp = p2;
                p2 = p1;
                p1 = temp;
            }

            if (p2.y > p3.y) {
                var temp = p2;
                p2 = p3;
                p3 = temp;
            }

            if (p1.y > p2.y) {
                var temp = p2;
                p2 = p1;
                p1 = temp;
            }

            //calculate inverse slopes
            var dp1p2:number;
            var dp1p3:number;

            if (p2.y - p1.y > 0)
                dp1p2 = (p2.x-p1.x)/(p2.y-p1.y);
            else
                dp1p2 = 0;

            if (p3.y - p1.y > 0)
                dp1p3 = (p3.x-p1.x)/(p3.y-p1.y);
            else
                dp1p3 = 0;



            if (dp1p2 > dp1p3) {
                //p2 of triangle is on right side. Iterate from top to down
                for (var i:number = p1.y >> 0; i <= p3.y; i++) {

                    //top half
                    if (i < p2.y) {
                        this.processScanLine(i, p1, p3, p1, p2, color);
                    } else {
                        //bottom half
                        this.processScanLine(i, p1, p3, p2, p3, color);
                    }

                }
            } else {
                //p2 is on left side
                for (var i:number = p1.y >> 0; i <= p3.y; i++) {

                    //top half
                    if (i < p2.y) {
                        this.processScanLine(i, p1, p2, p1, p3, color);
                    } else {
                        //bottom half
                        this.processScanLine(i, p2, p3, p1, p3, color);
                    }

                }
            }
        }

    }
}