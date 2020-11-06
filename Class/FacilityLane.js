/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const FacilityState     = require("./FacilityState");
const Faction           = require("./Faction");
const Capture           = require("./Objects/Capture");
const ScreenLog = require("./ScreenLog");

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
        /**
         *
         * @type {number}
         */
        this.continent = 0;

        /**
         *
         * @type {Number[]}
         */
        this.factionList = [];
    }

    /**
     *
     * @param {String[]} stack
     * @param connection
     * @param startBases
     * @param {Number} continentId
     * @return {Promise}
     */
    registerFacilityStack(connection,stack,startBases,continentId){
        ScreenLog.log("Register new lane");
        this.connection         = connection;
        this.continent          = continentId;
        this.facilitiesIds      = stack.map(s => parseInt(s));
        this.startBases         = startBases;
        this.factionList        = Object.keys(this.startBases).map(m => parseInt(m));
        return this.setupData().then(() => {
            ScreenLog.log("Lane setup done");
            this.printDebug();
        });
    }

    /**
     *
     * @return {Promise}
     */
    setupData(){
        this.facilities.length = 0;
        return Promise.all(this.facilitiesIds.map(facilityId => {
            const fc = new FacilityState(facilityId,this.connection,this.factionList);
            ScreenLog.log("Adding "+facilityId+" to the lane");

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
    /**
     *
     * @param {Capture|BaseObject} capture
     * @return {boolean}
     */
    didSecure(capture){
        if(capture.zoneId !== this.continent){
            return false;
        }
        const state = this.getStateForFacilityId(capture.facilityId);
        if(state){
            ScreenLog.log(state.name+" "+Faction.name(capture.newFactionId)+" did capture");
            return state.didSecure(capture.newFactionId,capture.type === Capture.Defense);
        }
        return false;
    }

    /**
     *
     * @param {ExperienceStack[]} expStacks
     * @return {boolean}
     */
    didContest(expStacks){
        expStacks.forEach(stack => {
            if(stack.zoneId !== this.continent || stack.faction === null){
                return false; // Wrong continent, null faction id oO ?
            }
            const state = this.getContestableFacility(stack.faction);
            if(state && this.isFactionValid(stack.faction)){
                ScreenLog.log(state.name+" ("+Faction.name(stack.faction)+") did contest ("+stack.stack.length+" ticks)");
                return state.didContest(stack.faction);
            }

            ScreenLog.log("no contestable facility");
            ScreenLog.log("state "+(state ? "yes" : "no"));
        });
        return false;
    }

    /**
     *
     * @param {Number} faction
     * @return {null|FacilityState}
     */
    getStartBase(faction){
        const facilityId = this.startBases[String(faction)];
        return this.getStateForFacilityId(facilityId);
    }

    /**
     *
     * @param {Number} faction
     * @return {null|FacilityState}
     */
    getContestableFacility(faction){
        const laneDirection = this.facilities.indexOf(this.getStartBase(faction)) === 0 ? 1 : -1;
        for(let i=0;i<this.facilities.length;i++){
            const index         = laneDirection === 1 ? i : this.facilities.length-1-i;
            const facility      = this.facilities[index];
            ScreenLog.log(facility.name +" ("+Faction.name(facility.controllingFaction)+") check");
            // La base suivante ou précédente doit apartenir à une autre faction (ou neutral), tous les points doivent être sécurisé
            // et la base sélectionnée doit composer des points capturables par la faction reçue
            if(this.hasPointAvailableForCapture(facility,faction)){
                return facility;
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

        if(facility.isControllerBy(byFaction)){
            return !facility.areAllPointsSecured(byFaction);
        }

        const isStartBase       = parseInt(this.startBases[String(byFaction)]) === facility.facilityId;

        const prevBase          = facility.getPreviousBase(this.facilities);
        const nextBase          = facility.getNextBase(this.facilities);

        const gotPrevBase       = prevBase ? prevBase.isControllerBy(byFaction) : false;
        const gotNextBase       = nextBase ? nextBase.isControllerBy(byFaction) : false;
        const nextIsSecured     = nextBase ? nextBase.areAllPointsSecured(byFaction) : true;
        const prevIsSecured     = prevBase ? prevBase.areAllPointsSecured(byFaction) : true;

        const linkActive        = gotNextBase || gotPrevBase;
        const linkSecured       = nextIsSecured || prevIsSecured;

        return ((linkActive && linkSecured) || isStartBase) && !facility.areAllPointsSecured(byFaction);
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

    /**
     *
     */
    printDebug(){

        let header = [
            "Base","Owner","A Timer","D Timer","Secured","Points"
        ];

        this.factionList.forEach(fx => {
            header.push(Faction.name(fx));
            header.push("Contestable by "+Faction.name(fx));
        });


        let data = [header];

        this.facilities.forEach(f => {
            const defTimer = f.defenseTimer;
            const atkTimer = f.attackTimer;
            let lt = [
               "{bold}"+f.name+"{/}",
               "{"+Faction.color(f.controllingFaction)+"-bg}"+Faction.name(f.controllingFaction)+"{/}",
               atkTimer ? "{"+Faction.color(atkTimer)+"-bg}"+Faction.name(atkTimer)+"{/}" : "{black-bg}No{/}",
               defTimer ? "{"+Faction.color(defTimer)+"-bg}"+Faction.name(defTimer)+"{/}" : "{black-bg}No{/}",
               f.areAllPointsSecured(f.controllingFaction) ? "{green-bg}Yes{/}" : "{black-bg}No{/}",
               String(f.numberOfPoints),
           ];
            this.factionList.forEach(fx => {
                lt.push(String(f.pointState[String(fx)]));
                lt.push(this.hasPointAvailableForCapture(f,fx) ? "{green-bg}Yes{/}" : "{black-bg}No{/}");
            })

            data.push(lt);
        });
        ScreenLog.update(data);
    }

}

module.exports = FacilityLane;