var network;
const map1 = new Map();
const timeMap = new Map();
const timeToNode = new Map();
var names = [];
var startpoint = 0;
var fontChoice = false;

var pg, visCanvas = null;


function preload() {
  table = loadTable('links.csv', 'csv', 'header');
  nodes_table = loadTable('nodes.csv', 'csv', 'header');
  fontChoice = loadFont('Roboto-Medium.ttf');
}


//preload active nodes
//inactive nodes
//connections


function setup() {
  //calculate distances
  for (let r = 1; r < nodes_table.getRowCount(); r++) {
    timeMap.set(nodes_table.getString(r, 0), nodes_table.getString(r, 1));
    timeToNode.set(nodes_table.getString(r, 1), nodes_table.getString(r, 0))
  }


  timescale = 30;
  // KATIE: Made the canvas smaller, will help with draw time. I messily tried to make the
  // elements all dynamically sized, just to show what I mean - but broke a few things
  // doing so. If you have the time to tweak, 
  // Drawing everything smaller/dynamically will help with performance

  width = window.innerWidth;
  height = window.innerHeight;
  defaultradius = width / 120;
  if (.8 * width > height) { // Katie: just to preserve aspect ratio
    width = height * 1.25;
  } else {
    height = width * .8;
  }

  // KATIE: I added the WEBGL parameter to createCanvas, which makes it 3D. The 3D 
  // is irrelevant here, more importantly it allows the browser to use 
  // hardware acceleration for drawing - Woohoo! One of the drawbacks with p5 is that
  // it can be pretty slow, so this could help. A few syntax changes are required
  // with adding webGL, I've addressed the following:
  // * You have to preload & declare a font in order to draw text
  // * It changes the coord system from (0,0) in the top left to (0,0) in the center but
  //    you can change that back with translate
  // If you decide to go this route and run into trouble here, just slack me! 
  visCanvas = createCanvas(width, height, WEBGL).style('font-family', 'Roboto')
  visCanvas.style('font-family', 'Roboto')

  lastName = table.getString(1, 0);

  network = new Network(0, 0);
  mainName = table.getString(0, 1);
  maxTime = 1;

  mainX = width / 2
  mainY = height / 2

  var newNode = new Neuron(mainX, mainY, mainName, true, defaultradius * 4);
  map1.set(mainName, newNode);;
  map1.set(lastName, new Neuron(width / 2 + 50, height / 2 + 50))
  names.push(mainName);
  //create neurons
  //the reason some first tier neurons can be outside this range is because
  //the also got the information again from a nother source later
  for (let r = 2; r < nodes_table.getRowCount(); r++) {
    currName = table.getString(r, 0);
    time = int(timeMap.get(currName));
    if (time > maxTime) {
      maxTime = time;
    }
    //everyone connected to main tweeter close to him for sure
    if (currName != lastName) {
      //set inner circle based just on time

      //if no time just random
      angle = random(0, TWO_PI);


      // Katie: just adjusted so they'd fit in frame, but I've broken your spacing a bit!
      let distances = [
        [.03 * width, .13 * width],
        [.15 * width, .32 * width]
      ];

      distance = random(distances[0])
      if (table.getString(r, 1) != mainName) {
        distance = random(distances[1])
      }
      if (time == -1) {
        map1.set(currName, new Neuron(mainX + cos(angle) * distance, mainY + sin(angle) * distance, currName, false, defaultradius, time, true));
      } else {
        map1.set(currName, new Neuron(mainX + cos(angle) * distance, mainY + sin(angle) * distance, currName, true, defaultradius, time, true));
      }

    }
    names.push(lastName);
    lastName = currName;


  }

  for (let r = 2; r < 6000; r++) {
    currName = table.getString(r, 0);
    time = int(timeMap.get(currName));
    if (table.getString(r, 1) != mainName) {
      try {
        parentNeuron = map1.get(table.getString(r, 1));
        parentX = parentNeuron.position.x - mainX;
        parentY = parentNeuron.position.y - mainY;
        magnitude = sqrt(parentX * parentX + parentY * parentY);
        colorCount = 1;
        map1.set(currName, new Neuron(mainX + (parentX) * 1.05, mainY + parentY * 1.05, currName, true, defaultradius, time, false));

      } catch {
        console.log('fail');
      }
    }
  }

  names.push(currName);

  //connect neurons using edges
  for (let r = 1; r < table.getRowCount(); r++) {
    network.connect(map1.get(table.getString(r, 1)), map1.get(table.getString(r, 0)), 2);
  }
  for (let i = 0; i < names.length; i++) {
    network.addNeuron(map1.get(names[i]));
  }


  first = map1.get(names[0]);


  //normalize distances (iterate through and make everything within a certain radius from another)
  // console.log(table.getRowCount() + ' total rows in table');

  for (i = 0; i < 10; i++) {
    network.orient();
  }
  network.update();
  network.buildTimeDict();
  network.display();
  network.feedforward(1, 1);
  newNode.fire();

  //KATIE: Sorry for the horribly descriptive variable name, but this also helps with performance.
  // Basically, instead of drawing the lines every frame, we're drawing them to a separate canvas and
  // only drawing that canvas once. This is a lot faster, but it means that the lines won't change. I've
  // separated the lines and the nodes along the lines into separate functions - so it still draws the
  // animations. If you have any objects that are mostly static - this method can be really helpful.
  pg = createGraphics(width, height);
  for (var i = 0; i < network.connections.length; i++) {
    network.connections[i].displayLines();
  }
}

