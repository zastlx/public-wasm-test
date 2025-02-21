import packet from '#packet';

export default class ReloadDispatch {
    check(bot) {
        return bot.me.playing && !bot.state.reloading && !bot.state.swappingGun && !bot.state.usingMelee;
    }

    execute(bot) {
        new packet.ReloadPacket().execute(bot.gameSocket);

        const activeWeapon = bot.me.weapons[bot.me.activeGun];
        const isLongTime = activeWeapon.ammo.rounds < 1;

        bot.state.reloading = true;
        setTimeout(() => bot.state.reloading = false, isLongTime ? activeWeapon.longReloadTime : activeWeapon.shortReloadTime);
    }
}