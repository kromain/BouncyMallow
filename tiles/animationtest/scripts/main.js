
var lastTime = 0;
var scaleFactor = 0.1;
var scaleDelta = 0.01;

function start() {
  // Setup the animation frames
  var requestAnimationFrame = window.requestAnimationFrame       ||
                              window.mozRequestAnimationFrame    ||
                              window.webkitRequestAnimationFrame;
  if (!requestAnimationFrame) {
    alert("Unable to initialize animation loop. Your browser may not support it.");
  } else {
    window.requestAnimationFrame = requestAnimationFrame;
  }
  window.requestAnimationFrame(doStuff);
}

function doStuff(time) {
  // Request next frame right away
  window.requestAnimationFrame(doStuff);

  if (lastTime) {
    var fps = 1000 / (time - lastTime);
    document.getElementById('fpsLabel').innerHTML = "FPS: " + Math.round(fps);
  }
  lastTime = time;

  var img = document.getElementById('texture');
  var container = document.getElementById('imgContainer');
  var w = container.clientWidth;
  var h = container.clientHeight;
  img.width = Math.round(w * scaleFactor);
  img.height = Math.round(h * scaleFactor);

  
  scaleFactor += scaleDelta;
  if (scaleFactor >= 0.99 || scaleFactor <= 0.1)
  	scaleDelta = -scaleDelta;
}