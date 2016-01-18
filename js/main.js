var Graph = (function () {
    /*  A wrapper around the Sigma.graph class
     *  
     */

    var id = 0;

    function staticID() {
        return id;
    }

    function Graph() {
        this.id = "g" + id++;
        this.nodes = [];
        this.edges = [];
        this.drawerNode = null;
    }
    Graph.prototype.getStaticID = staticID;
    Graph.prototype.addEdge = function (source, target) {
        var e = new Edge(source, target);
        if (typeof e.id !== 'undefined') {
            this.edges.push(e);
            return e;
        } else {
            return null;
        }
    };
    Graph.prototype.addNode = function (x, y) {
        var n = new Node(x, y);
        this.nodes.push(n);
        return n;
    };

    return Graph;
})();

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
        return id;
    };

    function Node(x, y) {
        var clr = cs[(Math.random() * C) | 0].color;
        this.color = clr;
        this.id = 'n' + id++;
        this.name = 'CS' + (id + 10) * 10;
        this.size = 1; // to be set by sigma global settings
        this.x = typeof x !== 'undefined' ? x : 10;
        this.y = typeof y !== 'undefined' ? y : 10;
        this.glyphs = [{
            position: 'center',
            textColor: '#fff',
            fillColor: clr,
            }];
        this.glyphs[0].content = this.name;
        return this;
    }
    Node.prototype.getStaticId = static_id;
    return Node;
})();

var Edge = (function () {
    var edgeCache = [];
    var generateEdgeID = (source, target) => [source, target].join();

    function Edge(source, target) {
        // return undefined if duplicate or (after a very naive check) circular
        var tentativeID = this.genID(source, target);

        // TODO : Implement edge-chasing algo to find circular dependencies
        if ((source === target) ||
            ($.inArray(tentativeID,
                edgeCache) != -1) ||
            ($.inArray([target, source].join(),
                edgeCache) != -1)) {
            this.id = undefined;
            return undefined;
        } else {
            this.source = source;
            this.target = target;
            this.id = tentativeID;
            this.type = "arrow";
            edgeCache.push(this.id);
            return this;
        }
        // not reached
    }
    Edge.prototype.size = .5;
    Edge.prototype.genID = generateEdgeID;
    return Edge;
})();


