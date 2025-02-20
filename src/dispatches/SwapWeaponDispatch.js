import packet from '#packet';

export default class SwapWeaponDispatch {
    check(player) {
        return player.state.playing && !player.state.reloading;
    }
    execute(player) {
        player.state.weapon = +!player.state.weapon;
        new packet.SwapWeaponPacket(player).execute(player.gameSocket);
    }
}