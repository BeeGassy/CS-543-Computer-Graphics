var canvas;
var gl;
var program;

var numTimesToSubdivide = 6;
var subdivindex = 0;

var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333, 1);

var lightPosition = vec4(0.0, 0.0, 15.0, 0.0);
//var lightPosition = vec4(15.0, 20.0, 22.0, 0.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 1.0, 1.0, 1.0);
var materialDiffuse = vec4(0.5, 0.5, 0.5, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 25.0;

var diffuseProduct;
var specularProduct;
var ambientProduct;

var objectArr = [];

var tetrahedronPointsArr = [];
var tetrahedronVertNormPointsArr = [];
var sphereSurfaceNormal = [];

var cubePointsArr = [];
var cubeVertNormPointsArr = [];
var cubeSurfaceNormal = [];

var cubeBuffer;
var sphereBuffer;
var lineBuffer;
var planeBuffer;

var jvPosition;
var jvNormal;

var tbuffer;
var vTextCoord;

var projectionMatrix;

var modelMatrixLoc;
var modelMatrix;

var projectionMatrixLoc;

var viewMatrixLoc;
var viewMatrix;

//for objectHierarchy()
var translateZeroMatrix;
var modelFirstMatrix;
var modelSecMatrix;

var translateFirstAMatrix;
var translateFirstBMatrix;

var translateSecAMatrix;
var translateSecBMatrix;

var rotateZeroMatrix;

var rotateFirstAMatrix;
var rotateFirstBMatrix;

var rotateSecAMatrix;
var rotateSecBMatrix;

var theta = 0;
// end of vars for objectHierarchy() //

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var colorArr = [];

var stack = [];

//Flag to determine if its flat shading or Gouraud lighting
var flatOrGouraud = false;

var splotLightAngle = 15;

var minT = 0.0;
var maxT = 4.0;

var texCoord = [
    vec2(maxT, minT),
    vec2(minT, minT),
    vec2(minT, maxT),
    vec2(maxT, maxT)
];


var planeCoordsArray = [];
var planeNormCoordsArray = [];

var texCoordsArray = [];

var cubeMap;

var imageArray;

var dumbyText = null;
var grassText = null;
var stoneText = null;

var shadowMatrix;

var m;

var cImage;

var isDefault = false;
var isShadow = false;
var isRefrac = false;

/**
 * init() behaves as the main method and calls all the methods that make the program possible.
 *
 * This is where the canvas is initialized, the button events are handles and where some memory
 * allocation is performed
 *
 *
 * @method init()
 * @param {void} Nothing
 * @return {void} Returns nothing
 */
window.onload = function init() {
    //console.log("Entering Init");

    objectArr = [];

    tetrahedronPointsArr = [];
    tetrahedronVertNormPointsArr = [];
    sphereSurfaceNormal = [];

    cubePointsArr = [];
    cubeVertNormPointsArr = [];
    cubeSurfaceNormal = [];

    stack = [];

    imageArray = [];

    canvas = document.getElementById("webgl");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    window.onkeydown = function (evt) {
        let key = evt.key;
        switch (key) {
            case('p'):
                //Increase spotlight cut off angle (increase cone angle
                splotLightAngle = Math.max(splotLightAngle - .5, 10);
                break;

            case ('i'):
                //Decrease spotlight cut off angle (decrease cone angle)
                splotLightAngle = Math.min(splotLightAngle + .5, 60);
                break;

            case ('m'):
                //The scene is shaded using Gouraud lighting (smooth shading)
                flatOrGouraud = !flatOrGouraud;

                break;

            case ('n'):
                //The scene is shaded using flat shading
                flatOrGouraud = !flatOrGouraud;

                break;

            case ('a'):
                //toggles shadows on and off
                isShadow = !isShadow;
                break;

            case ('b'):
                //toggle between default and non-default textures
                isDefault = !isDefault;
                break;

            case ('d'):
                //toggling of refraction and smooth lighting
                isRefrac = !isRefrac;
                break;

            default:

        }
        gl.uniform1f(gl.getUniformLocation(program, "spotlightSize"), Math.cos((splotLightAngle * Math.PI) / 180));
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LESS);
    gl.cullFace(gl.BACK);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    initATexture(0);
    initATexture(1);
    createCubeMap();
    initACubeTexture(0);
    initACubeTexture(1);
    initACubeTexture(2);
    initACubeTexture(3);
    initACubeTexture(4);
    initACubeTexture(5);



    gl.uniform1i(gl.getUniformLocation(program, "envOrCube"), 1);

    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    populateCube();
    mergeArrays();
    initColor();

    modelMatrixLoc = gl.getUniformLocation(program, "modelMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projMatrix");
    viewMatrixLoc = gl.getUniformLocation(program, "viewMatrix");

    calculateSurfaceNormal(0);
    calculateSurfaceNormal(1);

    render();
}

/**
 * changeColor() changes both the physical color of the object and the color of the light being applied
 * to each object
 *
 * @method changeColor()
 * @param {Integer} colorIndex
 * @return {void} Returns nothing
 */
function changeColor(colorIndex) {
    //console.log("Entering changeColor");

    createLighting(colorIndex);

    var colorLoc = gl.getUniformLocation(program, "vColor");
    gl.uniform4fv(colorLoc, colorArr[colorIndex]);

}

/**
 * calculateSurfaceNormal() is the method where the surface normal of each face is calculated and
 * then pushed to a array where the surface normals can be more easily accessible
 *
 * These surface normals are built off the understanding from the newell method
 *
 * @method calculateSurfaceNormal()
 * @param {Integer} indexCount
 * @return {void} Returns nothing
 */
function calculateSurfaceNormal(indexCount) {
    //console.log("Entering CalculateSurfaceNormal");

    var sphereArr = objectArr[0];

    var cubeArr = objectArr[1];

    //Using the newell method
    var VertexNormal = [0.0, 0.0, 0.0];

    for (var i = 0; i < objectArr[indexCount].length; i += 3) {
        VertexNormal = [0.0, 0.0, 0.0];

        var tempArr = [];

        if (indexCount === 0) {
            tempArr = sphereArr;
        } else {
            tempArr = cubeArr;
        }

        for (var j = i; j < (i + 3); j++) {
            var next = ((j + 1) % 3);
            if (j == (i + 2)) {
                next = i;
            } else {
                next = j + 1;
            }
            var currentVert;
            currentVert = tempArr[j];

            var nextVert;
            nextVert = tempArr[next];

            //finds the normal to the x axis
            VertexNormal[0] += ((currentVert[1] - nextVert[1]) * (currentVert[2] + nextVert[2]));

            //finds the normal to the y axis
            VertexNormal[1] += ((currentVert[2] - nextVert[2]) * (currentVert[0] + nextVert[0]));

            //finds the normal to the z axis
            VertexNormal[2] += ((currentVert[0] - nextVert[0]) * (currentVert[1] + nextVert[1]));

        }

        VertexNormal = normalize(VertexNormal);
        var tinkiewinkie;
        tinkiewinkie = vec4(VertexNormal[0], VertexNormal[1], VertexNormal[2], 0.0);

        if (indexCount === 0) {
            sphereSurfaceNormal.push(tinkiewinkie);
            sphereSurfaceNormal.push(tinkiewinkie);
            sphereSurfaceNormal.push(tinkiewinkie);

        } else if (indexCount === 1) {
            cubeSurfaceNormal.push(tinkiewinkie);
            cubeSurfaceNormal.push(tinkiewinkie);
            cubeSurfaceNormal.push(tinkiewinkie);
        } else {
            console.log("trouble pushing normals to respective globals");
        }

    }


    VertexNormal = [0.0, 0.0, 0.0];
}

var planeVertices = [
    vec4(-25.0, -25.0, 25.0, 1.0),
    vec4(-25.0, 25.0, 25.0, 1.0),
    vec4(25.0, 25.0, 25.0, 1.0),
    vec4(25.0, -25.0, 25.0, 1.0)

    // vec4(-1.0, -1.0, 1.0, 1.0),
    // vec4(-1.0, 1.0, 1.0, 1.0),
    // vec4(1.0, 1.0, 1.0, 1.0),
    // vec4(1.0, -1.0, 1.0, 1.0)
];

var normPlaneVertices = [
    vec4(-25.0, -25.0, 25.0, 0.0),
    vec4(-25.0, 25.0, 25.0, 0.0),
    vec4(25.0, 25.0, 25.0, 0.0),
    vec4(25.0, -25.0, 25.0, 0.0)
];

var vertices = [
    vec4(-0.75, -0.75, 0.75, 1.0),
    vec4(-0.75, 0.75, 0.75, 1.0),
    vec4(0.75, 0.75, 0.75, 1.0),
    vec4(0.75, -0.75, 0.75, 1.0),
    vec4(-0.75, -0.75, -0.75, 1.0),
    vec4(-0.75, 0.75, -0.75, 1.0),
    vec4(0.75, 0.75, -0.75, 1.0),
    vec4(0.75, -0.75, -0.75, 1.0)
];

var normVertices = [
    vec4(-0.75, -0.75, 0.75, 0.0),
    vec4(-0.75, 0.75, 0.75, 0.0),
    vec4(0.75, 0.75, 0.75, 0.0),
    vec4(0.75, -0.75, 0.75, 0.0),
    vec4(-0.75, -0.75, -0.75, 0.0),
    vec4(-0.75, 0.75, -0.75, 0.0),
    vec4(0.75, 0.75, -0.75, 0.0),
    vec4(0.75, -0.75, -0.75, 0.0)

];

/**
 * quad() is the method where the vertices of a cube are stored into, additionally
 * the vertex normal vertices aswell
 *
 * @method quad()
 * @param {Float} a
 * @param {Float} b
 * @param {Float} c
 * @param {Float} d
 * @return {void} Returns nothing
 */
function quad(a, b, c, d) {
    //console.log("Entering quad");

    //triangle 1
    cubePointsArr.push(vertices[a]);
    cubeVertNormPointsArr.push(normalize(normVertices[a]));

    cubePointsArr.push(vertices[b]);
    cubeVertNormPointsArr.push(normalize(normVertices[b]));

    cubePointsArr.push(vertices[c]);
    cubeVertNormPointsArr.push(normalize(normVertices[c]));

    //triangle 2
    cubePointsArr.push(vertices[a]);
    cubeVertNormPointsArr.push(normalize(normVertices[a]));

    cubePointsArr.push(vertices[c]);
    cubeVertNormPointsArr.push(normalize(normVertices[c]));

    cubePointsArr.push(vertices[d]);
    cubeVertNormPointsArr.push(normalize(normVertices[d]));
}

/**
 * plane() behaves in an identical way to quad but for 1/6 the faces
 *
 *
 * @method plane()
 * @param {Float} a
 * @param {Float} b
 * @param {Float} c
 * @param {Float} d
 * @return {void} Returns nothing
 */
function plane(a, b, c, d) {
    //triangle 1
    planeCoordsArray.push(planeVertices[a]);
    planeNormCoordsArray.push(normalize(normPlaneVertices[a]));

    planeCoordsArray.push(planeVertices[b]);
    planeNormCoordsArray.push(normalize(normPlaneVertices[b]));

    planeCoordsArray.push(planeVertices[c]);
    planeNormCoordsArray.push(normalize(normPlaneVertices[c]));

    //triangle 2
    planeCoordsArray.push(planeVertices[a]);
    planeNormCoordsArray.push(normalize(normPlaneVertices[a]));

    planeCoordsArray.push(planeVertices[c]);
    planeNormCoordsArray.push(normalize(normPlaneVertices[c]));

    planeCoordsArray.push(planeVertices[d]);
    planeNormCoordsArray.push(normalize(normPlaneVertices[d]));
}

/**
 * setupTexture() pushes the textcoordinates applicable to setting the min/max coordinates for a texture to a more
 * accessible array
 *
 *
 * @method plane()
 * @param {Float} a
 * @param {Float} b
 * @param {Float} c
 * @param {Float} d
 * @return {void} Returns nothing
 */
function setupTexture(a, b, c, d){

    texCoordsArray.push(texCoord[c]);

    texCoordsArray.push(texCoord[b]);

    texCoordsArray.push(texCoord[a]);

    //triangle 2
    texCoordsArray.push(texCoord[c]);

    texCoordsArray.push(texCoord[a]);

    texCoordsArray.push(texCoord[d]);

    tbuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, tbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STREAM_DRAW);
}

