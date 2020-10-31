/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const Faction = {
    NC: 2,
    VS: 1,
    TR: 3,
    name: function(id){
        switch(id){
            case Faction.NC: return 'NC';
            case Faction.VS: return 'VS';
            case Faction.TR: return 'TR';
            default: return 'NT';
        }
    }
}



module.exports = Faction;