/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const SocketServer = require("./Net/SocketServer");
const CensusSocket = require("./Net/CensusSocket");
const FacilityLane = require("./FacilityLane");
const Capture = require("./Objects/Capture");
const ExperienceGain = require("./Objects/ExperienceGain");

class LaneSmash {

    constructor() {
        this.censusSocket = null;
        /**
         *
         */
        this.lane = new FacilityLane();
    }

    /**
     *
     * @return {Promise<void>}
     */
    startServer(){
        this.censusSocket = new CensusSocket();
        return this.censusSocket.start(data => {
            this.didReceiveServerPayload(data);
        }).then(() => {
            SocketServer.start((connection,endpoint,json) => {
                if(endpoint === 'lanesmash'){
                    console.log('Facility API message');
                    this.didReceiveClientPayload(connection,json);
                }
            },(connection,endpoint) => {
                if(endpoint === 'lanesmash'){

                }
            })
        })
    }

    stopServer(){
        this.censusSocket.stop();
        SocketServer.stop();
    }

    /**
     *
     * @param connection
     * @param payload
     */
    didReceiveClientPayload(connection,payload){
        if(payload){
            if(payload.subscribe){
                this.registerLane(connection,payload.subscribe.facilities).then(() => {
                    return this.sendSuccess(connection);
                });
            }
            else if(json.reset){
                this.resetLane().then(() => {
                    return this.sendSuccess(connection);
                });
            }
        }
    }

    /**
     *
     * @param connection
     * @return {boolean|void}
     */
    sendSuccess(connection){
        return connection.send(JSON.stringify({
            success: true
        }));
    }

    /**
     *
     * @param connection
     * @param facilityStack
     * @return {Promise}
     */
    registerLane(connection,facilityStack){
        return this.lane.registerFacilityStack(connection,facilityStack)
    }

    /**
     *
     * @return {Promise}
     */
    resetLane(){
        return this.lane.reset();
    }

    /**
     *
     * @param {Capture|ExperienceGain} data
     * @return {Boolean}
     */
    didReceiveServerPayload(data){
        if(data instanceof Capture){
            return this.lane.didSecure(data);
        }
        else if(data instanceof ExperienceGain){
            return this.lane.didContest(data)
        }
        return false;
    }
}

module.exports = LaneSmash;