/**
 * populateCube() is determing which vertex from the vertices array to pull from thus building the cube
 *
 * @method populateCube()
 * @param {Void} nothing
 * @return {void} Returns nothing
 */
function populateCube() {
    //console.log("Entering populateCube");

    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);

    plane(1, 0, 3, 2);
    setupTexture(0, 1, 2, 3);

}

/**
 * createTriangle() pushes the applicable vertices of the subdivided tetrahedron and applies
 * them to an array. This is also true for the vertex normals for the tetrahedron
 *
 * @method createTriangle()
 * @param {float} a
 * @param {float} b
 * @param {float} c
 * @return {void} Returns nothing
 */
function createTriangle(a, b, c) {
    tetrahedronPointsArr.push(c);
    tetrahedronPointsArr.push(b);
    tetrahedronPointsArr.push(a);

    // normals are vectors

    tetrahedronVertNormPointsArr.push(vec4(c[0], c[1], c[2], 0.0));
    tetrahedronVertNormPointsArr.push(vec4(b[0], b[1], b[2], 0.0));
    tetrahedronVertNormPointsArr.push(vec4(a[0], a[1], a[2], 0.0));

    subdivindex += 3;

}

/**
 * divideTriangle() is the method that subdivides the tetrahedron into many smaller triangles until
 * it becomes the sphere that will be worked with later
 *
 * @method createTriangle()
 * @param {float} a
 * @param {float} b
 * @param {float} c
 * @param {Int} triangleCount
 * @return {void} Returns nothing
 */
