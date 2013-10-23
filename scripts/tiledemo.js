//---------------------------------------------------------------------
// WebGL hooks
//---------------------------------------------------------------------

var canvas;
var ctx2d;
var gl;

var viewportWidth = 6.0;
var viewportHeight = 3.0;
var halfViewportWidth = viewportWidth / 2;
var halfViewportHeight = viewportHeight / 2;

//---------------------------------------------------------------------
// UI Controls
//---------------------------------------------------------------------

var useWebGLCheckbox;
var spriteCounter;
var destroyTimeoutCounter;

//---------------------------------------------------------------------
// Animation
//---------------------------------------------------------------------

var animateTiles = true;
var opaqueTiles = false;
var lastFrameTime;
var showFPSCounter = false;

//---------------------------------------------------------------------
// The matrices
//---------------------------------------------------------------------

var viewMatrix;
var projectionMatrix;
var viewProjectionMatrix;

//---------------------------------------------------------------------
// Shader program variables
//---------------------------------------------------------------------

var shaderProgram;
var shaderProgramLinked = false;
var vertexPositionAttribute;
var textureCoordAttribute;
var modelViewProjectionLocation;
var samplerUniformLocation;

//---------------------------------------------------------------------
// Uniform/Attribute names
//
// Currently there's a difference between the naming for the binary
// shaders and the standard WebGL implementation. Shouldn't really
// need to do this but at the moment its necessary.
//---------------------------------------------------------------------

var vertexPositionAttributeName;
var textureCoordAttributeName;
var modelViewProjectionName;
var samplerName;

//---------------------------------------------------------------------
// Sprites
//---------------------------------------------------------------------

var tileWidth = 250;
var tileHeight = 250;
var tilesPaused = false;

/**
 * List of textures that can be loaded.
 */
var textures = [
'/images/asscreed3.png',
'/images/dead_space3.png',
'/images/dishonored.png',
'/images/gow_ascension.png',
'/images/gta5.png',
'/images/metal_gear.png',
'/images/tomb_raider.png',
'/images/uncharted3.png',
'/images/zoe.png',
];

/**
 * The sprites appearing on screen.
 */
var sprites = new Array();

//---------------------------------------------------------------------
// Helper functions
//---------------------------------------------------------------------

/**
 * Determines if an integer is a power of 2.
 *
 * @param num {number} The integer to check.
 * @returns true if the integer is a power of 2; false otherwise.
 */
function isPowerOfTwo(num) {
  return (num & (num - 1)) == 0;
}

//---------------------------------------------------------------------
// Sprite 'class'
//---------------------------------------------------------------------

/**
 * Creates an instance of the Sprite class.
 *
 * It should be noted that we're not trying to do anything smart here. Buffer assets,
 * such as textures and vbos, will not be shared. This really isn't how you should be
 * doing any of this and is meant as a quick and dirty example.
 *
 * @param gl {WebGLRenderingContext} The rendering context.
 * @param width {number} The width of the sprite.
 * @param height {number} The height of the sprite.
 * @param texture {String} Path to the texture to load.
 */
