/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const Faction = require("./Faction");
const HTTPRequest = require("./Net/HTTPRequest");
const ScreenLog = require("./ScreenLog");

class FacilityState {
    /**
     *
     * @param facilityId
     * @param connection
     * @param {Number[]}factionList
     */
    constructor(facilityId,connection,factionList) {

        this.facilityId         = facilityId;
        this.connection         = connection;
        this.controllingFaction = null;
        this.numberOfPoints     = 0;
        this.worldId            = 0;
        this.pointState         = {};
        this.name               = '';
        this.factionList        = factionList
        this.attackTimer        = null;
        this.defenseTimer       = null;

        this.factionList.forEach(f => {
            this.pointState[String(f)] = 0;
        });
    }

    /**
     *
     * @return {Promise}
     */
    resolveCurrentState(){
        return HTTPRequest.request(process.env.OUTFIT_TRACKER_API+'services/facility/control?facilityId='+this.facilityId+'&serverId='+process.env.WORLD_ID).then(payload => {
            this.controllingFaction                     = parseInt(payload.data.faction) < 4 ? parseInt(payload.data.faction) : null
            this.numberOfPoints                         = parseInt(payload.data.numberOfPoints);
            this.worldId                                = parseInt(payload.data.worldId);
            this.name                                   = payload.data.name;

            if(this.controllingFaction > 0){
                this.pointState[String(this.controllingFaction)] = this.numberOfPoints;
            }

            ScreenLog.log(this.name+" ("+Faction.name(this.controllingFaction)+") resolved");
            this.sendUpdate(true);
        }).catch(err => {
            ScreenLog.log("State resolve FAILED "+err);
        });
    }

    /**
     *
     * @param init
     * @return {boolean}
     */
    sendUpdate(init = false){
        const factionTimer = this.factionTimerProgress();
        const payload = {
            type:                   'LaneFacilityState',
            worldId:                this.worldId,
            facilityId:             this.facilityId,
            running:                factionTimer !== null,
            controllingFaction:     this.controllingFaction,
            attackingFaction:       factionTimer,
            capturablePoints:       this.numberOfPoints,
            controlledPoints:       this.pointState,
            name:                   this.name,
            init:                   init
        };
        const json = JSON.stringify(payload);
        this.connection.send(json);
        return true;
    }

    /**
     *
     * @param faction
     * @return {boolean}
     */
    isFactionValid(faction){
        return faction === null || this.factionList.indexOf(faction) >= 0;
    }

    /**
     *
     * @return {Number|null}
     */
    factionTimerProgress(){
        if(!this.areAllPointsSecured(this.controllingFaction)){

            const trPoint = this.isFactionValid(Faction.TR) ? this.pointState[String(Faction.TR)] : 0;
            const ncPoint = this.isFactionValid(Faction.NC) ? this.pointState[String(Faction.NC)] : 0;
            const vsPoint = this.isFactionValid(Faction.VS) ? this.pointState[String(Faction.VS)] : 0;

            if(trPoint > ncPoint && trPoint > vsPoint){
                return Faction.TR;
            }
            if(vsPoint > ncPoint && vsPoint > trPoint){
                return Faction.VS;
            }
            if(ncPoint > trPoint && ncPoint > vsPoint){
                return Faction.NC;
            }
        }
        return null;
    }

    /**
     *
     * @param {Number} faction
     * @return {boolean}
     */
    didContest(faction){

        ScreenLog.log(this.name+" contested by "+Faction.name(faction));

        this.didTagPoint(faction);
        const stack = Object.keys(this.pointState).filter(
            k => parseInt(k) !== faction
        );

        stack.forEach(opFaction => {
            const f = parseInt(opFaction);
            const currentPoint = this.pointState[opFaction];
            if(currentPoint > 0){
                this.didUntagPoint(f)
            }
        });

        const factionTag = this.factionTimerProgress();
        if(factionTag){
            if(factionTag === this.controllingFaction){
                ScreenLog.log("Defender timer running for "+Faction.name(factionTag)+" on "+this.name);
                this.defenseTimer = factionTag;
                this.attackTimer = null;
            }
            else{
                ScreenLog.log("Attacker timer running for "+Faction.name(factionTag)+" on "+this.name);
                this.defenseTimer = null;
                this.attackTimer = factionTag;
            }
        }


        this.sendUpdate();
        return true;
    }

    /**
     *
     * @param {Number} faction
     */
    didTagPoint(faction){
        this.pointState[String(faction)] = Math.min(this.pointState[faction]+1,this.numberOfPoints);
        ScreenLog.log(this.name+" ("+Faction.name(faction)+") did tag a point "+this.pointState[String(faction)]+"/"+this.numberOfPoints);
    }

    /**
     *
     * @param {Number} faction
     */
    didUntagPoint(faction){
        this.pointState[String(faction)] = Math.max(this.pointState[faction]-1,0);
    }

    /**
     *
     * @return {boolean}
     */
    areAllPointsSecured(byFaction){
        return this.pointState[String(byFaction)] === this.numberOfPoints;
    }

    /**
     *
     * @param {Number} faction
     * @return {boolean}
     */
    hasPointToCap(faction){
        //console.log(this.name+" ("+Faction.name(faction)+') got '+this.pointState[String(faction)]+"/"+this.numberOfPoints+" points");
        return !this.areAllPointsSecured(faction);
    }

    /**
     *
     * @param {Number|Null} faction
     * @param isDefense
     * @return {boolean}
     */
    didSecure(faction,isDefense = false){

        ScreenLog.log(this.name+" "+(isDefense ? "defended" : "captured")+" by "+Faction.name(faction));
        this.controllingFaction = faction;
        if(faction !== null){
            this.pointState[String(faction)] = this.numberOfPoints;
        }
        this.factionList.filter(f => f !== faction).forEach(fc => {
            this.pointState[String(fc)] = 0;
        })
        this.attackTimer = null;
        this.defenseTimer = null;
        return this.sendUpdate();
    }

    /**
     *
     * @param {FacilityState[]} stack
     * @return {FacilityState|null}
     */
    getPreviousBase(stack){
        const index = stack.indexOf(this);
        return index > 0 ? stack[index-1] : null;
    }

    /**
     *
     * @param {FacilityState[]} stack
     * @return {FacilityState|null}
     */
    getNextBase(stack){
        const index = stack.indexOf(this);
        return index < stack.length-2 ? stack[index+1] : null;
    }

    /**
     *
     * @param {Number} faction
     * @return {boolean}
     */
    isControllerBy(faction){
        return this.controllingFaction === faction;
    }

}

module.exports = FacilityState;