/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

class ExperienceStack {


    /**
     *
     * @param {ExperienceGain|BaseObject} exp
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
     */
    canGroup(exp){
        if(
            exp.timestamp-this.startDate < ExperienceStack.groupTimer &&
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
     */
    canFlush(){
        const dt = parseInt((new Date()).getTime()/1000)-this.startDate;
        return dt > ExperienceStack.groupTimer;
    }

    /**
     *
     * @param {ExperienceGain} exp
     * @return {boolean}
     */
    static joinGroup(exp){
        for(let i=0;i<ExperienceStack.stack.length;i++){
            const st = ExperienceStack.stack[i];
            if(st.canGroup(exp)){
                return true;
            }
        }
        const gp = new ExperienceStack(exp);
        ExperienceStack.stack.push(gp);
        return false;
    }

    /**
     *
     * @return {ExperienceStack[]}
     */
    static getFlushQueue(){
        let toFlush = [];
        ExperienceStack.stack = ExperienceStack.stack.filter(group => {
            if(group.canFlush()){
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
 */
ExperienceStack.stack = [];
ExperienceStack.groupTimer = 5;
module.exports = ExperienceStack;