//array that will hold under each index the respective line of the file inputted in readTextFile()
var lines = [];

var canvas;

var gl;

var program;

var Gbuffer = [];

// the contents of the file uploaded
var FileContents;

//coordinates for x,y and z
var GCoors = [];

var Gtrianglefaces = [];

var jvPosition;

var Gvertices = [];

var MaxX;

var MaxY

var MaxZ;

var MinX;

var MinY;

var MinZ;

var MidX;

var MidY;

var MidZ;

var AvgPointDist;

var XsideLength;

var YsideLength;

var ZsideLength;

var AvgsideLength;

var TheAvg;

var at;

var up;

var eye;

var PositiveVertexNormal = [];

var modelmatrix;

//pulsing

var pulseMatrix;

var pulsing = false;

var pulsecounter = 0;

//translation counters

var XTCounter = 0;

var YTCounter = 0;

var ZTCounter = 0;

//is it rotating in the this direction false for positive, true for negative

var Xpos = false;

var Ypos = false;

var Zpos = false;

var translateMatrix;

//rotation is false if its rotation counter clockwise, true for clockwise

var rotation = false;

var theta = 0;

//translation in the positive or negative direction

var Xtranslate = false;

var Ytranslate = false;

var Ztranslate = false;

var rotateMatrix;

//for the input for the cosine function

var cosarr = [0, (Math.PI) / 6, (Math.PI) / 4, (Math.PI) / 3, (Math.PI) / 2, (2 * (Math.PI)) / 3, (3 * (Math.PI)) / 4, (5 * (Math.PI)) / 6, Math.PI];

var trigcounter = 0;

function main() {
// Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas, undefined);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    window.onkeydown = function (evt) {
        let key = evt.key;
        switch (key) {
            case('x'):
                Xtranslate = !Xtranslate;
                Xpos = false;
                break;

            case ('c'):
                Xtranslate = !Xtranslate;
                Xpos = true;
                break;

            case ('y'):
                Ytranslate = !Ytranslate;
                Ypos = false;
                break;

            case ('u'):
                Ytranslate = !Ytranslate;
                Ypos = true;
                break;

            case ('z'):
                Ztranslate = !Ztranslate;
                Zpos = false;
                break;

            case ('a'):
                Ztranslate = !Ztranslate;
                Zpos = true;
                break;

            case ('r'):
                rotation = !rotation;
                break;

            case ('b'):
                pulsing = !pulsing;
                break;

            default:

        }
    }

    // Initialize shaders
    // This function call will create a shader, upload the GLSL source, and compile the shader
    program = initShaders(gl, "vshader", "fshader");

    // We tell WebGL which shader program to execute.
    gl.useProgram(program);

    //Set up the viewport
    //x, y - specify the lower-left corner of the viewport rectangle (in pixels)
    //In WebGL, x and y are specified in the <canvas> coordinate system
    //width, height - specify the width and height of the viewport (in pixels)
    //canvas is the window, and viewport is the viewing area within that window
    //This tells WebGL the -1 +1 clip space maps to 0 <-> gl.canvas.width for x and 0 <-> gl.canvas.height for y
    gl.viewport(0, 0, canvas.width, canvas.height);

    var FileEvt = document.getElementById('files');
    FileEvt.addEventListener('change', getFile, false);

}

//takes in file which is actually the button event that contains information on the file

/**
 * getFile() will clear the buffer, clear all the applicable arrays and counters and takes the button
 * event from the the FileEvt.addEventListener() and extracts out the file from it
 *
 * @method getFile
 * @return {void} Returns nothing
 */
function getFile(file) {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    Gvertices = [];

    GCoors = [];

    Gtrianglefaces = [];

    PositiveVertexNormal = [];

    trigcounter = 0;

    Gbuffer = [];

    modelmatrix = mat4(1);

    pulseMatrix = mat4(1);

    rotateMatrix = mat4(1);

    translateMatrix = mat4(1);

    // set f to the file associated with what has been uploaded
    var f = file.target.files[0];

    //creates a new FileReader Object which will be used to read through the text file
    var fr;
    fr = new FileReader();

    //upon the file reader being loaded we want to run the getData() method to obtain the contents of the file
    fr.onload = getData;

    //everything done above will now be executed
    fr.readAsText(f);

}


