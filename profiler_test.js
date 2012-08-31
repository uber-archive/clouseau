require("./profiler");

Profiler.enabled = true;
Profiler.init({displayInterval: 0, useMicrotime: true});

function tfib(n, callback) {
    setTimeout(__f(function() {
        fib(n, callback);
    }), 0);
}

function fib(n, callback) {
    if (n <= 2) {
        callback(1);
    } else {
        __f(tfib(n-1, __f(function(f1){
            __f(tfib(n-2, __f(function(f2){
                callback(f1 + f2);
            })));
        })));
    }
}
//console.log(process);

var n = process.argv[2];
console.log(n);
__f(fib(n, __f(function(f){
    console.log('fib(' + n + ') = ' + f);

    Profiler.display();
})));
