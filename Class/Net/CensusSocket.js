/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const SocketClient          = require('../Net/SocketClient');
const schedule              = require('node-schedule');
const ExperienceGain        = require("../Objects/ExperienceGain");
const Capture               = require("../Objects/Capture");



class CensusSocket {

    /**
     *
     */
    constructor() {
        this.env = process.env.PS2_ENV;
        this.client = null;
        this.eventCount = 0;
        this.dataCallback = null;
    }
    /**
     *
     * @returns {Promise}
     */
    start(dataCallback){
        this.dataCallback = dataCallback;
        return new Promise(resolve => {

            if(this.client){
                this.client.close();
            }

            this.client = new SocketClient(() => {
                console.log("Uplink websocket connected");

                this.unsubscribeAll();
                this.startListening().then(resolve);
                setTimeout(() => { // si pas de traffic au bout de 5s on reboot
                    schedule.scheduleJob('*/20 * * * * *',() => {
                        if(!this.eventReceived()){
                            return this.start(dataCallback);
                        }
                    });
                },10000);

                setInterval(() => {
                    return this.startListening();
                },60000);

            },json => {
                this.incomingMessage(json);
            },() => {
                CensusSocket.ready = false;
            },this.env);

            this.client.connect();
        });
    }

    stop(){
        console.log("Stopping SocketSubscriber");
        this.unsubscribeAll();
        return this.client.close();
    }

    /**
     *
     * @returns {boolean}
     */
    eventReceived(){
        const d = this.eventCount > 0;
        this.eventCount = 0;
        return d;
    }

    /**
     *
     * @returns {Promise}
     */
    startListening(){
        return new Promise(resolve => {
            // Wait before sending the first cmd,
            // idk why it's sometimes necessary
            return setTimeout(() => {
                this.client.send({
                    "service":      "event",
                    "action":       "subscribe",
                    "characters":   ["all"],
                    "worlds":       [String(process.env.WORLD_ID)],
                    "eventNames":   CensusSocket.getEventListenedIds()
                });
                CensusSocket.ready = true;
                resolve();
            },1000);
        });
    }

    static getEventListenedIds(){
        return [
            CensusSocket.EVENT_FACILITY_CONTROL,
            'GainExperience_experience_id_'+CensusSocket.XPEvent.PulseDef,
            'GainExperience_experience_id_'+CensusSocket.PulseCap,
            'GainExperience_experience_id_'+CensusSocket.PointContest
        ];
    }


    /**
     *
     */
    unsubscribeAll(){
        console.log("Unsubscribing everything ");
        this.client.send({
            "service":      "event",
            "action":       "unsubscribe",
            "characters":   ["all"],
            "worlds":       ["all"],
            "eventNames":   ["all"]
        });
    }

    /**
     *
     * @param json
     */
    incomingMessage(json){
        const payload = json.payload;
        const worldId = parseInt(process.env.WORLD_ID);
        this.eventCount++;
        if(payload && payload.event_name){
            switch(payload.event_name) {
                case CensusSocket.EVENT_FACILITY_CONTROL:
                    if(parseInt(payload.zone_id) > 1000){ // filter weird data received from socket
                        return false;
                    }
                    if(parseInt(payload.world_id) !== worldId){
                        return false;
                    }
                    return this.dataCallback(new Capture(payload));
                case CensusSocket.EVENT_GAIN_EXPERIENCE:
                    if(parseInt(payload.world_id) !== worldId){
                        return false;
                    }
                    return this.dataCallback(new ExperienceGain(payload));
            }
        }
    }


}
CensusSocket.ready = false;
CensusSocket.EVENT_GAIN_EXPERIENCE           = "GainExperience";
CensusSocket.EVENT_FACILITY_CONTROL          = "FacilityControl";
CensusSocket.XPEvent = {
    PointContest: 272,
    PulseDef: 556,
    PulseCap: 557,
}
module.exports = CensusSocket;