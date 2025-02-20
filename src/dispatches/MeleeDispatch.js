import packet from '#packet';

export default class MeleeDispatch {
    check(player) {
        return player.state.playing && !player.state.reloading && !player.state.swappingGun && !player.state.usingMelee
    }
    execute(player) {
        new packet.MeleePacket().execute(player.gameSocket);
        player.usingMelee = true;
        // gameloop every 33.33 (repeating) ms, 17 ticks, so 566.61 is the closest you get
        setTimeout(() => {
            player.usingMelee = false
            // new ChatDispatch('end melee, start swap gun').execute(player);
            player.swappingGun = true
            setTimeout(() => {
                player.swappingGun = false
                // new ChatDispatch('end swap gun').execute(player);
            }, 0.5 * player.state.weaponData.equipTime)
        }, 566.61);
    }
}