MySigma = (function () {
    var layoutEnum = Object.freeze({
        Fruchterman: 0,
        Dagre: 1
    });

    function MySigma(settings, domManager) {
        var _that = this;
        this.domManager = (typeof domManager !== 'undefined') ? domManager : {};
        this.drawerNode = null;
        this.s = new sigma(settings);
        this.a = sigma.plugins.activeState(this.s);
        this.g = settings.graph;
        this.secondaryMode = false;
        this.layoutStyle = layoutEnum.Dagre;
        this.selectCallback = function (target) {
            //console.log(that);
            if (target.constructor === Array) {
                target = target[0];
            }
            if (!_that.secondaryMode) {
                if (target === undefined ||
                    target.length === 0 && _that.drawerNode !== null) {
                    domManager.leftSnapClose();
                } else {
                    _that.drawerNode = target;
                    domManager.setDrawerContent(_that.s.graph.nodes(target));
                    domManager.leftSnapOpen();
                }
            } else { // secondary mode == addition of new prereqs
                domManager.handleTentativePrereq(target);
            };
        };
        //var secondaryActiveState = sigma.plugins.activeState(s);


        // The following private var's are only declared for the sake of configuring sigma plugins
        var glyphRenderer = this.s.renderers[0];
        glyphRenderer.bind('render', function (e) {
            glyphRenderer.glyphs();
        });
        var selectANode = sigma.plugins.select(this.s, this.a, glyphRenderer, this.selectCallback, {
            exclusive: true
        });
        var frListener = sigma.layouts.fruchtermanReingold.configure(this.s, {
            iterations: 500,
            easing: 'quadraticInOut',
            duration: 800
        });
        var dagreListener = sigma.layouts.dagre.configure(this.s, {
            directed: true, // take edge direction into account
            rankdir: 'LR', // Direction for rank nodes. Can be TB, BT, LR, or RL,
            // where T = top, B = bottom, L = left, and R = right.
            easing: 'cubicInOut', // animation transition function
            duration: 800, // animation duration
            boundingBox: {
                minX: 10,
                maxX: 15,
                minY: 5,
                maxY: 10
            } // constrain layout bounds ; object or true (all current positions of the given nodes)
        });
    };
    MySigma.prototype.startLayout = function () {
        switch (this.layoutStyle) {
        case layoutEnum.Dagre:
            sigma.layouts.dagre.start(this.s);
            break;
        case layoutEnum.Fruchterman:
            sigma.layouts.fruchtermanReingold.start(this.s);
            break;
        default:
            console.log("something went wrong with the layout switch");
        }
    }

    MySigma.prototype.getActives = function () {
        var actives = [];
        if (this.secondaryMode) {
            // in secondary mode, we want every active node except the main selected one
            actives = this.a.nodes().map(function (e) {
                if (e.id !== this.drawerNode) {
                    return e.id;
                }
            });
        } else {
            actives = this.a.nodes();
        }
    };
    MySigma.prototype.getNode = function (id) {
        return s.graph.nodes(id);
    };
    MySigma.prototype.createNode = function () {
        console.log(this);
        var n = this.g.addNode();
        this.s.graph.addNode(n);
        this.a.dropNodes();
        this.a.addNodes(n.id);
        this.selectCallback(n.id);
        this.s.refresh();
        this.startLayout();
    };
    MySigma.prototype.reset = function () {
        this.drawerNode = null;
        this.s.secondaryMode = false;
        this.a.dropNodes();
        this.s.refresh({
            skipIndexation: true
        });
    };
    MySigma.prototype.getPrereqs = function (node) {
        var prereqs = [], s = this.s;
        s.graph.edges().forEach(function (v, i, a) {
            if (v.target === node.id) {
                prereqs.push(s.graph.nodes(v.source));
            }
        });
        return prereqs;
    };
    MySigma.prototype.genEdgeID = function (source, target) {
        return [source, target].join();
    };
    MySigma.prototype.removeEdge = function (head, prereqs) {
        //var _that = this;
        prereqs.forEach(function (v) {
            var id = this.genEdgeID(v,head);
            console.log(id);
            this.s.graph.dropEdges(id);
        }, this);
    };
    MySigma.prototype.addEdges = function (sources, target) {
        // safety check --
        $.makeArray(sources);
        target = (typeof target === 'undefined') ? this.drawerNode : target;
        sources.forEach(function (source) {
            e = g.addEdge(source, target);
            if (e !== null) {
                s.graph.addEdge(e);
            } else {
                console.log("Cannot add edge from " + source + " to " + target);
            }
        });
    };
    MySigma.prototype.toggleLayout = function () {
        switch (this.layoutStyle) {
        case layoutEnum.Dagre:
            this.layoutStyle = layoutEnum.Fruchterman;
            break;
        case layoutEnum.Fruchterman:
            this.layoutStyle = layoutEnum.Dagre;
            break;
        default:
            console.log("eye error");
        }
        this.startLayout();
    }
    MySigma.prototype.toggleSecondaryMode = function () {
        this.secondaryMode = !this.secondaryMode;
        return this.secondaryMode;
    };
    MySigma.prototype.clearSecondarySelections = function () {
        this.a.dropNodes();
        this.a.addNodes(this.drawerNode);
        this.s.refresh({
            skipIndexation: true
        });
    };

    return MySigma;
})();

