import packet from '#packet';

export default class SpawnDispatch {
    check(bot) {
        return bot.me.playing;
    }

    execute(bot) {
        new packet.PausePacket().execute(bot.gameSocket);
        setTimeout(() => bot.me.playing = false, 3000); 
    }
}