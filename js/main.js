var g = {
      nodes: [],
      edges: [],
      drawerNode: null
    };

(function(g) {
    var i,
    s,
    o,
    N = 30,
    E = 20,
    C = 5,
    d = 0.5,
    cs = [];
    
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
        name: 'CS' + (i + 10) * 10,
        x: 100 * Math.cos(2 * i * Math.PI / N),
        y: 100 * Math.sin(2 * i * Math.PI / N),
        color: o.color,
        size: 50,
        glyphs: [{
              position: 'center',
               textColor: '#fff',
               fillColor: o.color,
               strokeColor: '#fff',
               strokeIfText: false,
              content: 'CS'+ (i + 10) * 10 
            }]  
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
})(g);

sigma.renderers.def = sigma.renderers.canvas;

var s = new sigma({
  graph: g,
  container: 'graph-container',
  settings: {
    borderSize: 1,
    outerBorderSize: 7,
    defaultNodeBorderColor: 'rgba(255,215,0,.1)',
    defaultNodeOuterBorderColor: 'rgba(255, 215, 0, .5)',
    edgeHoverExtremities: true,
    enableHovering: true,
    nodeHoverLevel: 3,
    nodeHoverColor: 'default',
    defaultNodeHoverColor: 'rgba(255,215,0,.05)',
    minEdgeSize: 3,
    maxEdgeSize: 3,
    minArrowSize: 5,
    minNodeSize: 20,
    maxNodeSize: 20,
    glyphScale: .9,
    glyphFontScale: .6,  
    glyphLineWidth: 1,
    glyphStrokeIfText: true,
    glyphTextThreshold: 1,
    glyphThreshold: 6
  },
});

var glyphRenderer = s.renderers[0];
glyphRenderer.bind('render', function(e) {
    glyphRenderer.glyphs();
});

var activeState = sigma.plugins.activeState(s);
var selectANode = sigma.plugins.select(s, activeState, glyphRenderer, selectCallback, {exclusive: true});

var frListener = sigma.layouts.fruchtermanReingold.configure(s, {
  iterations: 500,
  easing: 'quadraticInOut',
  duration: 800
});

var dagreListener = sigma.layouts.dagre.configure(s, {
  directed: true, // take edge direction into account
  rankdir: 'LR',  // Direction for rank nodes. Can be TB, BT, LR, or RL,
                  // where T = top, B = bottom, L = left, and R = right.
  easing: 'quadraticInOut', // animation transition function
  duration: 800,   // animation duration
  // nodes : s.graph.nodes().slice(0,30), // subset of nodes
  boundingBox: {minX: 10, maxX: 15, minY: 5, maxY:10} // constrain layout bounds ; object or true (all current positions of the given nodes)
});

sigma.layouts.dagre.start(s);

function selectCallback(target) {
    if (target.length === 0 && g.drawerNode !== null)
        leftSnapClose();
    else {
        setDrawerContent(s.graph.nodes(target)[0]);
        if (snapper.state().state === 'closed'){
            g.drawerNode = target;
            snapper.open('left');
            snapper.disable();
        }
    }
    arrowSpin('left');    
}

function setDrawerContent(node) {
    $('#drawer-title').fadeOut(function() {
        $(this).text(node.name)
    }).fadeIn();
}

function leftSnapClose() {
    arrowSpin('left');
    snapper.enable();
    g.drawerNode = null;
    setTimeout(function() {
        snapper.close('left');
    }, 300);
    $('#drawer-title').fadeOut();
}

function rightSnapClose() {
    arrowSpin('right');
    snapper.enable();
    setTimeout(function() {
        snapper.close('right');
    }, 300);
}

function arrowSpin(leftOrRight) {
    var i = leftOrRight === 'left' ? $('#close-left i') : $('#close-right i');
    if (i.hasClass('spun')) {
        i.transition({rotate: '0deg'});
        i.removeClass('spun');
    } else {
        i.transition({rotate: '1080deg'});
        i.addClass('spun');
    }
}

$('#close-left i').bind('click', function() {
    activeState.dropNodes();
  // console.log(activeState.nodes());
    s.refresh({skipIndexation: true});
    leftSnapClose();
});

$('#close-right i').bind('click', function() {
    activeState.dropNodes();
   // console.log(activeState.nodes());
    s.refresh({skipIndexation: true});
    rightSnapClose();
});


$('#wrench').bind('click', function() {
    if (snapper.state().state === 'right') {
        rightSnapClose();
        snapper.enable();
    }
    else {
        snapper.open('right');
        arrowSpin('right');    
        snapper.disable();
    }
});

$('#layout-style').bind('change', function() {
    var style = this.value;
    console.log(style);
    if (style === 'Reingold') 
        sigma.layouts.fruchtermanReingold.start(s);
    else
        sigma.layouts.dagre.start(s);
});