function draw() {
  translate(-width / 2, -height / 2, 0); //KATIE: moves our drawing origin to the top left corner (have to do if using webGL)
  timescale = 40;
  drawtime = round(exp(frameCount / timescale))
  background(255);
  textSize(20);
  stroke(210);
  strokeWeight(4);

  for (var k = 1; k < 5; k++) {
    fill(255);
    ellipse(mainX, mainY, 2 * maxTime / (timescale * k));
    fill(0);
  }
  network.update(drawtime);
  network.display();
  image(pg, 0, 0, width, height) // KATIE: Draws our connections canvas
  fill(29, 161, 242);
  stroke(29, 161, 242);
  ellipse(mainX, mainY, 2 * defaultradius);
  textFont(fontChoice);
  let fps = frameRate(); // KATIE: just for the FPS counter
  text("FPS: " + fps.toFixed(2), 10, 20);

  const totalSeconds = round(exp(frameCount / timescale))
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
  const seconds = totalSeconds - (minutes * 60) - (hours * 3600);
  const timestring = (days ? days + 'd' : '') + hours + 'h' + minutes + 'm' + seconds + 's';
  text(timestring + " after tweet", 10, 50)
}

//go through the network and adjust all of the nodes
//but doesns't do anything yet and is not used
function goThrough(n, currposx, currposy, r) {
  n.position = createVector(currposx + r * cos(random(0, 2 * PI)), currposy + r * cos(random(0, 2 * PI)));
  if (typeof n.connections !== 'undefined') {
    for (var i = 0; i < n.connections.length; i++) {
      goThrough(n.connections[i], n.position.x, n.position.y, r - 6);
    }
  }
}

function Connection(from, to, w) {

  this.a = from;
  this.b = to;
  this.weight = w;
  this.sending = false;
  this.sender = null;
  this.output = 0;


  this.feedforward = function (val) {
    this.output = val * this.weight;
    this.sender = this.a.position.copy();
    this.sending = true;
  }

  this.update = function () {
    if (this.sending) {
      this.sender.x = lerp(this.sender.x, this.b.position.x, 0.2);
      this.sender.y = lerp(this.sender.y, this.b.position.y, 0.2);
      var d = p5.Vector.dist(this.sender, this.b.position);
      if (d < 1) {
        this.b.feedforward(this.output);
        this.sending = false;
      }
    }
  }

  // KATIE: This is the function that draws the lines to the separate canvas (pg)
  this.displayLines = function () {
    pg.stroke(220);
    pg.strokeWeight(this.weight * 0.4);
    pg.line(this.a.position.x, this.a.position.y, this.b.position.x, this.b.position.y);
  }

  // KATIE: This is the function that draws the line animations to the main canvas
  this.displayAnimate = function () {
    var hasSent = false;
    if (this.sending) {
      hasSent = true;
      fill(0);
      strokeWeight(1);
      ellipse(this.sender.x, this.sender.y, defaultradius / 2, defaultradius / 2);
    }
  }
}

