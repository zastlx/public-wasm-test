export default class LookAtDispatch {
    constructor(yaw, pitch) {
        this.yaw = yaw;
        this.pitch = pitch;
    }

    check(player) {
        return player.state.playing;
    }

    execute(player) {
        if (this.yaw) { player.state.view.yaw = this.yaw; }
        if (this.pitch) { player.state.view.pitch = this.pitch; }
    }
}