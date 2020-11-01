/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */
const blessed = require("blessed");
class ScreenLog {


    static init(){
        ScreenLog.screen = blessed.screen({
            // Example of optional settings:
            smartCSR: true,
        });

        ScreenLog.screen.title = 'LaneScript';
        ScreenLog.table = blessed.table({
            top: '0%',
            left: 'center',
            width: '100%',
            height: '50%',
            border: {
                type: 'line'
            },
        });
        ScreenLog.text = blessed.textarea({
            top: '0%',
            left: 'center',
            width: '100%',
            height: '50%',
            border: {
                type: 'line'
            },
        });

        ScreenLog.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
            return process.exit(0);
        });

        //ScreenLog.screen.append(ScreenLog.table)
        ScreenLog.screen.append(ScreenLog.text)
        ScreenLog.table.focus();
        ScreenLog.screen.render();
    }

    static update(data){
        ScreenLog.screen.render();
    }

    static log(string){
        ScreenLog.text.insertBottom(string);
        ScreenLog.text.setScrollPerc(100);
        ScreenLog.screen.render();
    }
}

module.exports = ScreenLog;