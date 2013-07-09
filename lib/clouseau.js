var Profiler = {
    tree: {
        name: "main",
        count: 1,
        elapsed: 0,
        children: {}
    },
    scope: null,
    totals: {},
    minPercent: 0,
    enabled: false,

    getTick: function() {
        var t = process.hrtime();
        return t[0] + t[1] / 1000000000.0;
    },
    init: function(options) {
        if (this.enabled) {
            if (options) {
                if (options.minPercent >= 0 && options.minPercent < 100) {
                    this.minPercent = options.minPercent;
                }
            }

            this.scope = this.tree;

            this.assignClassNames();

            this.initialized = true;
        }
    },
    enter: function(name) {
        if (!this.initialized) {
            this.init();
        }

        var node = this.scope.children[name] ? this.scope.children[name] :
            (this.scope.children[name] = {
                name: name,
                count: 0,
                elapsed: 0,
                children: {},
                chidrenElapsed: 0,
                parent: this.scope
            });

        node.started = this.getTick();
        node.childrenElapsed = 0;
        this.scope = node;
    },
    exit: function() {
        var node = this.scope;
        var elapsed = this.getTick() - node.started;

        node.elapsed += elapsed;
        if (node.parent) {
            node.parent.childrenElapsed += elapsed;
        }
        node.count++;

        var total = this.totals[node.name] ? this.totals[node.name] :
            (this.totals[node.name] = {
                name: node.name,
                elapsed: 0,
                localElapsed: 0,
                count:0
            });
        total.elapsed += elapsed;
		total.localElapsed += (elapsed > node.childrenElapsed) ? (elapsed - node.childrenElapsed) : 0;
        total.count++;

        this.scope = node.parent;

        if (this.scope == undefined) {
            console.log(this.scope.started);
        }
    },
    getFormattedData: function() {
        var lines = [];

        // Calculate total elapsed
        this.tree.elapsed = 0;
        for (var i in this.tree.children) {
            this.tree.elapsed += this.tree.children[i].elapsed;
        }

        // Tree View
        this.getFormatNodeData(lines, this.tree, "", this.tree.elapsed);

        lines.push('--------------------------------------------------------------------');

        // Totals View
        var totalsArr = this.sortLocal(this.totals);
        for(var i = 0; i < totalsArr.length; i++) {
            var total = totalsArr[i];
            var percent = 100 * total.localElapsed / this.tree.elapsed;

            if (percent >= this.minPercent) {
                lines.push(percent.toFixed(4) + '%: ' + total.name + ' (' + total.count +
                        ', ' + this.formatElapsedTime(total.localElapsed / total.count) + ')');
            }
        }

        lines.push('');

        return lines.join("\n");
    },
    getFormatNodeData: function(lines, node, indent, total) {
        var percent = 100 * node.elapsed / total;

        if (percent >= this.minPercent) {

            // Calculate local time: my elapsed less children's elapsed
            var local = node.elapsed;
            var childrenArr = this.sort(node.children);
            for (var i = 0; i < childrenArr.length; i++) {
                local = local - childrenArr[i].elapsed;
            }

            lines.push(indent + percent.toFixed(2) + '%: ' +
                    node.name +
                    ' (' + node.count +
                    ', ' + this.formatElapsedTime(node.elapsed / node.count) +
                    ', ' + this.formatElapsedTime(local / node.count) +
                    ')');

            for (var i = 0; i < childrenArr.length; i++) {
                this.getFormatNodeData(lines, childrenArr[i], indent + "  ", node.elapsed);
            }
        }
    },
    formatElapsedTime: function(t) {
        if (t < 0.000001) {
            return (t*1000000000).toFixed(2) + 'ns';
        }
        if (t < 0.001) {
            return (t*1000000).toFixed(2) + 'mcs';
        }
        if (t < 1) {
            return (t*1000).toFixed(2) + 'ms';
        }
        if (t < 60) {
            return (t).toFixed(2) + 's';
        }
        if (t < 3600) {
            return (t/60).toFixed(2) + 'min';
        }
        return (t/3600).toFixed(2) + 'hr';
    },
    sortAvg: function(o) {
        var a = [];
        for(var i in o) {
            var total = o[i];
            if (total.count) {
                a.push(total);
            }
        }
        a.sort(function(t1, t2) {
            return (t2.elapsed /t2.count - t1.elapsed /t1.count);
        });
        return a;

    },
    sort: function(o) {
        var a = [];
        for(var i in o) {
            var total = o[i];
            if (total.count) {
                a.push(total);
            }
        }
        a.sort(function(t1, t2) {
            return (t2.elapsed - t1.elapsed);
        });
        return a;

    },
    sortLocal: function(o) {
        var a = [];
        for(var i in o) {
            var total = o[i];
            if (total.count) {
                a.push(total);
            }
        }
        a.sort(function(t1, t2) {
            return (t2.localElapsed - t1.localElapsed);
        });
        return a;

    },
    assignClassNames: function() {
        var g = global;

        for(var name in g) {
            var thing = g[name];
            if ((typeof thing == "function") && thing.prototype && (thing.prototype.ClassName == "anonymous")) {
                thing.prototype.ClassName = name;
            }
        }
    }
};

var fnLocHash = {};

function __f(fn) {
    if (Profiler.enabled) {
        var key = __f.caller.toString().length + "," + fn.toString.length;
        if(!fnLocHash[key]) {
            var err = new Error('');
            var callerLine = err.stack.split("\n")[2];
            var index1 = callerLine.lastIndexOf("/");
            var index2 = callerLine.lastIndexOf(":");
            fnLocHash[key] = (__f.caller.name || "anonymous ") + callerLine.substr(index1 + 1, index2 - index1 - 1);
        }
        var name = fnLocHash[key];

        return function() {
            try {
                Profiler.enter(name);

                var ret = fn.apply(this, arguments);
            } catch(e) {
                Profiler.exit();

                throw(e);
            }

            Profiler.exit();

            return ret;
        }
    } else {
        return fn;
    }
};

module.exports = Profiler;
module.exports.__f = __f;

/*
USAGE:
var X = {

    callSomeAsync(param1, param2, __f(function() {
        // callback code
    }));


    doSomething: function(x) {
        __f(function() {
            return 5 * x;
        });

        return x * x;
    }
}
*/
