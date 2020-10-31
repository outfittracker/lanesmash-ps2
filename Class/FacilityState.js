const Faction = require("./Faction");
const HTTPRequest = require("./Net/HTTPRequest");

class FacilityState {
    /**
     *
     * @param facilityId
     * @param connection
     */
    constructor(facilityId,connection) {

        this.facilityId         = facilityId;
        this.connection         = connection;
        this.controllingFaction = null;
        this.numberOfPoints     = 0;
        this.worldId            = 0;
        this.pointState         = [];
        this.name               = '';

        this.pointState[Faction.NC] = 0;
        this.pointState[Faction.TR] = 0;
        this.pointState[Faction.VS] = 0;
    }

    /**
     *
     * @return {Promise}
     */
    resolveCurrentState(){
        return HTTPRequest.request(process.env.OUTFIT_TRACKER_API+'services/facility/control?facilityId='+this.facilityId+'&serverId='+this.worldId).then(payload => {
            this.controllingFaction                     = parseInt(payload.data.faction)
            this.numberOfPoints                         = parseInt(payload.data.numberOfPoints);
            this.name                                   = payload.data.name;
            this.pointState[this.controllingFaction]    = this.numberOfPoints;
            console.log("LANE | State resolved for "+this.facilityId+" on "+this.worldId);
            this.sendUpdate(true);
        }).catch(err => {
            console.log("LANE | State resolve FAILED "+err);
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
        console.log("LANE | Sending payload "+json);
        this.connection.send(json);
        return true;
    }

    /**
     *
     * @return {Number|null}
     */
    factionTimerProgress(){
        if(!this.isFullySecured()){

            const trPoint = this.pointState[Faction.TR];
            const ncPoint = this.pointState[Faction.NC];
            const vsPoint = this.pointState[Faction.VS];

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
        this.pointState[faction] = Math.min(this.pointState[faction]+1,this.numberOfPoints);
        this.sendUpdate();
        return true;
    }

    /**
     *
     * @return {boolean}
     */
    isFullySecured(){
        return !this.isContestableBy(this.controllingFaction);
    }

    /**
     *
     * @param {Number} faction
     * @return {boolean}
     */
    isContestableBy(faction){
        return this.pointState[faction] < this.numberOfPoints;
    }

    /**
     *
     * @param {Number} faction
     * @return {boolean}
     */
    didSecure(faction){
        this.controllingFaction = faction;
        this.pointState[faction] = this.numberOfPoints;
        switch(faction){

            case Faction.NC:
                this.pointState[Faction.TR] = 0;
                this.pointState[Faction.VS] = 0;
                break;

            case Faction.TR:
                this.pointState[Faction.NC] = 0;
                this.pointState[Faction.VS] = 0;
                break;

            case Faction.VS:
                this.pointState[Faction.NC] = 0;
                this.pointState[Faction.TR] = 0;
                break;
        }

        return this.sendUpdate();
    }

}

module.exports = FacilityState;