function Sprite(width, height, url) {

  this._position = vec3.create();
  this._velocity = vec3.create();
  
  this._modelMatrix = mat4.create();
  mat4.identity(this._modelMatrix);

  this._modelViewProjectionMatrix = mat4.create();

  this._static = opaqueTiles && !animateTiles;
  this._log = "Event handlers:\n";
  this._gotonload = false;
  this._gotonlocationchange = false;
  
  var that = this; // *shakes fist*
  
  this._tile = new HTMLTile(tileWidth,tileHeight);

  this._tile.onload = function() {
    that._gotonload = true;
    that._log = "got onload for " + that._tile.src + "!\n";
  };

  var loadingImage = new Image();
  loadingImage.src = "images/loading_wh.gif";
  loadingImage.onload = function() {
    if (!that._gotonload)
      that._onTextureLoaded(loadingImage);
  };

  var updateCount = 0;
  this._tile.onupdate = function() {
    that._onTextureLoaded(that._tile);
    if (!that._gotonlocationchange)
      that._log = "got onupdate " + updateCount++ + "!\n";
    redrawScene();
  };

  this._gotonlocationchange = false;
  this._tile.onlocationchange = function(event) {
    that._gotonlocationchange = true;
    that._log = "Got URL request: " + event.url;
    if (event.url.indexOf(window.location.origin) == 0)
      event.locationChangeAllowed = true;
  }

  this._tile.onerror = function(event) {
    that._log = "Load error " + event.detail;
  };

  this._tile.onunresponsive = function() {
    that._log = "! Unresponsive Tile !";
    that._tile.destroy();
  }

  this._tile.oncrash = function() {
    that._log = "!!! TILE CRASHED !!!";
    //that._tile.destroy();
  }

  if (gl) {
    // Create the vertices
    this._vertices = gl.createBuffer();
    
    var halfWidth = width * 0.5;
    var halfHeight = height * 0.5;
    
    // Now create an array of vertices for the sprite.
    var vertices = [
      -halfWidth, -halfHeight,  1.0, 0.0, 1.0,
       halfWidth, -halfHeight,  1.0, 1.0, 1.0,
       halfWidth,  halfHeight,  1.0, 1.0, 0.0,
      -halfWidth, -halfHeight,  1.0, 0.0, 1.0,
       halfWidth,  halfHeight,  1.0, 1.0, 0.0,
      -halfWidth,  halfHeight,  1.0, 0.0, 0.0,    
    ];
    
    // Now pass the list of vertices into WebGL to build the shape. We
    // do this by creating a Float32Array from the JavaScript array,
    // then use it to fill the current vertex buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);    
  }

  if (url.indexOf("http") != 0)
    url = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/')) + url;
  this._tile.src = url;
}

/**
 * Deletes any assets associated with the sprite.
 */
Sprite.prototype.clear = function() {
  if (gl) {
    gl.deleteBuffer(this._vertices);
    gl.deleteTexture(this._texture);
  }
  this._tile.destroy();
}

/**
 * Updates the current sprite.
 *
 * Dead simple animation of sprite's bouncing around an enclosed area.
 */
Sprite.prototype.update = function(delta) {
  //console.time("Sprite.update");
  this.setPosition([this._position[0] + this._velocity[0] * delta, this._position[1] + this._velocity[1] * delta, 1.0]);
  
  if ((this._position[0] < -halfViewportWidth) && (this._velocity[0] < 0.0)) {
    this._velocity[0] = -this._velocity[0];
  }
  if ((this._position[0] > halfViewportWidth) && (this._velocity[0] > 0.0)) {
    this._velocity[0] = -this._velocity[0];
  }
  if ((this._position[1] < -halfViewportHeight) && (this._velocity[1] < 0.0)) {
    this._velocity[1] = -this._velocity[1];
  }
  if ((this._position[1] > halfViewportHeight) && (this._velocity[1] > 0.0)) {
    this._velocity[1] = -this._velocity[1];
  }  
  //console.timeEnd("Sprite.update");
}

/**
 * Draws the current sprite.
 *
 * Object shouldn't be in control of it's own drawing. Once again this is
 * a BAD design, do NOT use it in production. I repeat this is TEST code.
 *
 * Don't need to reset the shader program but do need to set the buffers, uniforms
 * and call a draw.
 */
 Sprite.prototype.draw = function() {
  //console.time("Sprite.draw");
  if (!this._texture)
    return;
  
  if (gl) {
    if (!shaderProgramLinked)
      return;

    // Draw the sprite by binding the array buffer to the sprite's vertices
    // array, setting attributes, and pushing it to GL. The array is interleaved.
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertices);

    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 20, 0);
    
    // Set the texture coordinates attribute for the vertices.
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 20, 12);
    
    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.uniform1i(samplerUniformLocation, 0);
    
    // Specify the model/view/projection matrix
    gl.uniformMatrix4fv(modelViewProjectionLocation, false, this._modelViewProjectionMatrix);
    
    // Draw the cube.
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  } else {
    ctx2d.fillStyle = 'gray';
    ctx2d.font = "16px sans-serif";

    ctx2d.fillText(this._log, this._canvasX , this._canvasY);
    if (this._static)
      ctx2d.putImageData(this._texture, this._canvasX, this._canvasY);
    else
      ctx2d.drawImage(this._texture, this._canvasX, this._canvasY, tileWidth, tileHeight);
  }
  
  //console.timeEnd("Sprite.draw");
 }
 
