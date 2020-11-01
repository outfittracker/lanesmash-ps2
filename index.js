/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

'use strict';
const LaneSmash = require("./Class/LaneSmash");
const ScreenLog = require("./Class/ScreenLog");
const dotenv = require('dotenv');
dotenv.config();
ScreenLog.init();

const ls = new LaneSmash();


process.stdin.resume();
process.on('SIGINT',function(){
    ls.stopServer();
    process.exit();
});

process.on('unhandledRejection', (reason, p) => {
    ScreenLog.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

try {

    ls.startServer().then(() => {
        ScreenLog.log("Server started");
    })
} catch (err) {
    ScreenLog.log("Error:", err);
}