function divideTriangle(a, b, c, triangleCount) {
    if (triangleCount > 0) {

        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var bc = mix(b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle(a, ab, ac, triangleCount - 1);
        divideTriangle(ab, b, bc, triangleCount - 1);
        divideTriangle(bc, c, ac, triangleCount - 1);
        divideTriangle(ab, bc, ac, triangleCount - 1);
    } else {
        createTriangle(a, b, c);
    }
}

/**
 * tetrahedron() behaves much like the populate cube method
 *
 * @method createTriangle()
 * @param {float} a
 * @param {float} b
 * @param {float} c
 * @param {float} d
 * @param {Int} n
 * @return {void} Returns nothing
 */
function tetrahedron(a, b, c, d, n) {
    //console.log("Entering tetrahedron");

    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

/**
 * initColor() initializes the 7 colors of the 7 objects that will be colored
 *
 * @method initColor()
 * @param {Void} nothing
 * @return {void} Returns nothing
 */
function initColor() {
    //console.log("Entering initColor");

    //red
    colorArr.push([1.0, 0.0, 0.0, 1.0]);

    //green
    colorArr.push([0.0, 1.0, 0.0, 1.0]);

    //blue
    colorArr.push([0.0, 0.0, 1.0, 1.0]);

    //red
    colorArr.push([1.0, 1.0, 0.0, 1.0]);

    //green
    colorArr.push([0.0, 1.0, 1.0, 1.0]);

    //blue
    colorArr.push([1.0, 0.0, 1.0, 1.0]);

    //white
    colorArr.push([1.0, 1.0, 1.0, 1.0]);

}

/**
 * mergeArrays() is a method that stores all the important arrays we have into one main array that can be
 * accessed later
 *
 * @method initColor()
 * @param {Void} nothing
 * @return {void} Returns nothing
 */
function mergeArrays() {
    // console.log("Entering mergeArrays");

    //place in the array that holds the vertices for the tetrahedron
    objectArr.push(tetrahedronPointsArr);

    //place in the array that holds the vertices for the cube
    objectArr.push(cubePointsArr);

    //place in the array that holds the vertices for the plane
    objectArr.push(planeCoordsArray);

    //FOR THE NORMALS
    //place in the array that holds the normalized vertices for the tetrahedron
    objectArr.push(tetrahedronVertNormPointsArr);

    //place in the array that holds the normalized vertices for the cube
    objectArr.push(cubeVertNormPointsArr);

    //place in the array that holds the normalized vertices for the plane
    objectArr.push(planeNormCoordsArray);

}

/**
 * drawObject() is a method that will create one of 3 different objects, it also allocates and stores all
 * necessary memory for which ever object is created
 *
 * @method initColor()
 * @param {Int} indexCount
 * @return {void} Returns nothing
 */
function drawObject(indexCount) {
    // console.log("Entering drawObject");

    cubeBuffer = gl.createBuffer();
    sphereBuffer = gl.createBuffer();
    lineBuffer = gl.createBuffer();
    planeBuffer = gl.createBuffer();

    jvPosition = gl.getAttribLocation(program, "vPosition");


    jvNormal = gl.getAttribLocation(program, "vNormal");


    vTextCoord = gl.getAttribLocation(program, "vTexCoord");


    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
    gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));



    if (indexCount === 0) {
        drawSphere(indexCount);
        applyShadow(indexCount);
    } else if (indexCount === 1) {
        drawCube(indexCount);
        applyShadow(indexCount);
    } else {
        drawPlane();
    }
}