function Network(x, y) {

  this.neurons = [];
  this.connections = [];
  this.position = createVector(x, y);
  // KATIE: This is fairly rough, but an idea of how to handle keeping track of nodes
  this.timesDict = {} // also not amazing variable name, but a dict where the keys are the times and the values are the neurons at that time
  this.timesList = [] //  a list of all the times in the network, sorted
  this.prevTimeIndex = -1; //he index of the time the last neuron fired

  this.buildTimeDict = function () { // KATIE: this is a function that builds the timesDict and timesList
    for (var i = 0; i < this.neurons.length; i++) {
      let n = this.neurons[i];
      if (this.timesDict[n.time]) {
        this.timesDict[n.time].push(n);
      } else {
        this.timesList.push(n.time)
        this.timesDict[n.time] = [n];
      }
    }
    this.timesList.sort();
  }

  this.addNeuron = function (n) {
    this.neurons.push(n);
  }

  this.connect = function (a, b, weight) {
    if (typeof a !== 'undefined' && typeof b !== 'undefined') {
      var c = new Connection(a, b, weight);
      a.addConnection(c);
      this.connections.push(c);
    }
  }

  this.feedforward = function () {
    for (var i = 0; i < arguments.length; i++) {
      var n = this.neurons[i];
      n.feedforward(arguments[i]);
    }
  }

  this.orient = function () {
    for (i = 0; i < this.neurons.length; i++) {
      this.neurons[i].orient();
    }

  }

  // KATIE: Also messy, but basically you look at the current time,
  // see if it's larger than the previous time, and if so, fire all the neurons up to/including
  // the new time. If this is unclear, I can explain more or write more clearly!
  this.update = function (time) {
    if (this.prevTimeIndex < this.timesList.length - 1) {
      currentTimeIndex = this.prevTimeIndex + 1
      currentTime = this.timesList[currentTimeIndex]
      found = false
      while (currentTime <= time) {
        found = true
        for (var i = 0; i < this.timesDict[currentTime].length; i++) {
          this.timesDict[currentTime][i].fire();
        }
        currentTime = this.timesList[++currentTimeIndex]
      }
      if (found) this.prevTimeIndex = currentTimeIndex
    }
    for (var i = 0; i < this.connections.length; i++) {
      this.connections[i].update();
    }
  }

  this.display = function () {
    push();
    translate(this.position.x, this.position.y, 1);

    for (var i = 0; i < this.connections.length; i++) {
      this.connections[i].displayAnimate();
    }
    /// These function calls add up, so if they're constant they should be moved out of the display function
    stroke(29, 161, 242);
    strokeWeight(1);
    fill(255);
    ///
    for (var i = 0; i < this.neurons.length; i++) {
      if (this.neurons[i].active) {
        if (this.neurons[i].isSending) {
          if (this.neurons[i].isFirst) {
            fill(10, 121, 200);
          } else {
            fill(29, 161, 242);
          }
        }
        this.neurons[i].display();
        this.r = lerp(this.r, defaultradius, 0.1);
        fill(255);
      } else {
        this.neurons[i].display();
      }
    }
    pop();
  }
}

function Neuron(x, y, name, active, radius, time, isFirst) {

  this.position = createVector(x, y);
  this.connections = [];
  this.sum = 0;
  this.r = radius;
  this.isTouched = false;
  this.name = name;
  this.active = active;
  this.time = time;
  this.isSending = false;
  this.isFirst = isFirst;

  this.addConnection = function (c) {
    this.connections.push(c);
  }

  this.feedforward = function (input) {
    this.sum += input;
    if (this.sum > 1) {
      //this.fire();
      this.sum = 0;
      this.isTouched = true;

    }
  }

  this.orient = function () {
    var sumx = 0;
    var sumy = 0;
    for (j = 0; j < this.connections.length; j++) {
      sumx = sumx + this.connections[j].b.position.x;
      sumy = sumy + this.connections[j].b.position.y;
    }
    if (sumx != 0 && sumy != 0) {
      this.position = createVector(sumx / this.connections.length, sumy / this.connections.length);
    }
  }

  this.fire = function () {
    if (!this.isSending) {
      this.r = this.r * 1.2;
      this.isSending = true;
      for (var i = 0; i < this.connections.length; i++) {
        if (this.active) {
          this.connections[i].feedforward(this.sum);
        }
        //  this.connections[i].isTouched = true;
      }
    }
  }

  this.display = function () {
    push();
    translate(0, 0, 1) // KATIE: (X, Y, (Z)) a little tricky, but can use 3D as a z-index, so the the neurons are always draw on top of the connections
    let drawRadius = this.r;
    if (this.connections.length > 100) {
      drawRadius = this.r * 4;
    } else if (this.connections.length > 30) {
      drawRadius = this.r * 3;
    } else if (this.connections.length > 10) {
      drawRadius = this.r * 2;
    }
    ellipse(this.position.x, this.position.y, drawRadius, drawRadius);
    pop();
  }
}