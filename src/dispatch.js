import packet from '#packet';

class SpawnDispatch {
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

class ChatDispatch {
    constructor(msg) {
        this.msg = msg;
    }
    check(player) {
        return (player.state.joinedGame && (player.lastChatTime + 3000) < Date.now());
    }
    execute(player) {
        console.log('Sending chat message:', this.msg);
        new packet.ChatPacket(this.msg).execute(player.gameSocket);
        player.lastChatTime = Date.now();
    }
}

class ReloadDispatch {
    check(player) {
        return player.state.playing
    }
    execute(player) {
        new packet.ReloadPacket().execute(player.gameSocket);
        player.reloading = true;
        setTimeout(() => player.reloading = false, 2000); // TODO: yes
    }
}

class FireDispatch {
    check(player) {
        return player.state.playing && player.state.weapons[player.state.weapon].ammo > 0;
    }
    execute(player) {
        new packet.FirePacket(player).execute(player.gameSocket);
    }
}

class SwapWeaponDispatch {
    check(player) {
        return player.state.playing && !player.state.reloading;
    }
    execute(player) {
        new packet.SwapWeaponPacket(player).execute(player.gameSocket);
    }
}

export default {
    ChatDispatch,
    FireDispatch,
    ReloadDispatch,
    SpawnDispatch,
    SwapWeaponDispatch
}