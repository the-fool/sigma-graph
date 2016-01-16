var Graph = (function () {
    var id = 0,
        layoutEnum = Object.freeze({
            Fruchterman: 0,
            Dagre: 1
        });
    function staticID() {
        return id;
    }
    function Graph() {
        this.id = "g" + id++;
        this.nodes = [];
        this.edges = [];
        this.layoutStyle = layoutEnum.Dagre;
        this.editMode = false;
        this.drawerNode = null;
    }
    Graph.prototype.getStaticID = staticID;
    return Graph;


})();

var g = new Graph();

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
    Node.prototype.getStaticId = static_id;
    return Node;
})();

var Edge = (function () {
    function Edge(source, target) {
        // return undefined if duplicate or (after a very naive check) circular
        var edgeArray = g.edges.map(function (obj) {
            return obj.id;
        });
        var tentativeID = [source, target].join();

        if (($.inArray(tentativeID,
                edgeArray) != -1) || ($.inArray([target, source].join(),
                edgeArray)) != -1) {
            return undefined;
        }

        this.source = source,
            this.target = target,
            this.id = tentativeID,
            this.type = (source === target) ? 'curvedArrow' : 'arrow';

    }
    Edge.prototype.size = .5;
    return Edge;
})();
/*
 *  Populate dummy data
 */