/**
 * drawCube() is a method that will create a cube that is either smooth or flat shaded.
 * The cube is then drawn.
 *
 * @method drawCube()
 * @param {Int} indexCount
 * @return {void} Returns nothing
 */
function drawCube(indexCount) {
    // console.log("Entering drawCube()");

    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "envOrCube"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    var cubeArr;
    cubeArr = objectArr[indexCount];
    var cubeVertNormArr = objectArr[4];

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeArr), gl.STREAM_DRAW);
    gl.vertexAttribPointer(jvPosition, 4, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(jvPosition);

    var cubeNormBuffer = gl.createBuffer();

    if (flatOrGouraud) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeVertNormArr), gl.STATIC_DRAW);
    } else if (!flatOrGouraud) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeSurfaceNormal), gl.STATIC_DRAW);
    } else {
        console.log("Error with cube buffer for surface/vert normal");
    }


    gl.vertexAttribPointer(jvNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(jvNormal);

    gl.drawArrays(gl.TRIANGLES, 0, cubeArr.length);

}

/**
 * drawSphere() is a method that will create a sphere that is either smooth or flat shaded.
 * The sphere is then drawn.
 *
 * @method drawCube()
 * @param {Int} indexCount
 * @return {void} Returns nothing
 */
function drawSphere(indexCount) {
    // console.log("Entering drawSphere()");

    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "envOrCube"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    var sphereArr;
    sphereArr = objectArr[indexCount];
    var sphereNormArr = objectArr[3];

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereArr), gl.STREAM_DRAW);
    gl.vertexAttribPointer(jvPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(jvPosition);

    var sphereNormBuffer = gl.createBuffer();

    if (flatOrGouraud) {
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereNormArr), gl.STATIC_DRAW);
    } else if (!flatOrGouraud) {
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereSurfaceNormal), gl.STATIC_DRAW);
    } else {
        console.log("Error with sphere buffer for surface/vert normal");
    }

    gl.vertexAttribPointer(jvNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(jvNormal);

    gl.drawArrays(gl.TRIANGLES, 0, sphereArr.length);

}

