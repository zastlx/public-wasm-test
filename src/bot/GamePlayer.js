export default class GamePlayer {
    constructor(id, team, playerData) {
        this.id = id;
        this.team = team;
        this.name = playerData.name_;

        this.data = playerData;

        this.joinedGame = true;
        this.playing = false;
        this.position = {
            x: this.data.x_,
            y: this.data.y_,
            z: this.data.z_
        };

        this.jumping = false;
        this.climbing = false;

        this.view = {
            yaw: this.data.yaw_,
            pitch: this.data.pitch_
        };

        this.weapon = this.data.weaponIdx_;
        this.weapons = [
            { ammo: {} },
            { ammo: {} }
        ];
        this.weaponData = this.data.weaponData;
        this.grenades = 0;

        this.buffer = {
            0: {},
            1: {},
            2: {}
        };

        this.kills = 0;
        this.hp = 100;

        this.hpShield = 0;
        this.streakRewards = [];

        this.randomSeed = 0;
        this.serverStateIdx = 0;
    }
}