/**
 * getData() takes the file given to it and extracts out the contents of the file
 *
 * @method getData
 * @param {Object} FileLoadEvtInput
 * @return {void} Returns nothing
 */
function getData(FileLoadEvtInput) {
    var f;
    f = FileLoadEvtInput;

    //storing of the file contents
    FileContents = f.target.result;

    //displaying the file contents to the console
    //console.log(FileContents);

    //sending the file contents to the parser to be parsed
    FileFormatter(FileContents);
}


/**
 * Takes the contents of the file and formats the contents so potential empty lines are removed and
 * the contents can be parsed through, line by line.
 *
 * @method FileFormatter
 * @param {String} FileContentsInput
 * @return {void} Returns nothing
 */
function FileFormatter(FileContentsInput) {
    console.log("entered FileFormatter");

    var fc;
    fc = FileContentsInput;

    //splitting the contents of the file into different lines that can be iterated through
    lines = fc.split('\n');

    // Removes empty lines
    lines = lines.filter(FilterHelper);

    StringParser(fc);

}

//helper function to deal with the removal of blank/empty lines
/**
 * helper function to deal with the removal of blank/empty lines
 *
 * @method FilterHelper
 * @param {String} EditedLine
 * @return {String} Returns string without empty lines
 */
function FilterHelper(EditedLine) {
    return EditedLine;
}


/**
 * StringParser sorts though the contents of the .ply file and fills two arrays, GCoors and Gtrianglefaces
 * GCoors holds all the values for each x, y and z coordinate that will be referenced by the contents of
 * Gtrianglefaces.
 * Gtrianglefaces holds 4 things per line.
 * number of vertices in the 0th index
 * vertex_a that makes up point_a in the triangle in the first index
 * vertex_b that makes up point_b in the triangle in the second index
 * vertex_c that makes up point_c in the triangle in the third index
 *
 * Once this has been completed, the sequence of methods after StringParser will be called, creation of
 * the buffer be done, allocation and storage of memory for Color Location, PointSize, Projection Matrix,
 * View Matrix, and the enabling of depth testing
 *
 *
 * @method StringParser
 * @param {String} FileContentsInput
 * @return {void} Returns nothing
 */
function StringParser(FileContentsInput) {
    console.log("entered StringParser");

    var words;
    words = [];

    //Number of TempVertices
    var NoV;

    //Number of Polygons
    var NoP;

    //coordinates for x,y and z
    var Coors = [];

    //TempVertices for triangles
    var triangles = [];

    var Xcoor;

    var Ycoor;

    var Zcoor;

    //Number Of Vertices In Polygon
    var NoViP

    var vertex_a;

    var vertex_b;

    var vertex_c;

    var plybool = false;

    // console.log(lines);

    //iterates through lines
    for (var i = 0; i < lines.length; i++) {
        // console.log("line: %d", i);
        // console.log(lines[i]);

        //If the file doesnt contain "Ply" do not continue parsing
        if (lines[i].match(/ply/i) || plybool) {

            plybool = true;
            //checks to see if "format", "property", "end" or "ply" is in the current line
            if (!(lines[i].match(/format/i) || lines[i].match(/property/i) || lines[i].match(/end/i)
                || (lines[i].match(/ply/i)))) {

                //words is the array of words making up the line
                words = lines[i].trim().split("  ").join(" ").split(" ");

                //determines if we are going into a "element" line
                if (lines[i].match(/element/i)) {
                    //determine if we are going to get the NoV or NoP
                    if (lines[i].match(/vertex/i)) {
                        if (NoV == undefined) {
                            NoV = parseFloat(words[2]);
                        } else {
                            console.log("Error: You have reached the else for NoV");
                        }
                    } else if (lines[i].match(/face/i)) {
                        if (NoP == undefined) {
                            NoP = parseFloat(words[2]);
                        } else {
                            console.log("Error: You have reached the else for NoP");
                        }
                    } else {
                        console.log("There Was An Error In Element phase");
                    }

                    //takes coordinates from line
                } else if (words.length == 3 && !(lines[i].match(/element/i))) {

                    Coors = [];

                    Xcoor = parseFloat(words[0]);
                    Ycoor = parseFloat(words[1]);
                    Zcoor = parseFloat(words[2]);

                    Coors.push(Xcoor, Ycoor, Zcoor);
                    GCoors.push(Coors);

                    //takes the vertices from triangle line
                } else if (words.length == 4 && !(lines[i].match(/element/i))) {

                    triangles = [];

                    NoViP = parseFloat(words[0]);
                    vertex_a = parseFloat(words[1]);
                    vertex_b = parseFloat(words[2]);
                    vertex_c = parseFloat(words[3]);

                    triangles.push(NoViP, vertex_a, vertex_b, vertex_c);
                    Gtrianglefaces.push(triangles);

                } else if (!(lines[i].match(/ply/i)) || plybool) {
                    console.log('Error: beep boop');
                } else {
                    console.log("currently going past line ply");
                }

            } else {
                console.log("currently going past the unneeded lines");
            }
        } else {
            console.log("File Does Not Contain Ply");
            break;
        }
    }

    SortVertices();
    CalculateSurfaceNormal();

    Gbuffer = [];

    for (var i = 0; i < Gvertices.length; i++) {

        var jvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, jvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(Gvertices[i]), gl.STREAM_DRAW);

        Gbuffer.push(jvBuffer);
    }

    var jvColorloc = gl.getUniformLocation(program, "vColor");
    gl.uniform4f(jvColorloc, 1.0, 1.0, 1.0, 1.0);

    var PointSizeLoc = gl.getUniformLocation(program, "vPointSize");
    gl.uniform1f(PointSizeLoc, 1.0);

    var thisProj = perspective(60, 1, .1, 1000000);
    var projMatrix = gl.getUniformLocation(program, 'projMatrix');
    gl.uniformMatrix4fv(projMatrix, false, flatten(thisProj));

    var ViewMatrix = lookAt(eye, at, up);
    var jvMatrix = gl.getUniformLocation(program, 'viewMatrix');
    gl.uniformMatrix4fv(jvMatrix, false, flatten(ViewMatrix));

    gl.enable(gl.DEPTH_TEST);

    render();
}


