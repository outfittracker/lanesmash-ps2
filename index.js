'use strict';
const LaneSmash = require("./Class/LaneSmash");
const ls = new LaneSmash();

process.stdin.resume();
process.on('SIGINT',function(){
    ls.stopServer();
    process.exit();
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

try {

    ls.startServer().then(() => {
        console.log("Server started");
    })
} catch (err) {
    console.log("Error:", err);
}