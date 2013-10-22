

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
  window.setInterval(doStuff, 3000);
}

function transmogrify(number) {
  try {
    var res = Number.MAX_VALUE;
    while (res > 1) {
      res = res / number;
    }
    return res;
  } catch(err) {
    console.error("Ouch! Got exception: " + err);
    return -1;
  }
}

function doStuff(time) {
    var randomNum = Math.ceil(Math.random() * 10);
    var res = transmogrify(randomNum);
    document.getElementById('numLabel').innerHTML = randomNum + " -> " + res;
}