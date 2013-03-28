var canvas;
var gl;

var viewProjectionMatrix;
var quadVertices;
var quadTexture;

var shaderProgram;
var vertexPositionAttribute;
var textureCoordAttribute;
var modelViewProjectionLocation;
var samplerUniformLocation;

var vertexPositionAttributeName;
var textureCoordAttributeName;
var modelViewProjectionName;
var samplerName;

var shadersLinked = false;

function initWebGLCanvas() {
  canvas = document.getElementById("WebGLCanvas");
  try {
    gl = canvas.getContext("experimental-webgl");
  }
  catch(e) {
  }
  
  // Only continue if WebGL is available and working
  if (gl) {
    gl.clearColor(0.39, 0.58, 0.93, 1.0);  // Clear to light blue, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set the viewport
    gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    
    // Initialize the shaders.
    initShaders();
    
    // Create the view/projection matrix.    
    var viewMatrix = mat4.create();
    mat4.lookAt([0, 0, 6], [0, 0, 0], [0, 1, 0], viewMatrix);
    var projectionMatrix = mat4.create();
    mat4.perspective(45, canvas.width / canvas.height, 1, 100, projectionMatrix);
    viewProjectionMatrix = mat4.create();
    mat4.multiply(projectionMatrix, viewMatrix, viewProjectionMatrix);

    // Create a simple textured quad to display in the center
    // Create the vertices
    quadVertices = gl.createBuffer();
    var halfWidth = 1;
    var halfHeight = 1;    
    var vertices = [
      -halfWidth, -halfHeight,  1.0, 0.0, 1.0,
       halfWidth, -halfHeight,  1.0, 1.0, 1.0,
       halfWidth,  halfHeight,  1.0, 1.0, 0.0,
      -halfWidth, -halfHeight,  1.0, 0.0, 1.0,
       halfWidth,  halfHeight,  1.0, 1.0, 0.0,
      -halfWidth,  halfHeight,  1.0, 0.0, 0.0,    
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    // Create and initialize the texture, also triggers the rendering
    quadTexture = gl.createTexture();
    updateTextureContents();
  } else {
    // If we don't have a GL context, give up now
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
}

var callCounter = 1;
function updateTextureContents() {
    var ctx=document.getElementById("2DCanvas").getContext("2d");
    // Grow imgData by 10px every second frame
    var padding = 10 * Math.floor(callCounter/2);
    var imgData=ctx.createImageData(100+padding,100+padding);
    for (var i=0;i<imgData.data.length;i+=4) {
      if (callCounter % 2)
        imgData.data[i+0]=(i / 4) % imgData.width;
      if (callCounter % 3)
        imgData.data[i+1]=(i / 4) % imgData.width;
      if (callCounter % 4)
        imgData.data[i+2]=(i / 4) % imgData.width;
      imgData.data[i+3]=255;
    }
    ctx.putImageData(imgData, 0, 0);
    callCounter++;

    gl.bindTexture(gl.TEXTURE_2D, quadTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgData);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, null);

    drawScene();
  
    window.setTimeout(updateTextureContents, 3000);
}

function drawScene() {

  if (!shadersLinked)
    return;

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Draw the sprite by binding the array buffer to the sprite's vertices
  // array, setting attributes, and pushing it to GL. The array is interleaved.
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVertices);

  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 20, 0);
  
  // Set the texture coordinates attribute for the vertices.
  gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 20, 12);
  
  // Specify the texture to map onto the faces.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, quadTexture);
  gl.uniform1i(samplerUniformLocation, 0);
  
  // Specify the model/view/projection matrix
  gl.uniformMatrix4fv(modelViewProjectionLocation, false, viewProjectionMatrix);
  
  // Draw the cube.
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

//---------------------------------------------------------------------
// Shader functions
//---------------------------------------------------------------------

/**
 * Initialize the shaders.
 *
 * Sends requests off for the shader code. Once completed the shader is
 * linked.
 */
function initShaders() {  
  // Create the shader objects
  var vertexShader   = gl.createShader(gl.VERTEX_SHADER);
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  // Create the shader program
  shaderProgram = gl.createProgram();

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  
  // Check to see if we should load text or binary shaders
  if (gl.shaderBinary) {
    // Set the uniform and vertex attribute names
    //
    // This is because the current OpenGL ES 2 implementation doesn't take
    // the renaming done by ANGLE's cross compilation into account.
    vertexPositionAttributeName = 'input._a_position';
    textureCoordAttributeName   = 'input._a_texCoord';
    modelViewProjectionName     = '_u_mvpMatrix';
    samplerName                 = '_s_texture';    
  
    loadShaderBinary(vertexShader,   'shaders/simple_texture.vs.sb');
    loadShaderBinary(fragmentShader, 'shaders/simple_texture.fs.sb');
  } else {
    // Set the uniform and vertex attribute names  
    vertexPositionAttributeName = 'a_position';
    textureCoordAttributeName   = 'a_texCoord';
    modelViewProjectionName     = 'u_mvpMatrix';
    samplerName                 = 's_texture';
    
    loadShaderSource(vertexShader,   'shaders/simple_texture.vs');
    loadShaderSource(fragmentShader, 'shaders/simple_texture.fs');
  }
}

/**
 * Loads a text shader by making a XmlHttpRequest.
 *
 * @param {WebGLShader} shader The shader object to load source into.
 * @param {String} url The URL of the shader resource.
 */
function loadShaderSource(shader, url) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.onload = function() {
    var source = this.responseText;
  
    // Set the source
    gl.shaderSource(shader, source);
  
    // Compile the shader program
    gl.compileShader(shader);
  
    // See if it compiled successfully  
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    }
    
    // Attempt to link the program
    linkShader();
  };
  
  request.send();
}

/**
 * Loads a binary shader by making a XmlHttpRequest.
 *
 * @param {WebGLShader} shader The shader object to load the binary into.
 * @param {String} url The URL of the shader resource.
 */
function loadShaderBinary(shader, url) {
  var request = new XMLHttpRequest();  
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    var binary = this.response;
  
    // Set the binary
    gl.shaderBinary(shader, binary);
    
    // Attempt to link the program
    linkShader();
  };
  
  request.send();
}

/**
 * Links the shader.
 *
 * The linking won't be complete until both the vertex and fragment shader have
 * been successfully loaded. At this point the attributes are populated.
 */
function linkShader() {
  // Attempt to link
  gl.linkProgram(shaderProgram);

  // Linking will fail if both shaders aren't present
  if (gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
  
    gl.useProgram(shaderProgram);
  
    // Get attribute locations
    vertexPositionAttribute = gl.getAttribLocation(shaderProgram, vertexPositionAttributeName);
    gl.enableVertexAttribArray(vertexPositionAttribute);
  
    textureCoordAttribute = gl.getAttribLocation(shaderProgram, textureCoordAttributeName);
    gl.enableVertexAttribArray(textureCoordAttribute);
    
    // Get uniform locations
    modelViewProjectionLocation = gl.getUniformLocation(shaderProgram, modelViewProjectionName);
    samplerUniformLocation = gl.getUniformLocation(shaderProgram, samplerName);

    shadersLinked = true;
    drawScene();
  }
}

