var Profiler = require("../lib/clouseau");

Profiler.enabled = true;
Profiler.init({displayInterval: 0, useMicrotime: true});
var __f = Profiler.__f;

function tfib(n, callback) {
    setTimeout(__f(function() {
        fib(n, callback);
    }), 0);
}

function fib(n, callback) {
    if (n <= 2) {
        callback(1);
    } else {
        tfib(n-1, __f(function(f1){
            tfib(n-2, __f(function(f2){
                callback(f1 + f2);
            }));
        }));
    }
}

var n = process.argv[2];
console.log(n);
fib(n, __f(function(f){
    console.log('fib(' + n + ') = ' + f);

    console.log(Profiler.getFormattedData());
}));
