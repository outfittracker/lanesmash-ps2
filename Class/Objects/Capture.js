/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const BaseObject = require("./BaseObject");

class Capture extends BaseObject {
    /**
     *
     * @param payload
     */
    constructor(payload) {

        super(payload);
        this.outfitId       = payload.outfit_id;
        this.facilityId     = parseInt(payload.facility_id);
        this.durationHeld   = parseInt(payload.duration_held);
        this.newFactionId   = parseInt(payload.new_faction_id) < 4 ? parseInt(payload.new_faction_id) : null;
        this.oldFactionId   = parseInt(payload.old_faction_id) < 4 ? parseInt(payload.old_faction_id) : null;
        this.type           = (this.newFactionId !== this.oldFactionId ? Capture.Attack : Capture.Defense);
    }
}

Capture.Attack = 0;
Capture.Defense = 1;

module.exports = Capture;