/**
 * drawConnectingLines() is a method that will create a line that is neither smooth or flat shaded.
 * The line is then drawn.
 *
 * @method drawCube()
 * @param {Float} x1
 * @param {Float} y1
 * @param {Float} z1
 * @param {Float} x2
 * @param {Float} y2
 * @param {Float} z2
 * @return {void} Returns nothing
 */
function drawConnectingLines(x1, y1, z1, x2, y2, z2) {
    // console.log("going to drawConnectingLines()");

    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));

    var lineArr = [];

    lineArr.push(vec4(x1, y1, z1, 1.0));
    lineArr.push(vec4(x2, y2, z2, 1.0));

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(lineArr), gl.STREAM_DRAW);
    gl.vertexAttribPointer(jvPosition, 4, gl.FLOAT, false, 0, 0);

    var jvColor = gl.getUniformLocation(program, "vColor");
    gl.uniform4fv(jvColor, vec4(1.0, 1.0, 1.0, 1.0));

    gl.enableVertexAttribArray(jvPosition);

    var lineLoc = gl.getUniformLocation(program, "isLine");
    gl.uniform1i(lineLoc, 1);

    gl.drawArrays(gl.LINES, 0, lineArr.length);
    gl.uniform1i(lineLoc, 0);

    gl.disableVertexAttribArray(jvPosition);
}

/**
 * drawPlane() draws the applicable plane for textures to be mapped to
 *
 *
 * @method drawPlane()
 * @param {Void}
 * @return {void} Returns nothing
 */
function drawPlane() {
    // console.log("Entering drawPlane()");

    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), 1);

    var planeArr;
    planeArr = objectArr[2];
    var planeVertNormArr = objectArr[5];

    gl.bindBuffer(gl.ARRAY_BUFFER, planeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(planeArr), gl.STREAM_DRAW);
    gl.vertexAttribPointer(jvPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(jvPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, tbuffer);
    gl.vertexAttribPointer(vTextCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTextCoord);

    gl.drawArrays(gl.TRIANGLES, 0, planeArr.length);

    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), 0);

    gl.disableVertexAttribArray(jvPosition);
    gl.disableVertexAttribArray(vTextCoord);
}

/**
 * movePlane() moves the three planes to create a stage setting
 *
 *
 * @method drawPlane()
 * @param {Void}
 * @return {void} Returns nothing
 */
function movePlane(){
    modelMatrix = mat4(1);

    var translateWallBack;
    var translateWallLeft;
    var translateWallRight;

    var rotateRightWall;
    var rotateLeftWall;

    var tempModelMatrix = mat4(1);

    var wallTheta = 45;
    var negWallTheta = -45;

    var Xrotate;
    var Yrotate;


    stack.push(modelMatrix);
        translateWallBack = translate(0, -40, 0);
        modelMatrix = translateWallBack;

        stack.push(modelMatrix);
            Xrotate = rotateX(-90);
            Yrotate = rotateY(negWallTheta);

            tempModelMatrix = mult(Yrotate, Xrotate);
            modelMatrix = mult(modelMatrix, tempModelMatrix);
            pickTexture(false, false);
            drawObject(2);

        modelMatrix = stack.pop();
    modelMatrix = stack.pop();

    //translate wall back 10 units
    stack.push(modelMatrix);
        translateWallBack = translate(0, 10, -40);
        modelMatrix = translateWallBack;

        // rotate left wall 45 degrees
        stack.push(modelMatrix)
            translateWallRight  = translate(30, 0, 0);
            rotateRightWall = rotateY(negWallTheta);
            tempModelMatrix = mult(translateWallRight, rotateRightWall);
            modelMatrix = mult(modelMatrix, tempModelMatrix);
            pickTexture(true, false);
            drawObject(2);

        modelMatrix = stack.pop();

        // rotate left wall negative 45 degrees
        stack.push(modelMatrix);
            translateWallLeft = translate(-30, 0, 0);
            rotateLeftWall = rotateY(wallTheta);
            tempModelMatrix = mult(translateWallLeft, rotateLeftWall);
            modelMatrix = mult(modelMatrix, tempModelMatrix);
            pickTexture(true, false);
            drawObject(2);

        modelMatrix = stack.pop();
    modelMatrix = stack.pop();


}

