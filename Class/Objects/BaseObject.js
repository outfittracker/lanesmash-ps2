/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

class BaseObject {
    /**
     *
     * @param payload
     */
    constructor(payload) {
        this.worldId = parseInt(payload.world_id);
        this.timestamp = parseInt(payload.timestamp);
        this.zoneId = parseInt(payload.zone_id);
    }
}

module.exports = BaseObject;