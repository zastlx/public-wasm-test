import packet from '#packet';

export default class ReloadDispatch {
    check(bot) {
        return bot.me.playing && !bot.state.reloading && !bot.state.swappingGun && !bot.state.usingMelee;
    }

    execute(bot) {
        new packet.ReloadPacket().execute(bot.gameSocket);

        const isLongTime = bot.me.weapons[bot.me.weapon].ammo.rounds < 1;
        const weaponData = bot.me.weaponData;

        bot.state.reloading = true;
        setTimeout(() => bot.state.reloading = false, isLongTime ? weaponData.longReloadTime : weaponData.shortReloadTime);
    }
}