/**
 * createLighting() is a method that passes all the lighting to the vertex shader
 *
 * @method createLighting()
 * @param {Float} IndexCount
 * @return {void} Returns nothing
 */
function createLighting(IndexCount) {

    materialAmbient = colorArr[IndexCount];
    materialDiffuse = colorArr[IndexCount];

    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
    ambientProduct = mult(lightAmbient, materialAmbient);


    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

}

/**
 * pickTexture() is a method that binds the correct texture based off it being a wall or a floor plane texture
 *
 * @method createLighting()
 * @param {Bool} isWall
 * @param {Bool} isCube
 * @return {void} Returns nothing
 */
function pickTexture(isWall, isCube) {
    if (!isCube){
        gl.uniform1i(gl.getUniformLocation(program, "envOrCube"), 1);
    } else {

        if (cImage != null){
            gl.bindTexture(gl.TEXTURE_2D, cImage);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, dumbyText);
        }

        gl.uniform1i(gl.getUniformLocation(program, "envOrCube"), 0);
    }

    gl.activeTexture(gl.TEXTURE0);

    if (isWall){

        //setting isWall to true
        //setting isFloor to false
        gl.uniform1i(gl.getUniformLocation(program, "isWall"), 1);
        gl.uniform1i(gl.getUniformLocation(program, "isFloor"), 0);

        if (isDefault){
            defaultTexture(true);
        } else {
            if (stoneText != null){
                gl.bindTexture(gl.TEXTURE_2D, stoneText);
            } else {
                gl.bindTexture(gl.TEXTURE_2D, dumbyText);
            }
            gl.uniform1i(gl.getUniformLocation(program, "stone_texture"), 0);
        }

    } else {

        //setting isWall to false
        //setting isFloor to true
        gl.uniform1i(gl.getUniformLocation(program, "isWall"), 0);
        gl.uniform1i(gl.getUniformLocation(program, "isFloor"), 1);

        if (isDefault){
            defaultTexture(false);
        } else {
            if (grassText != null) {
                gl.bindTexture(gl.TEXTURE_2D, grassText);
            } else {
                gl.bindTexture(gl.TEXTURE_2D, dumbyText);
            }
        }
        gl.uniform1i(gl.getUniformLocation(program, "grass_texture"), 1);
    }
}

/**
 * configTexture() is a method that configures the loaded textures so they can be mapped to an object
 *
 * @method createLighting()
 * @param {Event} image
 * @param {Int} EnvCount
 * @return {void} Returns nothing
 */
function configTexture(image, EnvCount) {
    var textNum;

    if (EnvCount === 0 ){
        stoneText = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, stoneText);
    } else if (EnvCount === 1){
        //for grass
        grassText = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, grassText);
    } else {
        console.log("Error converting textNum");
    }

    //Create a 2x2 texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

}

/**
 * defaultTexture() is a method that configures the default textures so they can be mapped to an object
 *
 * @method defaultTexture()
 * @param {Bool} isWall
 * @return {void} Returns nothing
 */
function defaultTexture(isWall) {
    //Initialize
    dumbyText = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dumbyText);

    //Create a 2x2 texture
    if (isWall){
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255]));
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255]));
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

/**
 * initATexture() is a method that loads textures to be configured
 *
 * @method initATexture()
 * @param {Int} EnvCount
 * @return {void} Returns nothing
 */
function initATexture(EnvCount) {

    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), 1);

    switch (EnvCount) {
        case 0:
            //for stone
            var image = new Image();
            image.crossOrigin = ""
            image.src = "http://web.cs.wpi.edu/~jmcuneo/stones.bmp"

            break;

        case 1:
            //for grass
            var image = new Image();
            image.crossOrigin = ""
            image.src = "http://web.cs.wpi.edu/~jmcuneo/grass.bmp"
            break;
    }

    image.onload = function () {
        configTexture(image, EnvCount);
    }



    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), 0);
}

/**
 * initACubeTexture() is a method that loads cube environment textures to be configured
 *
 * @method initACubeTexture()
 * @param {Int} EnvCount
 * @return {void} Returns nothing
 */
