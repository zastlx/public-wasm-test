export default class LookAtDispatch {
    idOrName;

    constructor(idOrName) {
        if (typeof idOrName == 'number') {
            this.id = idOrName
        } else if (typeof idOrName == 'string') {
            this.name = idOrName
        }
        console.log(this)
    }

    check(player) {
        return player.state.playing;
    }

    execute(player) {
        let target;

        if (this.id !== 'undefined') {
            target = player.state.players[this.id.toString()];
        } else if (this.name !== 'undefined') {
            target = player.state.players.find(player => player.name == this.name);
        }

        console.log(target);
    }
}