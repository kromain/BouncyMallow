
var fibValue = 0;
var pingCounter = 1;

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

  window.onmousedown = function() {
    document.getElementById('pingLabel').innerHTML = "Got ping " + pingCounter++;
  }
}

function fib(number) {
  if (number < 2)
    return number;
  return fib(number-2) + fib(number-1);
}

function doStuff(time) {
  // Request next frame right away
  window.requestAnimationFrame(doStuff);

  document.getElementById('fibSeries').innerHTML = fibValue + " -> " + fib(fibValue);
  fibValue++;
}