/**
 * This is where the relationship between Gtrianglefaces and GCoors meets. This is where Gtrianglefaces
 * vertex calls are related to the vertex coordinates within GCoors.
 * These coordinates, per point are put into an array. These points per triangle are stored in array.
 * Each new row represents a new triangle with the row number associated to the triangles number.
 * This 3D array is stored within Gvertices
 *
 * @method SortVertices
 * @return {void} Returns nothing
 */
function SortVertices() {
    console.log("Entering SortVertices");

    //first vertex within face
    var vertex_a;

    //second vertex within face
    var vertex_b;

    //third vertex within face
    var vertex_c;

    //first second and third points that make up the first vertex within the triangle face
    var point_a;

    //first second and third points that make up the second vertex within the triangle face
    var point_b;

    //first second and third points that make up the third vertex within the triangle face
    var point_c;

    for (var i = 0; i < Gtrianglefaces.length; i++) {
        //Gtrianglefaces[i][1] finds the number for vertex_a at which ever "i" row
        //the variable above will the become the input for the row we need to find the point at

        vertex_a = Gtrianglefaces[i][1];

        vertex_b = Gtrianglefaces[i][2];

        vertex_c = Gtrianglefaces[i][3];

        point_a = GCoors[vertex_a];

        point_b = GCoors[vertex_b];

        point_c = GCoors[vertex_c];

        //pushes vertices to global vertices
        Gvertices.push([point_a, point_b, point_c]);
    }
    findExtentBoundaries();
}


/**
 * findExtentBoundaries parses through the contents of the 3D array and finds the minimum and maximum values
 * for the x, y and z planes so as to define extent boundaries later on
 *
 * @method findExtentBoundaries
 * @return {void} Returns nothing
 */
