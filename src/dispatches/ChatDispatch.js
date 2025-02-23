import packet from '#packet';

class ChatDispatch {
    constructor(msg) {
        this.msg = msg;
    }

    check(bot) {
        if (!bot.state.joinedGame || (bot.lastChatTime + 3000) > Date.now()) { return false; }
        if (!bot.game.isPrivate && !bot.account.emailVerified && bot.account.accountAge < (1e3 * 60 * 60 * 12)) { return false }

        return true;
    }

    execute(bot) {
        console.log('Sending chat message:', this.msg);
        new packet.ChatPacket(this.msg).execute(bot.gameSocket);
        bot.lastChatTime = Date.now();
    }
}

export default ChatDispatch;