var canvas;
var gl;
var program;

var gCounter = 0;

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

var jvPosition;
var jvNormal;

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
    console.log("Entering Init");

    objectArr = [];

    tetrahedronPointsArr = [];
    tetrahedronVertNormPointsArr = [];
    sphereSurfaceNormal = [];

    cubePointsArr = [];
    cubeVertNormPointsArr = [];
    cubeSurfaceNormal = [];

    stack = [];

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
    console.log("Entering changeColor");

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
    console.log("Entering CalculateSurfaceNormal");

    var sphereArr = objectArr[0];

    var cubeArr = objectArr[1];

    //Using the newell method
    var VertexNormal = [0.0, 0.0, 0.0];

    for (var i = 0; i < objectArr[indexCount].length; i += 3) {
        VertexNormal = [0.0, 0.0, 0.0];

        var tempArr = [];

        if(indexCount === 0){
            tempArr = sphereArr;
        } else {
            tempArr = cubeArr;
        }

        for (var j = i; j < (i+3); j++){
            var next = ((j + 1) % 3);
            if (j == (i + 2)){
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
        tinkiewinkie =  vec4(VertexNormal[0], VertexNormal[1], VertexNormal[2], 0.0);

        if (indexCount === 0){
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
    console.log("Entering quad");

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
 * populateCube() is determing which vertex from the vertices array to pull from thus building the cube
 *
 * @method populateCube()
 * @param {Void} nothing
 * @return {void} Returns nothing
 */
function populateCube() {
    console.log("Entering populateCube");

    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
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
    console.log("Entering tetrahedron");

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
    console.log("Entering initColor");

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
    console.log("Entering mergeArrays");

    //place in the array that holds the vertices for the tetrahedron
    objectArr.push(tetrahedronPointsArr);

    //place in the array that holds the vertices for the cube
    objectArr.push(cubePointsArr);

    //FOR THE NORMALS
    //place in the array that holds the normalized vertices for the tetrahedron
    objectArr.push(tetrahedronVertNormPointsArr);

    //place in the array that holds the normalized vertices for the cube
    objectArr.push(cubeVertNormPointsArr);
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
    console.log("Entering drawObject");

    jvNormal = gl.getAttribLocation(program, "vNormal");
    gl.enableVertexAttribArray(jvNormal);

    cubeBuffer = gl.createBuffer();
    sphereBuffer = gl.createBuffer();
    lineBuffer = gl.createBuffer();

    jvPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(jvPosition);

    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
    gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    if (indexCount === 0) {
        drawSphere(indexCount);
    } else if (indexCount === 1) {
        drawCube(indexCount);
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
    console.log("Entering drawCube()");

    var cubeArr;
    cubeArr = objectArr[indexCount];
    var cubeVertNormArr = objectArr[3];

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeArr), gl.STREAM_DRAW);
    gl.vertexAttribPointer(jvPosition, 4, gl.FLOAT, false, 0, 0);

    var cubeNormBuffer = gl.createBuffer();

    if(flatOrGouraud){
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeVertNormArr), gl.STATIC_DRAW);
    } else if (!flatOrGouraud) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeSurfaceNormal), gl.STATIC_DRAW);
    } else {
        console.log("Error with cube buffer for surface/vert normal");
    }


    gl.vertexAttribPointer(jvNormal,4, gl.FLOAT, false, 0, 0);

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
    console.log("Entering drawSphere()");

    var sphereArr;
    sphereArr = objectArr[indexCount];
    var sphereNormArr = objectArr[2];

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereArr), gl.STREAM_DRAW);
    gl.vertexAttribPointer(jvPosition, 4, gl.FLOAT, false, 0, 0);

    var sphereNormBuffer = gl.createBuffer();

    if(flatOrGouraud){
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereNormArr), gl.STATIC_DRAW);
    } else if (!flatOrGouraud) {
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereSurfaceNormal), gl.STATIC_DRAW);
    } else {
        console.log("Error with sphere buffer for surface/vert normal");
    }

    gl.vertexAttribPointer(jvNormal,4, gl.FLOAT, false, 0, 0);

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
    console.log("going to drawConnectingLines()");

    var lineArr = [];

    lineArr.push(vec4(x1, y1, z1, 1.0));
    lineArr.push(vec4(x2, y2, z2, 1.0));

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(lineArr), gl.STREAM_DRAW);
    gl.vertexAttribPointer(jvPosition, 4, gl.FLOAT, false, 0, 0);

    var lineLoc =  gl.getUniformLocation(program, "isLine");
    gl.uniform1i(lineLoc, 1);

    gl.drawArrays(gl.LINES, 0, lineArr.length);
    gl.uniform1i(lineLoc, 0);
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
 * objectHierarchy() is a method that creates the heirarchy behind the mobile, parents pass down traits
 * like the rotation and translation. This is also where the creation of cubes, spheres and lines are had
 *
 * @method objectHierarchy()
 * @param {Void} nothing
 * @return {void} Returns nothing
 */
function objectHierarchy() {
    console.log("Entering objectHierarchy()");

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

    viewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(60, 1, .01, 100000);

    modelMatrix = mat4(1);

    objectHierarchy();

    requestAnimationFrame(render);
}