function findExtentBoundaries() {
    console.log("Entering findExtentBoundaries");
    var tempMaxX;

    var tempMaxY;

    var tempMaxZ;

    var tempMinX;

    var tempMinY;

    var tempMinZ;

    //represents the first array's x value in which ever row i is in
    var currentX;

    var currentY;

    var currentZ;


    for (var i = 0; i < Gvertices.length; i++) {
        for (var j = 0; j < 3; j++) {

            currentX = Gvertices[i][j][0];

            currentY = Gvertices[i][j][1];

            currentZ = Gvertices[i][j][2];

            //finds the min and max of each coordinate plane
            switch (j) {
                case 0:
                    if (tempMaxX == undefined || currentX > tempMaxX) {
                        tempMaxX = currentX;
                    } else if (tempMinX == undefined || currentX < tempMinX) {
                        tempMinX = currentX;
                    } else {

                    }
                    break;
                case 1:
                    if (tempMaxY == undefined || currentY > tempMaxY) {
                        tempMaxY = currentY;
                    } else if (tempMinY == undefined || currentY < tempMinY) {
                        tempMinY = currentY;
                    } else {

                    }
                    break;
                case 2:
                    if (tempMaxZ == undefined || currentZ > tempMaxZ) {
                        tempMaxZ = currentZ;
                    } else if (tempMinZ == undefined || currentZ < tempMinZ) {
                        tempMinZ = currentZ;
                    } else {

                    }
                    break;
                default:

            }
        }
    }
    MaxX = tempMaxX;

    MaxY = tempMaxY;

    MaxZ = tempMaxZ;

    MinX = tempMinX;

    MinY = tempMinY;

    MinZ = tempMinZ;

    findAtEyeAndUp();
}


/**
 * findAtEyeAndUp will finds among other things, the eye, the at, and the up.
 * eye: This is a term that refers to the camera which behaves as our "eye" into the world we are building
 * at: This is a term that refers to the thing we are looking at
 * up: defines the "up" direction to create a reference direction as to where we are looking
 *
 * @method findAtEyeAndUp
 * @return {Void} Returns nothing
 */
function findAtEyeAndUp() {
    console.log("Entering findAtEyeAndUp");

    var rootthree;

    rootthree = Math.sqrt(3);

    XsideLength = (MaxX - MinX);

    YsideLength = (MaxY - MinY);

    ZsideLength = (MaxZ - MinZ);

    AvgsideLength = (XsideLength + YsideLength + ZsideLength) / 3;

    MidX = (MaxX + MinX) / 2;

    MidY = (MaxY + MinY) / 2;

    MidZ = (MaxZ + MinZ) / 2;

    var absMidX = (Math.abs(MaxX) + Math.abs(MinX)) / 2;

    var absMidY = (Math.abs(MaxY) + Math.abs(MinY)) / 2;

    var absMidZ = (Math.abs(MaxZ) + Math.abs(MinZ)) / 2;

    AvgPointDist = (absMidX + absMidY + absMidZ) / 3;
    console.log("AvgPointDist");
    console.log(AvgPointDist);


    // switch () {
    //
    // }


    at = vec3(MidX, MidY, MidZ);

    up = vec3(0.0, 1.0, 0.0);

    eye = vec3(MidX, MidY, (rootthree * XsideLength));
}


/**
 * Using the Newell method this function is designed to take the three points associated with the triangle
 * and find the surface normal associated with those points. This surface normal will later allow us to
 * translate each triangle in the direction of that surface normal vector to create a pulsing effect
 *
 * Each Surface Normal Vector is then stored to an array and each array is associated with a row equal to
 * their triangles row
 *
 * @method CalculateSurfaceNormal
 * @return {Void} Returns nothing
 */
function CalculateSurfaceNormal() {
    console.log("Entering CalculateSurfaceNormal");

    var array;
    var plusone;

    modelmatrix = mat4(1);

    //Using the newell method
    var VertexNormal = [0.0, 0.0, 0.0];

    for (var i = 0; i < Gvertices.length; i++) {
        for (var j = 0; j < 3; j++) {
            array = Gvertices[i][j];
            plusone = Gvertices[(i)][((j + 1) % 3)];

            //finds the normal to the x axis
            VertexNormal[0] += ((array[1] - plusone[1]) * (array[2] + plusone[2]));

            //finds the normal to the y axis
            VertexNormal[1] += ((array[2] - plusone[2]) * (array[0] + plusone[0]));

            //finds the normal to the z axis
            VertexNormal[2] += ((array[0] - plusone[0]) * (array[1] + plusone[1]));

        }
        console.log("Vertex Normal:", VertexNormal);
        PositiveVertexNormal.push(normalize(VertexNormal));
        VertexNormal = [0.0, 0.0, 0.0];
    }
}


/**
 * CalculateModelMatrix will create the model matrix for any interaction occuring. This means that if a
 * pulse is inniatated then the pulse matrix will be multiplied to the the original model matrix and passed
 * on to the render function thus showing the change object on screen. Same is true for transitions and
 * rotations. Determining if a transition, rotation or pulse event is happening is based on the
 * conditionals found below
 *
 * @method CalculateModelMatrix
 * @return {Void} Returns nothing
 */