/**
 * Sets the position of the sprite.
 *
 * @param position {vec3} The position to set the sprite to.
 */
Sprite.prototype.setPosition = function(position) {
  vec3.set(position, this._position);

  if (gl) {
    // Update the model matrix.
    mat4.identity(this._modelMatrix);
    mat4.translate(this._modelMatrix, this._position);

    // Compute the model view matrix for the sprite.
    mat4.multiply(viewProjectionMatrix, this._modelMatrix, this._modelViewProjectionMatrix);
  } else {
    var xPos = halfViewportWidth + this._position[0] - pixelsToWidth(tileWidth) / 2;
    this._canvasX = Math.round(xPos / viewportWidth * canvas.width);
    var yPos = halfViewportHeight + this._position[1] - pixelsToHeight(tileHeight) / 2;
    this._canvasY = Math.round(yPos / viewportHeight * canvas.height);
  }  
}

/**
 * Sets the velocity of the sprite.
 *
 * @param velocity {vec3} The velocity to set the sprite to.
 */
Sprite.prototype.setVelocity = function(velocity) {
  vec3.set(velocity, this._velocity);
}

/**
 * Callback for when the texture is loaded.
 *
 * @param image {Image} The image to use as a texture.
 */
Sprite.prototype._onTextureLoaded = function(image) {
  //console.log('Loaded texture at ' + image.src);

  if (gl) {
    if (!this._texture)
      this._texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this._texture);

    if (image.imageData)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image.imageData);
    else
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);      
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);  

    gl.bindTexture(gl.TEXTURE_2D, null);
  } else {
    if (image.imageData) {
      if (this._static) {
        this._texture = image.imageData;
      } else {
        if (!this._texture || !this._texture.getContext) {
          this._texture = document.createElement("canvas");
          this._texture.width = image.imageData.width;
          this._texture.height = image.imageData.height;        
        }
        this._texture.getContext("2d").putImageData(image.imageData, 0,0);
      }
    } else {
      this._texture = image;
    }
  }
}

function resetSprites() {
  for (var i = 0; i < sprites.length; ++i)
    sprites[i].clear();

  sprites = new Array();
}

function pixelsToWidth(pixels) {
  return canvas ? viewportWidth * pixels / canvas.width : 0;
}

function pixelsToHeight(pixels) {
  return canvas ? viewportHeight * pixels / canvas.height : 0;
}

/**
 * Updates the number of sprites to create.
 *
 * If the number is greater than the previous count it will add to the sprites,
 * otherwise they will be removed.
 */
function updateSpritesCount() {
  var newSpriteCount = spriteCounter ? spriteCounter.value : textures.length;
  var currentSpriteCount = sprites.length;
  
  if (newSpriteCount > currentSpriteCount) {
    for (var i = currentSpriteCount; i < newSpriteCount; ++i) {
      var texture = i % textures.length;
      var sprite = new Sprite(pixelsToWidth(tileWidth), pixelsToHeight(tileHeight), textures[texture]);
      
      var randX = (Math.random() * viewportWidth) - halfViewportWidth;
      var randY = (Math.random() * viewportHeight) - halfViewportHeight;
      
      sprite.setPosition([randX, randY, 1.0]);
      
      randX = (Math.random() * 0.02) - 0.01;
      randY = (Math.random() * 0.02) - 0.01;
      
      sprite.setVelocity([randX, randY, 0.0]);
      sprite.setVelocity([randX, randY, 0.0]);
      
      sprites[i] = sprite;
    }
  } else {
    for (var i = newSpriteCount; i < currentSpriteCount; ++i) {
      sprites[i].clear();
    }
    
    sprites = sprites.slice(0, newSpriteCount);
  }
}

function deleteOneSpriteOrReset() {
  if (sprites.length)
    sprites.shift().clear();
  else
    updateSpritesCount();

  if (destroyTimeoutCounter)
    window.setTimeout(deleteOneSpriteOrReset, destroyTimeoutCounter.value * 1000);
}

function toggleTilesPauseResume() {
  for (var i = 0; i < sprites.length; ++i) {
    if (tilesPaused)
      sprites[i]._tile.resume();
    else
      sprites[i]._tile.pause();
  }
  tilesPaused = !tilesPaused;
}

