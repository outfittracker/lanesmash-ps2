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
     * @param {Number} facilityId
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
            this.setControlledPoints(f,0)
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
            ScreenLog.log(this.name+" ("+Faction.name(this.controllingFaction)+") resolved");
            this.resetPoints(this.controllingFaction)
            this._sendUpdate(true);
        }).catch(err => {
            ScreenLog.log("State resolve FAILED "+err);
        });
    }

    /**
     *
     * @param init
     * @return {boolean}
     * @private
     */
    _sendUpdate(init = false){
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
     * @param {Number|Null} faction
     * @return {boolean}
     * @private
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

            const trPoint = this.isFactionValid(Faction.TR) ? this.getControlledPoints(Faction.TR) : 0;
            const ncPoint = this.isFactionValid(Faction.NC) ? this.getControlledPoints(Faction.NC) : 0;
            const vsPoint = this.isFactionValid(Faction.VS) ? this.getControlledPoints(Faction.VS) : 0;

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
     * @param {Number|String} faction
     * @return {Number}
     */
    getControlledPoints(faction){
        return this.pointState[String(faction)];
    }

    /**
     *
     * @param {Number} faction
     * @param {Number} pointCount
     */
    setControlledPoints(faction, pointCount){
        this.pointState[String(faction)] = Math.min(Math.max(pointCount,0),this.numberOfPoints);
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
            if(this.getControlledPoints(f) > 0){
                this.didUntagPoint(f)
            }
        });

        const factionTag = this.factionTimerProgress();
        if(factionTag){
            if(this.isControllerBy(factionTag)){
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

        this._sendUpdate();
        return true;
    }

    /**
     *
     * @param {Number} faction
     */
    resetPoints(faction){
        if(faction !== null){
            this.setControlledPoints(faction,this.numberOfPoints);
        }
        this.factionList.filter(f => f !== faction).forEach(fc => {
            this.setControlledPoints(fc,0);
        });
    }

    /**
     *
     * @param {Number} faction
     * @private
     */
    didTagPoint(faction){
        this.setControlledPoints(faction,this.getControlledPoints(faction)+1);
        ScreenLog.log(this.name+" ("+Faction.name(faction)+") flipped a point "+this.getControlledPoints(faction)+"/"+this.numberOfPoints);
    }

    /**
     *
     * @param {Number} faction
     * @private
     */
    didUntagPoint(faction){
        this.setControlledPoints(faction,this.getControlledPoints(faction)-1)
    }

    /**
     *
     * @return {boolean}
     */
    areAllPointsSecured(byFaction){
        return this.getControlledPoints(byFaction) === this.numberOfPoints;
    }

    /**
     *
     * @param {Number|Null} faction
     * @param {Boolean} isDefense
     * @return {boolean}
     */
    didSecure(faction,isDefense = false){
        ScreenLog.log(this.name+" "+(isDefense ? "defended" : "captured")+" by "+Faction.name(faction));
        this.controllingFaction = faction;
        this.resetPoints(faction);
        this.attackTimer = null;
        this.defenseTimer = null;
        return this._sendUpdate();
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