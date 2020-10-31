/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const FacilityState     = require("./FacilityState");
const Faction           = require("./Faction");
const Capture           = require("./Objects/Capture");

/**
 *
 */
class FacilityLane {

    /**
     *
     */
    constructor() {
        /**
         *
         * @type {FacilityState[]}
         */
        this.facilities = [];
        /**
         *
         * @type {Number[]}
         */
        this.facilitiesIds = [];
        /**
         *
         * @type {{}}
         */
        this.startBases = {}
    }

    /**
     *
     * @param {String[]} stack
     * @param connection
     * @param startBases
     * @return {Promise}
     */
    registerFacilityStack(connection,stack,startBases = {}){
        console.log("LANE | Register new lane");
        this.connection         = connection;
        this.facilitiesIds      = stack.map(s => parseInt(s));
        this.startBases         = startBases;
        this.factionList        = Object.keys(this.startBases).map(m => parseInt(m));
        return this.setupData();
    }

    /**
     *
     * @return {Promise}
     */
    setupData(){
        this.facilities.length = 0;
        return Promise.all(this.facilitiesIds.map(facilityId => {
            console.log("LANE | Adding "+facilityId+" to the lane");
            const fc = new FacilityState(facilityId,this.connection,this.factionList);
            this.facilities.push(fc);
            return fc.resolveCurrentState();
        }));
    }

    /**
     *
     * @param {Number|Null} faction
     * @return {boolean}
     */
    isFactionValid(faction){
        return faction === null || this.factionList.indexOf(faction) >= 0;
    }

    /**
     *
     * @param {Capture} capture
     * @return {boolean}
     */
    didSecure(capture){
        const state = this.getStateForFacilityId(capture.facilityId);
        if(state && this.isFactionValid(state.controllingFaction)){
            console.log(state.name+" -"+Faction.name(capture.newFactionId)+") did capture");
            return state.didSecure(capture.newFactionId,capture.type === Capture.Defense);
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
        if(faction !== null){
            const state = this.getContestableFacility(faction);
            if(state && this.isFactionValid(faction)){
                console.log(state.name+" ("+Faction.name(faction)+") did contest");
                return state.didContest(faction);
            }
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
            console.log(this.facilities[i].name +" ("+Faction.name(this.facilities[i].controllingFaction)+") check");
            // La base suivante ou précédente doit apartenir à une autre faction (ou neutral), tous les points doivent être sécurisé
            // et la base sélectionnée doit composer des points capturables par la faction reçue
            if(this.hasPointAvailableForCapture(this.facilities[i],faction)){
                return this.facilities[i];
            }
        }
        return null; // Une team se fait rouler dessus ?
    }

    /**
     *
     * @param {FacilityState} facility
     * @param {Number} byFaction
     * @return {boolean}
     */
    hasPointAvailableForCapture(facility,byFaction){

        if(facility.controllingFaction === byFaction){
            return facility.hasPointToCap(byFaction);
        }

        const isStartBase       = parseInt(this.startBases[String(byFaction)]) === facility.facilityId;

        const prevBase          = facility.getPreviousBase(this.facilities);
        const nextBase          = facility.getNextBase(this.facilities);

        const gotPrevBase       = prevBase ? prevBase.isControllerBy(byFaction) : false;
        const gotNextBase       = nextBase ? nextBase.isControllerBy(byFaction) : false;
        const nextIsSecured     = nextBase ? nextBase.isFullySecured() : true;
        const prevIsSecured     = prevBase ? prevBase.isFullySecured() : true;

        const linkActive        = gotNextBase || gotPrevBase;
        const linkSecured       = nextIsSecured || prevIsSecured;

        return ((linkActive && linkSecured) || isStartBase) && facility.hasPointToCap(byFaction);
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

    printDebug(){
        const data = this.facilities.map(f => {
            const defTimer = f.defenseTimer;
            const atkTimer = f.attackTimer;
            const lt = {
                "Base": f.name,
                "Owner": Faction.name(f.controllingFaction),
                "A Timer": atkTimer ? Faction.name(atkTimer) : false,
                "D Timer": defTimer ? Faction.name(defTimer) : false,
                "Contested": !f.isFullySecured(),
                "Points": f.numberOfPoints,
            }
            this.factionList.forEach(fx => {
                lt[Faction.name(fx)] = f.pointState[String(fx)];
                lt["Contestable by "+Faction.name(fx)] = this.hasPointAvailableForCapture(f,fx);
            })
            return lt;
        })

        console.table(data)
    }

}

module.exports = FacilityLane;