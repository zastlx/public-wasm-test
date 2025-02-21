import packet from '#packet';

export default class SwapWeaponDispatch {
    check(bot) {
        return bot.me.playing && !bot.state.reloading && !bot.state.swappingGun && !bot.state.usingMelee;
    }

    execute(bot) {
        bot.me.weapon = +!bot.me.weapon;
        new packet.SwapWeaponPacket(bot.me.weapon).execute(bot.gameSocket);
    }
}