/**
 * Called when the canvas is created to get the ball rolling.
 */
function start() {

  var animateTilesCheckbox = document.getElementById('animatetiles');
  if (animateTilesCheckbox) {
    animateTiles = animateTilesCheckbox.checked;

    animateTilesCheckbox.onchange = function() {
      animateTiles = animateTilesCheckbox.checked;
      redrawScene();
    };
  }

  var pauseTilesCheckbox = document.getElementById('pausetiles');
  if (pauseTilesCheckbox) {
    pauseTilesCheckbox.onchange = toggleTilesPauseResume;
  }

  // Setup the callback for the canvas type selector
  useWebGLCheckbox = document.getElementById('usewebgl');
  if (useWebGLCheckbox) {
    useWebGLCheckbox.onchange = resetCanvas;
  }

  // Setup the callback for when the sprite count changes
  spriteCounter = document.getElementById('tilecount');
  if (spriteCounter) {
    spriteCounter.onchange = updateSpritesCount;
  }

  destroyTimeoutCounter = document.getElementById('destroytimeout');
  if (destroyTimeoutCounter) {
    window.setTimeout(deleteOneSpriteOrReset, destroyTimeoutCounter.value * 1000);
  }

  // Setup the callback for the tile focus tester
  var focusTileCheckbox = document.getElementById('focustile');
  if (focusTileCheckbox) {
    focusTileCheckbox.onchange = function() {
      if (sprites.length)
        sprites[0]._tile.sendEvent(focusTileCheckbox.checked ? HTMLTile.FocusIn : HTMLTile.FocusOut);
    };
  }  

  // Setup the callbacks for the tile click tester
  var clickTileCheckbox = document.getElementById('clicktile');
  if (clickTileCheckbox) {
    clickTileCheckbox.onmousedown = function() {
      if (sprites.length)
        sprites[0]._tile.sendEvent(HTMLTile.ButtonPress);
    };
    clickTileCheckbox.onmouseup = function() {
      if (sprites.length)
        sprites[0]._tile.sendEvent(HTMLTile.ButtonRelease);
    };
  }

  // Setup the animation frames
  var requestAnimationFrame = window.requestAnimationFrame       ||
                              window.mozRequestAnimationFrame    ||
                              window.webkitRequestAnimationFrame;
  if (!requestAnimationFrame) {
    alert("Unable to initialize animation loop. Your browser may not support it.");
  } else {
    window.requestAnimationFrame = requestAnimationFrame;
  }

  resetCanvas();
}

function resetCanvas() {

  // reset sprites before deleting the canvas, so we can clean up properly
  resetSprites();

  // We can't reset the context of a canvas after it's been initialized,
  // so we'll just destroy and recreate new canvas elements each time
  // (we could also use a show/hide strategy with 2 canvases but having only one is easier)

  if (!canvas) {
    canvas = document.getElementById("example");
  } else {
    var canvasParent = canvas.parentNode;
    canvasParent.removeChild(canvas);

    var newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    canvasParent.appendChild(newCanvas);

    canvas = newCanvas;
  }

  ctx2d = null;
  gl = null;

  if (useWebGLCheckbox && useWebGLCheckbox.checked)
    initWebGLCanvas();
  else
    init2DCanvas();

  // This will recreate all sprites for the matching canvas type
  updateSpritesCount();

  redrawScene();
}

function init2DCanvas() {
  try {
    ctx2d = canvas.getContext("2d");
  }
  catch(e) {
    alert("Error while calling getContext('2d')");
  }
}

function initWebGLCanvas() {
  // Initialize the GL context
  initWebGL(canvas);
  
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
    
    // Create matrices
    viewMatrix = mat4.create();
    projectionMatrix = mat4.create();
    viewProjectionMatrix = mat4.create();
    
    // Initialize the view matrix
    mat4.lookAt([0, 0, 6], [0, 0, 0], [0, 1, 0], viewMatrix);
    
    // Initialize the projection matrix.
    mat4.perspective(45, canvas.width / canvas.height, 1, 100, projectionMatrix);
    
    // Create the view/projection matrix.
    mat4.multiply(projectionMatrix, viewMatrix, viewProjectionMatrix);
  }
}

/**
 * Initialize WebGL.
 *
 * @return {WebGLRenderingContext} The context or null if it couldn't be initialized.
 */
