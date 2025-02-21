import packet from '#packet';

export default class ReportPlayerDispatch {
    constructor(idOrName, reasons = {}) {
        if (typeof idOrName == 'number') {
            this.id = idOrName
        } else if (typeof idOrName == 'string') {
            this.name = idOrName
        }

        this.reasons = [
            !!reasons.cheating,
            !!reasons.harassment,
            !!reasons.offensive,
            !!reasons.other
        ]

        if (!this.reasons.includes(true)) {
            this.reasons[3] = true;
        }

        for (let i = 0; i < this.reasons.length; i++) {
            if (this.reasons[i] == true) {
                this.reasonInt |= (1 << i);
            }
        }
    }
    check(player) {
        return !!player.game
    }
    execute(player) {
        let target;

        if (this.id !== 'undefined') {
            target = player.state.players[this.id.toString()];
        } else if (this.name !== 'undefined') {
            target = player.state.players.find(player => player.name == this.name);
        }

        if (!target) { throw new Error('target player for ReportPlayerDispatch not found') }

        new packet.ReportPacket(target, this.reasonInt).execute(player.gameSocket);
    }
}