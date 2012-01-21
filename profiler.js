var microtime = require('microtime');

Profiler = {
    tree: {
        name: "main",
        count: 1,
        elapsed: 0,
        children: {}
    },
    scope: null,
    totals: {},
    displayInterval: 30000, // 30 seconds
    minPercent: 0,
    enabled: false,

    init: function(options) {
        if (this.enabled) {
            if (options) {
                if (options.displayInterval >= 1000) {
                    this.displayInterval = options.displayInterval;
                }
                if (options.minPercent >= 0 && options.minPercent < 100) {
                    this.minPercent = options.minPercent;
                }
            }
    
            this.scope = this.tree;
    
            this.assignClassNames();
    
            setTimeout(this.display.bind(this), this.displayInterval);
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
                parent: this.scope
            });
            
        node.started = microtime.nowDouble();
        this.scope = node;
    },
    exit: function() {
        var node = this.scope;
        var elapsed = microtime.nowDouble() - node.started;

        node.elapsed += elapsed;
        node.count++;

        var total = this.totals[node.name] ? this.totals[node.name] :
            (this.totals[node.name] = {
                name: node.name,
                elapsed: 0,
                count:0
            });
        total.elapsed += elapsed;
        total.count++;

        this.scope = node.parent;
        
        if (this.scope == undefined) {
            console.log(this.scope.started);
        }
    },
    displayTime: function(t) {
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
    displayNode: function(node, indent, total) {
        var percent = 100 * node.elapsed / total;

        if (percent >= this.minPercent) {

            // calculate local time: my elapsed less children's elapsed
            var local = node.elapsed;
            var childrenArr = this.sort(node.children);
            for (var i = 0; i < childrenArr.length; i++) {
                local = local - childrenArr[i].elapsed;
            }

            console.log(indent + percent.toFixed(2) + '%: ' +
                        node.name +
                        ' (' + node.count +
                        ', ' + this.displayTime(node.elapsed / node.count) +
                        ', ' + this.displayTime(local / node.count) +
                        ')');

            for (var i = 0; i < childrenArr.length; i++) {
                this.displayNode(childrenArr[i], indent + "  ", node.elapsed);
            }
        }
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
    assignClassNames: function() {
        var g = global;

        for(var name in g) {
            var thing = g[name];
            if ((typeof thing == "function") && thing.prototype && (thing.prototype.ClassName == "anonymous")) {
                thing.prototype.ClassName = name;
            }
        }
    },
    display: function() {
        console.log('');
        console.log('Profiler Output:');
        console.log('--------------------------------------------------------------------');

        // calculate total elapsed
        this.tree.elapsed = 0;
        for (var i in this.tree.children) {
            this.tree.elapsed += this.tree.children[i].elapsed;
        }

        // Tree View
        this.displayNode(this.tree, "", this.tree.elapsed);


        console.log('--------------------------------------------------------------------');
        // Totals View
        var totalsArr = this.sortAvg(this.totals);
        for(var i = 0; i < totalsArr.length; i++) {
            var total = totalsArr[i];

            var percent = 100 * total.elapsed / this.tree.elapsed;

            if (percent >= this.minPercent) {
                console.log(percent.toFixed(2) + '%: ' + total.name + ' (' + total.count +
                        ', ' + this.displayTime(total.elapsed / total.count) + ')');
            }
        }

        console.log('');

        setTimeout(this.display.bind(this), this.displayInterval);
    }
};

/*
USAGE:
var X = {
    doSomething: function(x) {
        __f("X.onDoSomethingComplete", function() {
            return 5 * x;
        });

        return x * x;
    }
}
*/
function __profile(name, f) {
    if (Profiler.enabled) {
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
        return f;
    }
}