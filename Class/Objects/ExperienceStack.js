/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

class ExperienceStack {

    /**
     *
     * @param {ExperienceGain|BaseObject} exp
     * @private
     */
    constructor(exp) {
        /**
         *
         * @type {ExperienceGain[]|BaseObject[]}
         */
        this.stack = [exp];
        this.startDate = exp.timestamp;
        this.faction = exp.getFaction();
        this.zoneId = exp.zoneId;
    }

    /**
     *
     * @param {ExperienceGain|BaseObject} exp
     * @return {boolean}
     * @private
     */
    _didGroup(exp){
        if(
            exp.timestamp === this.startDate &&
            this.faction === exp.getFaction() &&
            this.zoneId === exp.zoneId
        ){
            this.stack.push(exp);
            return true;
        }
        return false;
    }

    /**
     *
     * @return {boolean}
     * @private
     */
    _canFlush(){
        const dt = (new Date()).getTime()/1000-this.startDate;
        return dt > 2;
    }

    /**
     *
     * @param {ExperienceGain} exp
     * @return {boolean}
     * @public
     */
    static joinGroup(exp){
        for(let i=0;i<ExperienceStack.stack.length;i++){
            if(ExperienceStack.stack[i]._didGroup(exp)){
                return true;
            }
        }
        ExperienceStack.stack.push(new ExperienceStack(exp));
        return true;
    }

    /**
     *
     * @return {ExperienceStack[]}
     * @public
     */
    static getFlushQueue(){
        let toFlush = [];
        ExperienceStack.stack = ExperienceStack.stack.filter(group => {
            if(group._canFlush()){
                toFlush.push(group);
                return false;
            }
            return true;
        })
        return toFlush;
    }

}

/**
 *
 * @type {ExperienceStack[]}
 * @private
 */
ExperienceStack.stack = [];
/**
 *
 * @type {number}
 * @private
 */
module.exports = ExperienceStack;