function initWebGL() {  

  try {
    gl = canvas.getContext("experimental-webgl");
  }
  catch(e) {
  }
  
  if (!gl) {
    // If we don't have a GL context, give up now
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
}

function clearScene() {

    if (gl) {
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  } else {
    ctx2d.fillStyle = "lightsteelblue";
    var labelHeight = 20;

    if (!lastFrameTime)
      ctx2d.clearRect(0, 0, canvas.width, canvas.height); // first paint, clear everything
    else if(showFPSCounter)
      ctx2d.clearRect(20, 0, 100, labelHeight); // just for the FPS label area

    for (var i = 0; i < sprites.length; ++i) {
      if (sprites[i]._static)
        ctx2d.clearRect(sprites[i]._canvasX, sprites[i]._canvasY - labelHeight, tileWidth, labelHeight);
      else
        ctx2d.clearRect(sprites[i]._canvasX, sprites[i]._canvasY - labelHeight, tileWidth, tileHeight + labelHeight);
    }

  }

}

// var spriteX = -halfViewportWidth;
// var spriteY = -halfViewportHeight;
function layoutSprites(frameDelta) {
  if (animateTiles) {
    for (var i = 0; i < sprites.length; ++i)
       sprites[i].update(frameDelta);
  } else {
    // var xDelta = pixelsToWidth(tileWidth+2);
    // var yDelta = pixelsToHeight(tileHeight+2);
    var xDelta = 1.2;
    var yDelta = 1.2;
    var xStart = 0;
    var yStart = 0; // TODO

    var spriteX = xStart;
    var spriteY = yStart;
    // Static layout in a 4*n grid
    for (var i = 0; i < sprites.length; ++i) {
      sprites[i].setPosition([spriteX, spriteY, 1.0]);

      spriteX += xDelta;
      if (spriteX >= halfViewportWidth) {
        spriteX = -halfViewportWidth;
        spriteY += yDelta;
        if (spriteY >= halfViewportHeight)
          spriteY = -halfViewportHeight;
      }
    }
  }
}

function drawSprites() {
  for (var i = 0; i < sprites.length; ++i)
    sprites[i].draw();
}

/**
 * Draw the scene.
 * @param {number} time The current time.
 */
function drawScene(time) {

  drawScenePending = false;
  // If animating, request next draw right away
  if (animateTiles)
    redrawScene();

  // console.time("drawScene");
  clearScene();

  var dt = (lastFrameTime) ? time - lastFrameTime : 0;
  var fps = dt ? 1000 / dt : 0;
  var frameDelta = (dt) ? Math.round(dt/16) : 0;
  // console.log("frame delta: " + frameDelta);
  
  lastFrameTime = time;
  
  // Update the sprites
  // Done in two steps so the updating and drawing can be profiled separately  
  // console.time("update");
  
  layoutSprites(frameDelta);
  
  // console.timeEnd("update");
  
  // Draw the sprites
  // console.time("draw");

  drawSprites();
  
  // console.timeEnd("draw");

  if (ctx2d && showFPSCounter) {
    ctx2d.fillStyle = 'red';
    ctx2d.font = "20px sans-serif";
    ctx2d.fillText("FPS: " + Math.round(fps), 20, 20);
  }
  
  // console.timeEnd("drawScene");
}

var drawScenePending = false;
function redrawScene() {
  if (drawScenePending)
    return;

  window.requestAnimationFrame(drawScene);
  drawScenePending = true;
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
  
  console.log('Loading binary shader');
  
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    console.log('Binary shader received');
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
    shaderProgramLinked = true;
  
    gl.useProgram(shaderProgram);
  
    // Get attribute locations
    vertexPositionAttribute = gl.getAttribLocation(shaderProgram, vertexPositionAttributeName);
    gl.enableVertexAttribArray(vertexPositionAttribute);
  
    textureCoordAttribute = gl.getAttribLocation(shaderProgram, textureCoordAttributeName);
    gl.enableVertexAttribArray(textureCoordAttribute);
    
    // Get uniform locations
    modelViewProjectionLocation = gl.getUniformLocation(shaderProgram, modelViewProjectionName);
    samplerUniformLocation = gl.getUniformLocation(shaderProgram, samplerName);
  }
}
