import packet from '#packet';

export default class ChatDispatch {
    constructor(msg) {
        this.msg = msg;
    }
    check(player) {
        return (player.state.joinedGame && (player.lastChatTime + 3000) < Date.now());
    }
    execute(player) {
        console.log('Sending chat message:', this.msg);
        new packet.ChatPacket(this.msg).execute(player.gameSocket);
        player.lastChatTime = Date.now();
    }
}