;
(function (undefined) {
    'use strict';

    if (typeof sigma === 'undefined')
        throw 'sigma is not declared';

    // Initialize package:
    sigma.utils.pkg('sigma.plugins');

    /**
     * Sigma Select
     * =============================
     *
     * @author Sébastien Heymann <seb@linkurio.us> (Linkurious)
     * @version 0.3
     *  Modified by Thomas Ruble for silly reasons
     */

    var _instance = {},
        _body = null,
        _nodeReference = null,
        _spacebar = false,
        _doubleClickingNodes = false;

    function difference(array, values) {
        var length = array ? array.length : 0;
        if (!length) {
            return [];
        }
        var index = -1,
            result = [],
            valuesLength = values.length;

        outer:
            while (++index < length) {
                var value = array[index];

                if (value === value) {
                    var valuesIndex = valuesLength;
                    while (valuesIndex--) {
                        if (values[valuesIndex] === value) {
                            continue outer;
                        }
                    }
                    result.push(value);
                } else if (values.indexOf(value) < 0) {
                    result.push(value);
                }
            }
        return result;
    }

    function keyDown(event) {
        _spacebar = event.which === 32;
        _body.removeEventListener('keydown', keyDown, false);
        _body.addEventListener('keyup', keyUp, false);
    }

    function keyUp(event) {
        _spacebar = false;
        _body.addEventListener('keydown', keyDown, false);
        _body.removeEventListener('keyup', keyUp, false);
    }


    /**
     * Select Object
     * ------------------
     *
     * @param  {sigma}                     s The related sigma instance.
     * @param  {sigma.plugins.activeState} a The activeState plugin instance.
     * @param  {?renderer}                 renderer The related renderer instance.
     *                                              Default value: s.renderers[0].
     * @param {?cb}                        cb a callback to be called whenever there is a change of active state
     * @param {?settings}                  for now, just a way to limit the quantity of active objects ('exclusive'  select)
     */
    function Select(s, a, r, cb, settings) {
        var
            self = this,
            renderer = r || s.renderers[0],
            mousemoveCount = 0,
            kbd = null,
            lasso = null,
            callback = cb,
            exclusive = settings.exclusive != undefined ? settings.exclusive : false;


        _body = _body || document.getElementsByTagName('body')[0];

        renderer.container.lastChild.addEventListener('mousedown', nodeMouseDown);
        renderer.container.lastChild.addEventListener('mouseup', nodeMouseUp);


        /**
         * Initialize with current active nodes. This method should be called if a
         * node is active before any mouse event.
         */
        this.init = function () {
            var nodes = a.nodes();
            if (nodes.length) {
                _nodeReference = nodes[0].id;
            }
        };

        function call_it(v) {
            if (callback !== undefined)
                callback(v);
        }

        /**
         * This fuction handles the node click event. The clicked nodes are activated.
         * All active nodes are deactivated if one of the active nodes is clicked.
         * The double-clicked nodes are activated.
         * If the Spacebar key is hold, it adds the nodes to the list of active
         * nodes instead of clearing the list. It clears the list of active edges. It
         * prevent nodes to be selected while dragging.
         *
         * @param {event} The event.
         */
        this.clickNodesHandler = function (event) {
            // Prevent nodes to be selected while dragging:
            if (mousemoveCount > 1) return;

            var targets = event.data.node.map(function (n) {
                return n.id;
            });

            var actives = a.nodes().map(function (n) {
                return n.id;
            });
            var newTargets = difference(targets, actives);

            /*
             ** ADDED MOD -- limits the quantity of selected nodes to 1
             ** This check kicks in when two overlapping nodes (e.g.) get clicked at once
             */
            if (exclusive) {
                newTargets = newTargets.slice(0, 1);
            }
            a.dropEdges();

            if (_spacebar || s.secondaryMode) {
                var existingTargets = difference(targets, newTargets);
                a.dropNodes(existingTargets);
            } else {
                if (actives.length > 1) {
                    a.addNodes(targets);
                }
                var activeNode = a.nodes()[0];
                if (activeNode != null) {
                    if (_nodeReference === activeNode.id) {
                        if (newTargets.length) {
                            a.dropNodes();
                            _nodeReference = null;
                            //call_it(newTargets);
                        } else {
                            setTimeout(function () {
                                if (!_doubleClickingNodes) {
                                    a.dropNodes();
                                    _nodeReference = null;
                                    s.refresh({
                                        skipIndexation: true
                                    });

                                    //      call_it(newTargets);
                                }
                            }, s.settings('doubleClickTimeout'));
                        }
                    } else {
                        _nodeReference = activeNode.id;
                        // call_it(newTargets);
                    }
                } else {
                    //call_it(newTargets);
                }
            }
            if (!_doubleClickingNodes) {
                if (exclusive && !s.secondaryMode) {
                    a.dropNodes();
                }

                a.addNodes(newTargets);
                s.refresh({
                    skipIndexation: true
                });
                call_it(newTargets);
            }
        };

        /**
         * Handle the flag 'doubleClickingNodes'.
         * Warning: sigma fires 'doubleClickNodes' before 'clickNodes'.
         */
        this.doubleClickNodesHandler = function (event) {
            _doubleClickingNodes = true;

            setTimeout(function () {
                _doubleClickingNodes = false;
            }, 100 + s.settings('doubleClickTimeout'));
        };

        /**
         * This fuction handles the edge click event. The clicked edges are activated.
         * The clicked active edges are deactivated.
         * If the Spacebar key is hold, it adds the edges to the list of active
         * edges instead of clearing the list. It clears the list of active nodes. It
         * prevent edges to be selected while dragging.
         *
         * @param {event} The event.
         */
        this.clickEdgesHandler = function (event) {
            // Prevent edges to be selected while dragging:
            if (mousemoveCount > 1) return;

            var targets = event.data.edge.map(function (e) {
                return e.id;
            });
            var actives = a.edges().map(function (e) {
                return e.id;
            });
            var newTargets = difference(targets, actives);

            a.dropNodes();

            if (_spacebar) {
                var existingTargets = difference(targets, newTargets);
                a.dropEdges(existingTargets);
            } else {
                a.dropEdges();
                if (actives.length > 1) {
                    a.addEdges(targets);
                }
            }

            a.addEdges(newTargets);
            s.refresh({
                skipIndexation: true
            });
        };

        // Select all nodes or deselect them if all nodes are active
        function spaceA() {
            a.dropEdges();

            if (a.nodes().length === s.graph.nodes().length) {
                a.dropNodes();
            } else {
                a.addNodes();
            }
            s.refresh({
                skipIndexation: true
            });
        }

        function nodeMouseMove() {
            mousemoveCount++;
        }

        function nodeMouseDown() {
            mousemoveCount = 0;
            renderer.container.lastChild.addEventListener('mousemove', nodeMouseMove);
        }

        function nodeMouseUp() {
            setTimeout(function () {
                mousemoveCount = 0;
                var n = a.nodes()[0];
                if (n && _nodeReference === null) {
                    _nodeReference = n.id;
                }
            }, 1);
            renderer.container.lastChild.removeEventListener('mousemove', nodeMouseMove);
        }

        // Deselect all nodes and edges
        function spaceU() {
            a.dropEdges();
            a.dropNodes();
            s.refresh({
                skipIndexation: true
            });
        }

        // Drop selected nodes and edges
        function spaceDel() {
            var nodes = a.nodes().map(function (n) {
                    return n.id;
                }),
                edges = a.edges().map(function (e) {
                    return e.id;
                });

            a.dropEdges(edges);
            a.dropNodes(nodes);

            if (nodes.length == s.graph.nodes().length) {
                s.graph.clear();
            } else {
                s.graph.dropEdges(edges);
                s.graph.dropNodes(nodes);
            }

            s.refresh();
        }

        // Select neighbors of selected nodes
        function spaceE() {
            a.addNeighbors();
            s.refresh({
                skipIndexation: true
            });
        }

        // Select isolated nodes (i.e. of degree 0)
        function spaceI() {
            a.dropEdges();
            a.setNodesBy(function (n) {
                return s.graph.degree(n.id) === 0;
            });
            s.refresh({
                skipIndexation: true
            });
        }

        // Select leaf nodes (i.e. nodes with 1 adjacent node)
        function spaceL() {
            a.dropEdges();
            a.setNodesBy(function (n) {
                return s.graph.adjacentNodes(n.id).length === 1;
            });
            s.refresh({
                skipIndexation: true
            });
        }

        s.bind('clickNodes', this.clickNodesHandler);
        s.bind('doubleClickNodes', this.doubleClickNodesHandler);
        s.bind('clickEdges', this.clickEdgesHandler);

        _body.addEventListener('keydown', keyDown, false);

        /**
         * Bind the select plugin to handle keyboard events.
         * @param  {sigma.plugins.keyboard} keyboard The keyboard plugin instance.
         */
        this.bindKeyboard = function (keyboard) {
            if (!keyboard) throw new Error('Missing argument: "keyboard"');

            kbd = keyboard;
            kbd.bind('32+65 18+32+65', spaceA);
            kbd.bind('32+85 18+32+85', spaceU);
            kbd.bind('32+46 18+32+46', spaceDel);
            kbd.bind('32+69 18+32+69', spaceE);
            kbd.bind('32+73 18+32+73', spaceI);
            kbd.bind('32+76 18+32+76', spaceL);
            return this;
        };

        /**
         * Clear event bindings to the keyboard plugin.
         */
        this.unbindKeyboard = function () {
            if (kbd) {
                kbd.unbind('32+65 18+32+65', spaceA);
                kbd.unbind('32+85 18+32+85', spaceU);
                kbd.unbind('32+46 18+32+46', spaceDel);
                kbd.unbind('32+69 18+32+69', spaceE);
                kbd.unbind('32+73 18+32+73', spaceI);
                kbd.unbind('32+76 18+32+76', spaceL);
                kbd = null;
            }
            return this;
        };

        // Update active nodes and edges and update the node reference.
        function lassoHandler(event) {
            var nodes = event.data;

            if (!nodes.length) {
                a.dropNodes();
                _nodeReference = null;
            } else {
                a.dropEdges();
                a.addNodes(nodes.map(function (n) {
                    return n.id;
                }));
                _nodeReference = a.nodes()[0].id;
            }
        };

        /**
         * Bind the select plugin to handle lasso events.
         * @param  {sigma.plugins.lasso} lasso The lasso plugin instance.
         */
        this.bindLasso = function (lassoInstance) {
            if (!lassoInstance) throw new Error('Missing argument: "lassoInstance"');

            lasso = lassoInstance;
            lasso.bind('selectedNodes', lassoHandler);
        };

        /**
         * Clear event bindings to the lasso plugin.
         */
        this.unbindLasso = function () {
            if (lasso) {
                lasso.unbind('selectedNodes', lassoHandler);
            }
        }

        /**
         * Clear all event bindings and references.
         */
        this.clear = function () {
            s.unbind('clickNodes', self.clickNodesHandler);
            s.unbind('doubleClickNodes', self.doubleClickNodesHandler);
            s.unbind('clickEdges', self.clickEdgesHandler);

            self.unbindKeyboard();
            self.unbindLasso();

            renderer.container.lastChild.removeEventListener('mousedown', nodeMouseDown);
            renderer.container.lastChild.removeEventListener('mouseup', nodeMouseUp);
            renderer.container.lastChild.removeEventListener('mousemove', nodeMouseMove);

            renderer = null;
            kbd = null;
        };
    }

    /**
     * Interface
     * ------------------
     */

    /**
     * This plugin enables the activation of nodes and edges by clicking on them
     * (i.e. selection). Multiple nodes or edges may be activated by holding the
     * Ctrl or Meta key while clicking on them (i.e. multi selection).
     *
     * @param  {sigma}                     s The related sigma instance.
     * @param  {sigma.plugins.activeState} a The activeState plugin instance.
     * @param  {?renderer}                 renderer The related renderer instance.
     *                                              Default value: s.renderers[0].
     */
    sigma.plugins.select = function (s, a, renderer, cb, settings) {
        // Create object if undefined
        if (!_instance[s.id]) {
            _instance[s.id] = new Select(s, a, renderer, cb, settings);

            s.bind('kill', function () {
                sigma.plugins.killSelect(s);
            });
        }

        return _instance[s.id];
    };

    /**
     *  This function kills the select instance.
     *
     * @param  {sigma} s The related sigma instance.
     */
    sigma.plugins.killSelect = function (s) {
        if (_instance[s.id] instanceof Select) {
            _instance[s.id].clear();
            delete _instance[s.id];
        }

        if (!_instance.length && _body) {
            _body.removeEventListener('keydown', keyDown, false);
            _body.removeEventListener('keyup', keyUp, false);
            _body = null;
        }
    };

}).call(this);