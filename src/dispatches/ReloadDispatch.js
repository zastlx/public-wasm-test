import packet from '#packet';

export default class ReloadDispatch {
    check(player) {
        return player.state.playing
    }
    execute(player) {
        new packet.ReloadPacket().execute(player.gameSocket);

        const isLongTime = player.state.weapons[player.state.weapon].ammo.rounds < 1;
        const weaponData = player.state.weaponData;

        player.reloading = true;
        setTimeout(() => player.reloading = false, isLongTime ? weaponData.longReloadTime : weaponData.shortReloadTime);
    }
}