domManager = {
    // MUST initiate an instance of the custom sigma-wrapper
    editMode: false,
    init: function (sigmaInstance) {
        this.s = sigmaInstance;
    },
    setDrawerContent: function (node) {
        $('#left-main .drawer-title').fadeOut(200, function () {
            $(this).text(node.name);
        }).fadeIn(200);

        this.initDrawerContent();
        this.setPrereqs(node);
    },
    handleTentativePrereq: function (nodeID) {
        // Called from the selectCallback
        // when in 'secondary-mode', when multiple nodes can be selected
        var tentatives = s.getActives();
        // in case of deselect
        if (nodeID === undefined) {
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
        } else
        // Ordinary positive selection of a single node
        {
            $(genPrereqLi(s.getNode(nodeID), 'tentative')).prependTo($('#prereq-list'))
                .hide().show(300);
        }
        if (tentatives.length > 0) {
            $('#prereq-confirm').show(300);
        } else {
            $('#prereq-confirm').hide(300);
        }

    },
    setPrereqs: function (node) {
        var prereqs = s.getPrereqs(node);
        var list = '';
        var _that = this;
        $('#prereq-list li:not(#new-prereq)').remove();

        if (prereqs.length > 0) {
            prereqs.forEach(function (v) {
                list += _that.genPrereqLi(v);
            });
        } else {
            list = '<li><a class="none"> - none - </a></li>';
        }
        $('#prereq-list').prepend(list);
    },
    initDrawerContent: function () {
        $('.sublist-confirm').hide(200);
        $('#node-info-list>ul.sub').hide(200);
    },
    genPrereqLi: function (node, cls) {
        var ret = '',
            c = cls == undefined ? '""' : cls;
        ret += '<li data-id="' + node.id + '" class="' + c + '">'
        ret += '<a href="#" class="heading">' + node.name;
        ret += '</a><a class="remove edit-opt"><i class="fa fa-remove fa-lg">';
        ret += '</i></a></li>';
        return ret;
    },
    clickRemovePrereq: function () {
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
    },
    confirmRemovePrereqs: function () {
        var selected = $('#prereq-list li.selected');
        var nodeIDs = selected.map(function () {
            return $(this).data('id');
        }).get();
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
        
        console.log(nodeIDs);
        s.removeEdge(this.s.drawerNode, nodeIDs);
        s.startLayout();
    },
    leftSnapClose: function () {
        this.arrowSpin();
        snapper.enable();
        setTimeout(function () {
            snapper.close('left');
            $('#toolbar').detach().appendTo($('#outside-container'));
        }, 300);
        this.initDrawerContent();
        this.s.reset();
    },
    leftSnapOpen: function () {
        if (snapper.state().state !== 'closed') {
            this.arrowSpin();
            return;
        }

        $('#toolbar').detach().appendTo($('#outside-container'));
        snapper.open('left');
        this.arrowSpin();
        snapper.disable();
    },
    confirmPrereqs: function () {
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
            this.toggleAddNewPrereqMode();
            var newIDs = selected.map(function () {
                return $(this).data('id');
            }).get();
            this.s.addEdges(newIDs);
            this.s.startLayout();
        }, 500);
    },
    toggleAddNewPrereqMode: function () {
        var sm = s.toggleSecondaryMode;
        var txt = sm ? "- Select All New Prereqs -" : "- Create New Prereq -";
        // must get a synchronized reference to non-tentative li's before the async fadeOut()
        $.when($('#new-prereq>a').fadeOut(200, function () {
                    $(this).text(txt);
                }).fadeIn(200),
                $('#prereq-list > li.tentative').slideUp(),
                $('#prereq-confirm').hide(400))
            .then(function () {
                var $lis = $('#new-prereq').toggleClass('in-situ').siblings().not('.tentative');
                $('#prereq-list > li.tentative').remove();
                if (s.secondaryMode) {
                    $lis.addClass('deactivated');
                } else {
                    $lis.removeClass('deactivated');
                }
                $lis.find('a.remove').slideToggle();
                s.clearSecondarySelections();
            });
    },
    arrowSpin: function () {
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
    },
    toggleEditMode: function () {
        this.editMode = !this.editMode;
        $('#container').toggleClass('edit-mode');

        $.when($('#prereq-list>li>a.remove').slideToggle(),
            $('#new-prereq').slideToggle(),
            $('#new-node').slideToggle()
        ).then(function () {
            $('#node-info-list').toggleClass('edit-mode');
        });
    }
}


//  Initiate and populate dummy data 
var s = (function () {
    var i,
        s,
        o,
        N = 30,
        E = 25,
        d = 0.5,
        g = new Graph();

    for (i = 0; i < N; i++) {
        var x = 100 * Math.cos(2 * i * Math.PI / N),
            y = 100 * Math.sin(2 * i * Math.PI / N);
        g.addNode(x, y);
    }

    for (i = 0; i < E; i++) {
        var source = 'n' + (Math.random() * N | 0),
            target = 'n' + (Math.random() * N | 0);
        // skip cases where node is its own prereq

        e = g.addEdge(source, target);
        if (e == null) {
            i--;
            continue;
        }
    }
    s = new MySigma({
            renderer: {
                container: document.getElementById('graph-container'),
                type: 'canvas'
            },
            graph: g,
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
        },
        domManager);
    domManager.init(s);
    //s.s.refresh();
    return s;
})();


/*
 ** All static event bindings
 **
 */
(function () {
    // delegate due to dynamically generated prereqs 
    $('#prereq-list').on('click', 'li > a.remove > i', domManager.clickRemovePrereq);

    $('#close-left i').on('click', function () {
        domManager.leftSnapClose();
    });

    $('#close-right i').on('click', function () {
        domManager.rightSnapClose();
    });


    $('#wrench').on('click', function () {
        $(this).toggleClass('active');
        domManager.toggleEditMode();
    });


    $('#eye').on('click', function () {
        s.toggleLayout();
    });

    $('#plus').on('click', function () {
        s.createNode();
    });

    $('#prereqs').on('click', function () {
        $('#node-info-list>ul.sub:not(#prereq-list)').hide();
        $('#prereq-list').toggle({
            duration: 300
        });
    });

    $('#new-prereq').on('click', function () {
        domManager.toggleAddNewPrereqMode();
    });

    $('#prereq-confirm').on('click', function () {
        if (s.secondaryMode) {
            domManager.confirmAddPrereqs();
        } else {
            domManager.confirmRemovePrereqs();
        }
    })
})();


$(function () {
    s.startLayout();
});