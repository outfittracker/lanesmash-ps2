/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const FacilityState = require("./FacilityState");

class FacilityLane {

    constructor() {
        /**
         *
         * @type {FacilityState[]}
         */
        this.facilities = [];
        this.facilitiesIds = [];
    }

    /**
     *
     * @param {String[]} stack
     * @param connection
     * @return {Promise}
     */
    registerFacilityStack(connection,stack){
        console.log("LANE | Register new lane");
        this.connection = connection;
        this.facilitiesIds = stack;
        return this.setupData();
    }

    /**
     *
     * @return {Promise<>}
     */
    setupData(){
        this.facilities.length = 0;
        return Promise.all(this.facilitiesIds.map(facilityId => {
            console.log("LANE | Adding "+facilityId+" to the lane");
            const fc = new FacilityState(parseInt(facilityId),this.connection);
            this.facilities.push(fc);
            return fc.resolveCurrentState();
        }));
    }

    /**
     *
     * @param {Capture} capture
     * @return {boolean}
     */
    didSecure(capture){
        const state = this.getStateForFacilityId(capture.facilityId);
        if(state){
            console.log("LANE | Did secure "+capture.facilityId+" for faction "+capture.newFactionId);
            return state.didSecure(capture.newFactionId);
        }
        return false;
    }

    /**
     *
     * @param {ExperienceGain} expGain
     * @return {boolean}
     */
    didContest(expGain){
        const faction = expGain.getFaction();
        const state = this.getContestableFacility(faction);
        if(state){
            console.log("LANE | Did contest "+faction+", selected facility "+state.facilityId);
            return state.didContest(faction);
        }
        return false;
    }

    /**
     *
     * @param {Number} faction
     * @return {null|FacilityState}
     */
    getContestableFacility(faction){
        for(let i=0;i<this.facilities.length;i++){

            const prevBase = i > 0 ? this.facilities[i-1] : null;
            const nextBase = i < this.facilities.length-2 ? this.facilities[i+1] : null;

            const prevBaseNotOwned = prevBase && prevBase.controllingFaction !== faction && prevBase.isFullySecured();
            const nextBaseNotOwned = nextBase && nextBase.controllingFaction !== faction && nextBase.isFullySecured();

            // La base suivante ou précédente doit apartenir à une autre faction (ou neutral), tous les points doivent être sécurisé
            // et la base sélectionnée doit composer des points capturables par la faction reçue
            if((prevBaseNotOwned || nextBaseNotOwned) && this.facilities[i].isContestableBy(faction)){
                return this.facilities[i];
            }
        }
        return null; // Une team se fait rouler dessus ?
    }

    /**
     *
     * @param {Number} facilityId
     * @return {null|FacilityState}
     */
    getStateForFacilityId(facilityId){
        return this.facilities.find(
            fc => fc.facilityId === facilityId
        );
    }

    /**
     *
     * @return {Promise}
     */
    reset(){
        return this.setupData();
    }
}

module.exports = FacilityLane;