function initACubeTexture(EnvCount) {

    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "envOrCube"), 0);

    switch (EnvCount) {
        case 0:
            //Negative X
            cImage = new Image();
            cImage.crossOrigin = ""
            cImage.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegx.bmp"
            break;

        case 1:
            //Negative Y
            cImage = new Image();
            cImage.crossOrigin = ""
            cImage.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegy.bmp"
            break;

        case 2:
            //Negative Z
            cImage = new Image();
            cImage.crossOrigin = ""
            cImage.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegz.bmp"
            break;

        case 3:
            //Positive X
            cImage = new Image();
            cImage.crossOrigin = ""
            cImage.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposx.bmp"
            break;

        case 4:
            //Positive Y
            cImage = new Image();
            cImage.crossOrigin = ""
            cImage.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposy.bmp"
            break;

        case 5:
            //Positive Z
            cImage = new Image();
            cImage.crossOrigin = ""
            cImage.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposz.bmp"
            break;
    }

    cImage.onload = function () {
        configureCubeMapImage(cImage, EnvCount);
    }
}

/**
 * createCubeMap() is a method creates the texture for the cube map environment
 *
 * @method createCubeMap()
 * @param {Void} Nothing
 * @return {void} Returns nothing
 */
function createCubeMap(){
    //Initialize
    cubeMap = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);
}

/**
 * configureCubeMapImage() is a method that applies the cube map images to the texture
 *
 * @method createCubeMap()
 * @param {Event} image
 * @param {Int} EnvCount
 * @return {void} Returns nothing
 */
function configureCubeMapImage(image, EnvCount) {

    console.log(image.src);

    //Create a 2x2 texture
    switch (EnvCount) {
        case 0:
            //Negative X
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            break;

        case 1:
            //Negative Y
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            break;

        case 2:
            //Negative Z
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            break;

        case 3:
            //Positive X
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            break;

        case 4:
            //Positive Y
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            break;

        case 5:
            //Positive Z
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            break;
        default:
            console.log("ERROR ERROR");
    }

    gl.uniform1i(gl.getUniformLocation(program, "envOrCube"), 0);
}


/**
 * applyShadow() is a method that applies shadows using various translation matrix multiplications
 *
 * @method applyShadow()
 * @param {Int} indexCount
 * @return {void} Returns nothing
 */
function applyShadow(indexCount) {
    stack.push(modelMatrix);
        // console.log("Entering applyShadow()");

        var sphereArr = objectArr[indexCount];
        var cubeArr = objectArr[indexCount];

        shadowMatrix = mat4(1);
        m = mat4(1);

        m[3][3] = 0;

        m[3][2] = -1/lightPosition[2];

        shadowMatrix = mult(shadowMatrix, translate(lightPosition[0], lightPosition[1], lightPosition[2]));
        shadowMatrix = mult(shadowMatrix, m);
        shadowMatrix = mult(shadowMatrix, translate(-lightPosition[0], -lightPosition[1], -lightPosition[2]));
        shadowMatrix = mult(shadowMatrix, modelMatrix);

        var amtToTrans = translate(0, 0, -25.2);

        shadowMatrix = mult(amtToTrans, shadowMatrix);

        gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(shadowMatrix));

        gl.uniform1i(gl.getUniformLocation(program, "isShadow"), 1);

        if (isShadow) {
            if (indexCount === 0) {
                gl.drawArrays(gl.TRIANGLES, 0, sphereArr.length);
            } else if (indexCount === 1) {
                gl.drawArrays(gl.TRIANGLES, 0, cubeArr.length);
            }
        }

        gl.uniform1i(gl.getUniformLocation(program, "isShadow"), 0);
        modelMatrix = stack.pop();
}


/**
 * objectHierarchy() is a method that creates the heirarchy behind the mobile, parents pass down traits
 * like the rotation and translation. This is also where the creation of cubes, spheres and lines are had
 *
 * @method objectHierarchy()
 * @param {Void} nothing
 * @return {void} Returns nothing
 */
