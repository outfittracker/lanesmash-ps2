/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const Faction = require("../Faction");
const BaseObject = require("./BaseObject");

class ExperienceGain extends BaseObject {
    /**
     *
     * @param payload
     */
    constructor(payload) {
        super(payload);
        this.eventId        = parseInt(payload.experience_id);
        this.loadoutId      = parseInt(payload.loadout_id);
        this.playerId       = payload.character_id;
        this.otherId        = payload.other_id;
        this.amount         = parseInt(payload.amount);
    }

    /**
     *
     * @return {Number|Null}
     */
    getFaction(){
        switch(this.loadoutId) {
            case 1: case 3: case 4: case 5: case 6: case 7:
                return Faction.NC;
            case 15: case 18: case 17: case 19: case 21: case 20:
                return Faction.VS;
            case 8: case 11: case 10: case 12: case 14: case 13:
                return Faction.TR;
        }
        return null;
    }
}

module.exports = ExperienceGain;