function CalculateModelMatrix() {
    console.log("Entering CalculateModelMatrix");

    //sets the model matrix equal to a unit matrix
    modelmatrix = mat4(1);

    //sets the translation matrix equal to a unit matrix
    translateMatrix = mat4(1);

    //sets the rotation matrix equal to a unit matrix
    rotateMatrix = mat4(1);

    //temporary array for the PositiveVertexNormal array
    var tempNorm;

    var X;

    var Y;

    var Z;

    //for translation
    if (Xtranslate || Ytranslate || Ztranslate || !(XTCounter == 0) || !(YTCounter == 0) || !(ZTCounter == 0)) {
        if (!Xpos && Xtranslate) {
            XTCounter++;
        } else if (Xpos && Xtranslate) {
            XTCounter--;
        }

        if (!Ypos && Ytranslate) {
            YTCounter++;
        } else if (Ypos && Ytranslate) {
            YTCounter--;
        }

        if (!Zpos && Ztranslate) {
            ZTCounter++;
        } else if (Zpos && Ztranslate) {
            ZTCounter--;
        }

        translateMatrix = translate(XTCounter * (XsideLength / 100), YTCounter * (YsideLength / 100), ZTCounter * (ZsideLength / 100));
    }

    //for rotation
    if (rotation || !(theta == 0)) {
        if (rotation) {
            theta = theta + 1;
        }
        rotateMatrix = rotateX(theta);
    }

    modelmatrix = mult(translateMatrix, rotateMatrix);
}


/**
 * Pulsing multiplies the average distance length of each point in the object by the surface normal vector
 * to create a more uniform pulse. This is then multiplied by a ever changing pulsecounter that is associated
 * with a cosine function which goes back and forth from 0 to 1 aiding in the pulse effect. Finally value
 * is translated.
 *
 * @method Pulsing
 * @param {Float} Currentface
 * @return {Float} Returns updated pulseMatrix
 */
function Pulsing(Currentface) {

    var X;

    var Y;

    var Z;

    var tempNorm;

    pulseMatrix = mat4(1);

    //for pulsing
    if (pulsing || !(pulsecounter == 0)) {

        tempNorm = PositiveVertexNormal[Currentface];

        X = pulsecounter * (tempNorm[0] * AvgPointDist);
        Y = pulsecounter * (tempNorm[1] * AvgPointDist);
        Z = pulsecounter * (tempNorm[2] * AvgPointDist);

        pulseMatrix = translate(X, Y, Z);

    }
    return pulseMatrix;
}


/**
 * pulseScale is a function that finds the number to be inputted into the cosine function. This goes back
 * and fourth between 0 and 1 in an array
 *
 * @method pulseScale
 * @return {Float} Returns radian value
 */
function pulseScale() {
    if (trigcounter < (cosarr.length - 1)) {
        console.log(cosarr[trigcounter]);
        trigcounter++;

    } else {
        cosarr.reverse();
        trigcounter = 0;

        console.log(cosarr[trigcounter]);
        trigcounter = 1;
    }

    return cosarr[trigcounter]
}


/**
 * render goes through and renders the buffer, multiplies the pulse matrix based off every triangle face,
 * and updates the pulse counter.
 *
 * @method methodName
 * @return {Void} Returns nothing
 */
function render() {
    console.log("Entering render");

    CalculateModelMatrix();

    var pulseScaleinput;

    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (var i = 0; i < Gbuffer.length; i++) {

        gl.bindBuffer(gl.ARRAY_BUFFER, Gbuffer[i]);

        var pulsematrix = Pulsing(i);
        var pulsedMatrix = mult(modelmatrix, pulsematrix);

        jvPosition = gl.getAttribLocation(program, "vPosition");
        gl.vertexAttribPointer(jvPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(jvPosition);

        var ModelLoc = gl.getUniformLocation(program, "modelMatrix");
        gl.uniformMatrix4fv(ModelLoc, false, flatten(pulsedMatrix));

        gl.drawArrays(gl.LINE_LOOP, 0, 3);

    }

    if (pulsing || !(pulsecounter == 0)) {

        pulseScaleinput = pulseScale();
        pulsecounter = (1 / 2) - (Math.cos(pulseScale(pulseScaleinput)) / 2);

    }

    requestAnimationFrame(render);
}










