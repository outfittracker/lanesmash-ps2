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