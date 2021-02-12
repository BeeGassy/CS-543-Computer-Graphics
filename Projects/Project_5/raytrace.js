var program1;
var program2;
var program3;

function main()
{
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas, undefined);
    if (!gl)
    {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    document.getElementById("btn1").addEventListener("click", image1);
    document.getElementById("btn2").addEventListener("click", image2);
    document.getElementById("btn3").addEventListener("click", image3);

    program1 = initShaders(gl, "vshader", "fshader0");
    program2 = initShaders(gl, "vshader", "fshader1");
    program3 = initShaders(gl, "vshader", "fshader2");

    gl.viewport( 0, 0, canvas.width, canvas.height );

    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var buffer = gl.createBuffer();


    // Create a square as a strip of two triangles.
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1,1,
            0,1,
            1,0,
            -1,-1,
            0,1,
            -1,0]),
        gl.STATIC_DRAW
    );
}

/**
 * image1() is a method that takes in the correct initshader that holds the correct fragment shader, fshader0
 *
 * @method image1()
 * @param {Void} Nothing
 * @return {void} Returns nothing
 */
function image1(){
    gl.useProgram(program1);
    render(program1);
}

/**
 * image2() is a method that takes in the correct initshader that holds the correct fragment shader, fshader1
 *
 * @method image1()
 * @param {Void} Nothing
 * @return {void} Returns nothing
 */
function image2(){
    gl.useProgram(program2);
    render(program2);
}

/**
 * image3() is a method that takes in the correct initshader that holds the correct fragment shader, fshader2
 *
 * @method image1()
 * @param {Void} Nothing
 * @return {void} Returns nothing
 */
function image3(){
    gl.useProgram(program3);
    render(program3);
}

/**
 * render() is a method that takes in the correct initshader and renders that image
 *
 * @method image1()
 * @param {Event} aProgram
 * @return {void} Returns nothing
 */
function render(aProgram){
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.aPosition = gl.getAttribLocation(aProgram, "aPosition");
    gl.enableVertexAttribArray(gl.aPosition);
    gl.vertexAttribPointer(gl.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}