(function (g) {
    var i,
        s,
        o,
        N = 30,
        E = 25,
        d = 0.5;

    for (i = 0; i < N; i++) {
        var x = 100 * Math.cos(2 * i * Math.PI / N),
            y = 100 * Math.sin(2 * i * Math.PI / N);
        n = new Node(x, y);
        g.nodes.push(n);
    }

    for (i = 0; i < E; i++) {
        var source = 'n' + (Math.random() * N | 0),
            target = 'n' + (Math.random() * N | 0);
        // skip cases where node is its own prereq
        if (source === target) {
            i--;
            continue;
        }
        var e = new Edge(source, target);

        if (e.id === undefined) {
            i--;
            continue;
        }
        g.edges.push(e);
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
        secondaryActiveColor: 'rgba(40,251,40,.5)',
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
    if (target.constructor === Array) {
        target = target[0];
    }
    if (!s.secondaryMode) {
        if (target === undefined ||
            target.length === 0 && g.drawerNode !== null) {
            leftSnapClose();
        } else {
            g.drawerNode = target;
            setDrawerContent(s.graph.nodes(target));
            leftSnapOpen();
        }
    } else { // secondary mode == addition of new prereqs
        handleTentativePrereq(target);
        if (activeState.nodes().length > 1) {
            $('#prereq-confirm').show(300);
        } else {
            $('#prereq-confirm').hide(300);
        }
    }
}

function handleTentativePrereq(nodeID) {
    if (nodeID === undefined) {
        var tentatives = activeState.nodes().map(function (e) {
            if (e.id !== g.drawerNode) {
                return e.id;
            }
        });
        $('#prereq-list>li.tentative').each(function () {
            if (tentatives[0] === undefined) {
                tentatives[0] = '';
            }
            //jQuery's .each() will terminate prematurely if given an array of undefined's
            if ($.inArray($(this).data('id'), tentatives) === -1) {
                $.when($(this).slideUp()).then(function () {
                    $(this).remove();
                });
                return false; // end the jQuery .each() loop
            }
        });
    } else {
        $(genPrereqLi(s.graph.nodes(nodeID), 'tentative')).prependTo($('#prereq-list'))
            .hide().show(300);
    }
}


function leftSnapOpen() {
    if (snapper.state().state !== 'closed') {
        arrowSpin();
        return;
    }

    $('#toolbar').detach().appendTo($('#outside-container'));
    snapper.open('left');
    arrowSpin();
    snapper.disable();
}

function leftSnapClose() {
    arrowSpin();
    snapper.enable();
    g.drawerNode = null;
    s.secondaryMode = false;
    setTimeout(function () {
        snapper.close('left');
        $('#toolbar').detach().appendTo($('#outside-container'));
    }, 300);
    activeState.dropNodes();
    s.refresh({
        skipIndexation: true
    });
    initDrawerContent();
}

function createNode() {
    var n = new Node();

    s.graph.addNode(n);
    activeState.dropNodes();
    activeState.addNodes(n.id);

    selectCallback(n.id);

    s.refresh();
    startLayout();
}

function setDrawerContent(node) {
    $('#left-main .drawer-title').fadeOut(200, function () {
        $(this).text(node.name);
    }).fadeIn(200);

    initDrawerContent();
    setPrereqs(node);
}

function setPrereqs(node) {
    var prereqs = [],
        list = '';
    $('#prereq-list li:not(#new-prereq)').remove();
    s.graph.edges().forEach(function (v, i, a) {
        if (v.target === node.id) {
            prereqs.push(s.graph.nodes(v.source));
        }
    });
    if (prereqs.length > 0) {
        prereqs.forEach(function (v) {
            list += genPrereqLi(v);
        });
    } else {
        list = '<li><a class="none"> - none - </a></li>';
    }
    $('#prereq-list').prepend(list);
}

function initDrawerContent() {
    $('.sublist-confirm').hide(200);
    $('#node-info-list>ul.sub').hide(200);
}

function genPrereqLi(node, cls) {
    var ret = '',
        c = cls == undefined ? '""' : cls;
    ret += '<li data-id="' + node.id + '" class="' + c + '">'
    ret += '<a href="#" class="heading">' + node.name;
    ret += '</a><a class="remove edit-opt"><i class="fa fa-remove fa-lg">';
    ret += '</i></a></li>';
    return ret;
}

function clickRemovePrereq() {
    var $i = $(this),
        $li = $i.parent().parent();
    $li.toggleClass('selected');
    if ($li.hasClass('selected') || $li.siblings('.selected').length > 0) {
        $('#prereq-confirm').show({
            duration: 400
        });
    } else {
        $('#prereq-confirm').hide(400);
    }
}

function removePrereqs() {
    var selected = $('#prereq-list li.selected');
    $('#prereq-confirm').hide(400);
    selected.slideToggle({
        always: function () {
            if ($('#prereq-list').children('li:not(.selected)').length === 1) {
                $('#prereq-list').prepend('<li style="display:none"><a> - none - </a></li>');
                $('#prereq-list>li:first-child').slideToggle();
            }
            $(this).remove();
        }
    });
    selected.each(function () {
        s.graph.dropEdges([$(this).data('id'), g.drawerNode].join());
    });
    startLayout();
}

function addPrereqs() {
    var selected = $('#prereq-list li.tentative');
    // set the elements to display: none
    selected.find('a.remove').hide();
    $('#prereq-confirm').hide(400);
    selected.css('background-color', '#323949');
    $('#prereq-list li.deactivated').css('background-color', '#323949');
    setTimeout(function () {
        // wait for bacground-color transition
        // get rid of the custom styling up above, after transition
        $('#prereq-list li.deactivated').removeAttr('style');
        selected.removeClass('tentative').removeAttr('style');
        toggleAddNewPrereqMode();
        var newIDs = selected.map(function () {
            return $(this).data('id');
        }).get();
        addEdges(newIDs, g.drawerNode);
        /* clearSecondarySelections();
         s.refresh({
             skipIndexation: true
         });
         */
        startLayout();
    }, 500);
}

function toggleAddNewPrereqMode() {
    s.secondaryMode = !s.secondaryMode;
    var txt = s.secondaryMode ? "- Select All New Prereqs -" : "- Create New Prereq -";
    // must get a synchronized reference to non-tentative li's before the async fadeOut()
    $.when($('#new-prereq>a').fadeOut(200, function () {
                $(this).text(txt);
            }).fadeIn(200),
            $('#prereq-list > li.tentative').slideUp(),
            $('#prereq-confirm').hide(400))
        .then(function () {
            console.log('hey');
            var $lis = $('#new-prereq').toggleClass('in-situ').siblings().not('.tentative');
            $('#prereq-list > li.tentative').remove();
            if (s.secondaryMode) {
                $lis.addClass('deactivated');
            } else {
                $lis.removeClass('deactivated');
            }
            $lis.find('a.remove').slideToggle();
            clearSecondarySelections();
            s.refresh({
                skipIndexation: true
            });
        });
}

function addEdges(source, target) {
    if (source.constructor == Array &&
        target.constructor != Array) {
        source.forEach(function (e) {
            s.graph.addEdge({
                source: e,
                target: target,
                id: [e, target].join(),
                type: (source === target) ? 'curvedArrow' : 'arrow',
                size: .5
            });
        });
    }
}

function clearSecondarySelections() {
    activeState.nodes().forEach(function (e) {
        if (e.id !== g.drawerNode) {
            activeState.dropNodes(e.id);
        }
    });
}

function arrowSpin() {
    var i = $('#close-left i');
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

function toggleEditMode() {
    editMode = !editMode;
    $('#container').toggleClass('edit-mode');

    $.when($('#prereq-list>li>a.remove').slideToggle(),
        $('#new-prereq').slideToggle(),
        $('#new-node').slideToggle()
    ).then(function () {
        $('#node-info-list').toggleClass('edit-mode');
    });
}


/*
 ** All static event bindings
 **
 */
(function () {
    // delegate due to dynamically generated prereqs 
    $('#prereq-list').on('click', 'li > a.remove > i', clickRemovePrereq);

    $('#close-left i').on('click', function () {
        leftSnapClose();
    });

    $('#close-right i').on('click', function () {
        rightSnapClose();
    });


    $('#wrench').on('click', function () {
        $(this).toggleClass('active');
        toggleEditMode();
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
            console.log("eye error");
        }
        startLayout();
    });

    $('#plus').on('click', function () {
        createNode();
    });

    $('#prereqs').on('click', function () {
        $('#node-info-list>ul.sub:not(#prereq-list)').hide();
        $('#prereq-list').toggle({
            duration: 300
        });
    });

    $('#new-prereq').on('click', function () {
        toggleAddNewPrereqMode();
    });

    $('#prereq-confirm').on('click', function () {
        if (s.secondaryMode) {
            addPrereqs();
        } else {
            removePrereqs();
        }
    })
})();


$(function () {
    startLayout();
});