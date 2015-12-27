var i,
    s,
    o,
    N = 30,
    E = 20,
    C = 5,
    d = 0.5,
    cs = [],
    g = {
      nodes: [],
      edges: []
    };

// Generate the graph:
for (i = 0; i < C; i++)
  cs.push({
    id: i,
    nodes: [],
    color: '#' + (
      Math.floor(Math.random() * 16777215).toString(16) + '000000'
    ).substr(0, 6)
  });

for (i = 0; i < N; i++) {
  o = cs[(Math.random() * C) | 0];
  g.nodes.push({
    id: 'n' + i,
    //label: 'Node' + i,
    x: 100 * Math.cos(2 * i * Math.PI / N),
    y: 100 * Math.sin(2 * i * Math.PI / N),
    color: o.color,
    size: 10,
    glyphs: [{
          position: 'center',
          size: 15,
          // Style 1:
          ///fillColor: '#fff',
          //strokeColor: function() { return this.color; },
          //strokeIfText: false,

          // Style 2:
           textColor: '#fff',
           fillColor: o.color,
           strokeColor: '#fff',
           strokeIfText: true,

          content: (i + 10) * 10 
        }],
    
    
  });
  o.nodes.push('n' + i);
}

for (i = 0; i < E; i++) {
  var source = 'n' + (Math.random() * N | 0);
  var target = 'n' + (Math.random() * N | 0);  
  g.edges.push({
      id: 'e' + i,
      source: source,
      target: target,
      type: (source === target) ? 'curvedArrow' : 'arrow',
      size: .5
    });
}
sigma.renderers.def = sigma.renderers.canvas;
s = new sigma({
  graph: g,
  renderer: {
    container: document.getElementById('graph-container'),
    type: 'canvas'
  },
  settings: {
    borderSize: 1,
    outerBorderSize: 7,
    defaultNodeBorderColor: 'rgba(255,215,0,.2)',
    defaultNodeOuterBorderColor: 'rgb(236, 81, 72)',
    edgeHoverExtremities: true,
    enableHovering: true,
    nodeHoverLevel: 3,
    nodeHoverColor: 'default',
    defaultNodeHoverColor: 'rgba(255,215,0,.2)',
    minEdgeSize: 3,
    maxEdgeSize: 3,
    minArrowSize: 4,
    minNodeSize: 20,
    maxNodeSize: 20,
    glyphLineWidth: 1,
    glyphStrokeIfText: false,
    glyphTextThreshold: 1,
    glyphThreshold: 1
  },
  container: 'graph-container'
});

var activeState = sigma.plugins.activeState(s);
var select = sigma.plugins.select(s, activeState, s.renderers[0]);
var myRenderer = s.renderers[0];

myRenderer.bind('render', function(e) {
    console.log(e);
    myRenderer.glyphs();
});

var frListener = sigma.layouts.fruchtermanReingold.configure(s, {
  iterations: 500,
  easing: 'quadraticInOut',
  duration: 800
});

// Bind the events:
frListener.bind('start stop interpolate', function(e) {
  console.log(e.type);
});

// Configure the Fruchterman-Reingold algorithm:
var dagreListener = sigma.layouts.dagre.configure(s, {
  directed: true, // take edge direction into account
  rankdir: 'LR',  // Direction for rank nodes. Can be TB, BT, LR, or RL,
                  // where T = top, B = bottom, L = left, and R = right.
  easing: 'quadraticInOut', // animation transition function
  duration: 800,   // animation duration
  // nodes : s.graph.nodes().slice(0,30), // subset of nodes
  boundingBox: {minX: 10, maxX: 15, minY: 5, maxY:10} // constrain layout bounds ; object or true (all current positions of the given nodes)
});

// Bind the events:
dagreListener.bind('start stop interpolate', function(e) {
  console.log(e.type);
});
// Start the DAG layout:
sigma.layouts.dagre.start(s);

s.bind('overNode outNode clickNode doubleClickNode rightClickNode', function(e) {
   snapper.open('left');
   snapper.disable();
   $('#close-left i').transition({ rotate: '0deg'});
   //$('.menu').toggleClass('open', 200, 'easeOutQuad');
   console.log(e.type, e.data.node.label, e.data.captor);
});
s.bind('overEdge outEdge clickEdge doubleClickEdge rightClickEdge', function(e) {
  console.log(e.type, e.data.edge, e.data.captor);
});
s.bind('clickStage', function(e) {
  console.log(e.type, e.data.captor);
});
s.bind('doubleClickStage rightClickStage', function(e) {
  console.log(e.type, e.data.captor);
});

$('#close-left').bind('click', function() {
    $('#close-left i').transition({
      rotate: '1080deg'
    });
    snapper.enable();
    setTimeout(function() {snapper.close('left');}, 300);
});

$('#layout-style').bind('change', function() {
    var style = this.value;
    console.log(style);
    if (style === 'Reingold') 
        sigma.layouts.fruchtermanReingold.start(s);
    else
        sigma.layouts.dagre.start(s);
   
});
