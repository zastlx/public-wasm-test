import packet from '#packet';

export default class SpawnDispatch {
    check(player) {
        if (!player.state.playing) {
            if (player.lastDeathTime + 6000 < Date.now()) { return true; }
        }

        // console.log("Dispatch failed: < 6s since last spawn");

        return false;
    }
    execute(player) {
        new packet.RespawnPacket().execute(player.gameSocket);
        player.lastSpawnedTime = Date.now();
        player.state.playing = true;
    }
}