function objectHierarchy() {
    // console.log("Entering objectHierarchy()");

    translateZeroMatrix = mat4(1);

    translateFirstAMatrix = mat4(1);
    translateFirstBMatrix = mat4(1);

    translateSecAMatrix = mat4(1);
    translateSecBMatrix = mat4(1);

    rotateZeroMatrix = mat4(1);

    rotateFirstAMatrix = mat4(1);
    rotateFirstBMatrix = mat4(1);

    rotateSecAMatrix = mat4(1);
    rotateSecBMatrix = mat4(1);

    theta += 1;

    movePlane();

    //object "z" of level 0
    stack.push(modelMatrix);
        translateZeroMatrix = translate(0, 5, 0);
        rotateZeroMatrix = rotateY(theta);

        modelMatrix = mult(translateZeroMatrix, rotateZeroMatrix);

        //draw circle
        changeColor(0);
        drawObject(0);

        //base stem
        drawConnectingLines(0, -3, 0, 0, 0, 0);

        //arms going out to level 1
        drawConnectingLines(0, -3, 0, -5, -3, 0);
        drawConnectingLines(0, -3, 0, 5, -3, 0);

        //connecting arms to objects on level 1
        drawConnectingLines(-5, -3, 0, -5, -5, 0);
        drawConnectingLines(5, -3, 0, 5, -5, 0);

        // THE BEGINNING OF LEVEL 1 part a //
        //object "a" of level 1
        stack.push(modelMatrix);
            translateFirstAMatrix = translate(-5, -5, 0);
            rotateFirstAMatrix = rotateY((-2 * theta));

            modelFirstMatrix = mult(translateFirstAMatrix, rotateFirstAMatrix);

            //apply all changes from first A to overall first model matrix
            modelMatrix = mult(modelMatrix, modelFirstMatrix);

            //draw circle
            changeColor(1);
            drawObject(0);

            //base stem
            drawConnectingLines(0, -3, 0, 0, 0, 0);

            //arms going out to level 2
            drawConnectingLines(0, -3, 0, -3, -3, 0);
            drawConnectingLines(0, -3, 0, 3, -3, 0);

            //connecting arms to objects on level 2
            drawConnectingLines(-3, -3, 0, -3, -5, 0);
            drawConnectingLines(3, -3, 0, 3, -5, 0);


            // THE BEGINNING OF LEVEL 2 part a //
            //object "a.1" of level 2
            stack.push(modelMatrix);
                translateSecAMatrix = translate(-3, -5, 0);
                rotateSecAMatrix = rotateY(theta);

                modelSecMatrix = mult(translateSecAMatrix, rotateSecAMatrix);

                //apply all changes from first A to overall first model matrix
                modelMatrix = mult(modelMatrix, modelSecMatrix);

                //draw circle
                changeColor(3);
                drawObject(0);

                modelMatrix = stack.pop();

            //object "a.2" of level 2
            stack.push(modelMatrix);
                translateSecBMatrix = translate(3, -5, 0);
                rotateSecBMatrix = rotateY(theta);

                modelSecMatrix = mult(translateSecBMatrix, rotateSecBMatrix);

                //apply all changes from first A to overall first model matrix
                modelMatrix = mult(modelMatrix, modelSecMatrix);

                //draw circle
                changeColor(4);
                drawObject(0);

                modelMatrix = stack.pop();

        modelMatrix = stack.pop();

        // THE BEGINNING OF LEVEL 1 part b //
        //object "b" of level 1
        stack.push(modelMatrix);
            translateFirstAMatrix = translate(5, -5, 0);
            rotateFirstAMatrix = rotateY((-2 * theta));

            modelFirstMatrix = mult(translateFirstAMatrix, rotateFirstAMatrix);

            //apply all changes from first A to overall first model matrix
            modelMatrix = mult(modelMatrix, modelFirstMatrix);

            //draw cube
            changeColor(2);
            drawObject(1);

            //base stem
            drawConnectingLines(0, -3, 0, 0, 0, 0);

            //arms going out to level 1
            drawConnectingLines(0, -3, 0, -3, -3, 0);
            drawConnectingLines(0, -3, 0, 3, -3, 0);

            //connecting arms to objects on level 1
            drawConnectingLines(-3, -3, 0, -3, -5, 0);
            drawConnectingLines(3, -3, 0, 3, -5, 0);



            // THE BEGINNING OF LEVEL 2 part b //
            // object b.1 of level 2
            stack.push(modelMatrix);
                translateSecAMatrix = translate(-3, -5, 0);
                rotateSecAMatrix = rotateY((3 * theta));

                modelSecMatrix = mult(translateSecAMatrix, rotateSecAMatrix);

                //apply all changes from first A to overall first model matrix
                modelMatrix = mult(modelMatrix, modelSecMatrix);

                //draw cube
                changeColor(5);
                drawObject(1);

                modelMatrix = stack.pop();

            //object b.2 of level 2
            stack.push(modelMatrix);
                translateSecBMatrix = translate(3, -5, 0);
                rotateSecBMatrix = rotateY((3 * theta));

                modelSecMatrix = mult(translateSecBMatrix, rotateSecBMatrix);

                //apply all changes from first A to overall first model matrix
                modelMatrix = mult(modelMatrix, modelSecMatrix);

                //draw cube
                changeColor(6);
                drawObject(1);

            modelMatrix = stack.pop();
        modelMatrix = stack.pop();
    modelMatrix = stack.pop();

}

/**
 * render() is a method enables the camera, viewMatrix, projectionMatrix and modelMatrix additionally
 * this is where the object heirarchy is called and subsequent animation calls
 *
 * @method render()
 * @param {Void} nothing
 * @return {void} Returns nothing
 */
function render() {
    console.log("Entering render");

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(0, 0, 22);
    // eye = vec3(0, 0, 100);

    viewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(60, 1, .01, 100000);

    modelMatrix = mat4(1);

    objectHierarchy();



    requestAnimationFrame(render);
}
