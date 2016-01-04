var g = {
        nodes: [],
        edges: [],
        drawerNode: null
    },
    layoutEnum = Object.freeze({
        Fruchterman: 0,
        Dagre: 1
    }),
    layoutStyle = layoutEnum.Dagre;

var Node = (function () {
    var i,
        id = 0,
        cs = [],
        C = 4;

    for (i = 0; i < C; i++)
        cs.push({
            id: i,
            nodes: [],
            color: '#' + (
                Math.floor(Math.random() * 16777215).toString(16) + '000000'
            ).substr(0, 6)
        });

    function static_id() {
        return i;
    };

    function Node(x, y) {
        var clr = cs[(Math.random() * C) | 0].color;
        this.color = clr,
            this.id = 'n' + id++,
            this.name = 'CS' + (id + 10) * 10,
            this.size = 1, // to be set by sigma global settings
            this.x = typeof x !== 'undefined' ? x : 10,
            this.y = typeof y !== 'undefined' ? y : 10,
            this.glyphs = [{
                position: 'center',
                textColor: '#fff',
                fillColor: clr,
        }];
        this.glyphs[0].content = this.name;
    }
    Node.getStaticId = static_id;
    return Node;
})();

/*
 *  Populate dummy data
 */
(function (g) {
    var i,
        s,
        o,
        N = 30,
        E = 20,
        d = 0.5;


    for (i = 0; i < N; i++) {
        var x = 100 * Math.cos(2 * i * Math.PI / N),
            y = 100 * Math.sin(2 * i * Math.PI / N);
        n = new Node(x, y);

        g.nodes.push(n);
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

//sigma.renderers.def = sigma.renderers.canvas;

var s = new sigma({
    graph: g,
    //container: 'graph-container',
    renderer: {
        container: document.getElementById('graph-container'),
        type: 'canvas'
    },
    settings: {
        secondaryActiveColor: 'rgba(12,56,230,.3)',
        borderSize: 1,
        outerBorderSize: 1,
        defaultNodeBorderColor: 'rgba(255,215,0,.1)',
        defaultNodeOuterBorderColor: 'rgba(255, 215, 0, .3)',
        edgeHoverExtremities: true,
        enableHovering: true,
        nodeHoverLevel: 2,
        defaultNodeHoverColor: 'rgba(255,215,0,.05)',
        nodeHoverColor: 'default',
        minEdgeSize: 3,
        maxEdgeSize: 3,
        minArrowSize: 5,
        minNodeSize: 20,
        maxNodeSize: 20,
        glyphScale: .99,
        glyphFontScale: .6,
        glyphLineWidth: 1,
        glyphStrokeIfText: false,
        glyphTextThreshold: 1,
        glyphThreshold: 6
    },
});
s.secondaryMode = false;

var glyphRenderer = s.renderers[0];
glyphRenderer.bind('render', function (e) {
    glyphRenderer.glyphs();
});

var activeState = sigma.plugins.activeState(s);
var secondaryActiveState = sigma.plugins.activeState(s);
var selectANode = sigma.plugins.select(s, activeState, glyphRenderer, selectCallback, {
    exclusive: true
});

var frListener = sigma.layouts.fruchtermanReingold.configure(s, {
    iterations: 500,
    easing: 'quadraticInOut',
    duration: 800
});

var dagreListener = sigma.layouts.dagre.configure(s, {
    directed: true, // take edge direction into account
    rankdir: 'LR', // Direction for rank nodes. Can be TB, BT, LR, or RL,
    // where T = top, B = bottom, L = left, and R = right.
    easing: 'quadraticInOut', // animation transition function
    duration: 800, // animation duration
    // nodes : s.graph.nodes().slice(0,30), // subset of nodes
    boundingBox: {
        minX: 10,
        maxX: 15,
        minY: 5,
        maxY: 10
    } // constrain layout bounds ; object or true (all current positions of the given nodes)
});

function startLayout() {
    switch (layoutStyle) {
    case layoutEnum.Dagre:
        sigma.layouts.dagre.start(s);
        break;
    case layoutEnum.Fruchterman:
        sigma.layouts.fruchtermanReingold.start(s);
        break;
    default:
        console.log("something went wrong with the layout switch");
    }
}


function selectCallback(target) {
    if (target.length === 0 && g.drawerNode !== null) {
        leftSnapClose();
    } else {
        setDrawerContent(s.graph.nodes(target)[0]);
        if (snapper.state().state === 'closed') {
            $('#toolbar').detach().appendTo($('#outside-container'));
            g.drawerNode = target;
            snapper.open('left');
            snapper.disable();
        }
    }
    arrowSpin('left');
}

function createNode() {
    var n = new Node();
    s.graph.addNode(n);
    activeState.dropNodes();
    activeState.addNodes(n.id);
    setDrawerContent(n);
    s.refresh();
    startLayout();
}

function setDrawerContent(node) {
    var dependencies = [],
        txt = '',
        list = '';
    if (typeof node !== 'undefined') {
        txt = node.name;
        s.graph.edges().forEach(function (v, i, a) {
            if (v.target === node.id) {
                dependencies.push(s.graph.nodes(v.source));
            }
        });
        if (dependencies.length > 0) {
            dependencies.forEach(function (v) {
                list += ('<li><a href="#">' + v.name + '</a><a class="remove-dependency"><i data-id="' + v.id + '" class="fa fa-remove fa-lg"></i></a></li>');
            });
        } else {
            list = '<li><a> - none - </a></li>'
        }
    }
    $('.drawer-titles').fadeOut(200, function () {
        $(this).text(txt);
        $('#prerequisite-list').html(list);
    }).fadeIn(200, function () {
        $('.remove-dependency i').off('click').click(removeDependency);
        /* without the 'off', this binding will be duplicated, 
        /  due to how this function is called */
    });
}

function removeDependency() {
    var $i = $(this),
        $li = $i.parent().parent();
    $li.toggleClass('li-prereq-selected');
    console.log($(this).data('id'));
}

function leftSnapClose() {
    arrowSpin('left');
    snapper.enable();
    g.drawerNode = null;
    setTimeout(function () {
        snapper.close('left');
        $('#toolbar').detach().appendTo($('#outside-container'));
    }, 300);
    activeState.dropNodes();
    s.refresh({
        skipIndexation: true
    });
    $('#drawer-title').fadeOut();
}

function rightSnapClose() {
    arrowSpin('right');
    snapper.enable();
    $('.drawer-titles').fadeOut(200);
    setTimeout(function () {
        $('#toolbar').detach().appendTo($('#container'));
        snapper.close('right');
    }, 300);

    activeState.dropNodes();
    s.refresh({
        skipIndexation: true
    });
}

function arrowSpin(leftOrRight) {
    var i = leftOrRight === 'left' ? $('#close-left i') : $('#close-right i');
    if (i.hasClass('spun')) {
        i.transition({
            rotate: '0deg'
        });
        i.removeClass('spun');
    } else {
        i.transition({
            rotate: '1080deg'
        });
        i.addClass('spun');
    }
}

/*
 ** All static event bindings
 **
 */
(function () {

    $('#close-left i').on('click', function () {
        leftSnapClose();
    });

    $('#close-right i').on('click', function () {
        rightSnapClose();
    });


    $('#wrench').on('click', function () {
        if (snapper.state().state === 'right') {
            rightSnapClose();
            snapper.enable();
        } else {
            $('#toolbar').detach().appendTo($('#container'));
            snapper.open('right');
            arrowSpin('right');
            snapper.disable();
        }
    });


    $('#eye').on('click', function () {
        switch (layoutStyle) {
        case layoutEnum.Dagre:
            layoutStyle = layoutEnum.Fruchterman;
            break;
        case layoutEnum.Fruchterman:
            layoutStyle = layoutEnum.Dagre;
            break;
        default:
            console.log("something went wrong with the eye");
        }
        startLayout();
    });

    $('#create-node').on('click', function () {
        createNode();
    });
    $('#edit-dependencies').on('click', function () {
        console.log(s);
        s.secondaryMode = !s.secondaryMode;
    });


})();


$(function () {
    startLayout();
});