import packet from '#packet';

export default class ChatDispatch {
    constructor(msg) {
        this.msg = msg;
    }

    check(bot) {
        return (bot.state.joinedGame && (bot.lastChatTime + 3000) < Date.now());
    }

    execute(bot) {
        console.log('Sending chat message:', this.msg);
        new packet.ChatPacket(this.msg).execute(bot.gameSocket);
        bot.lastChatTime = Date.now();
    }
}