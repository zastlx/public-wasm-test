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

class MeleeDispatch {
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

class ReloadDispatch {
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

class SwapWeaponDispatch {
    check(player) {
        return player.state.playing && !player.state.reloading;
    }
    execute(player) {
        player.state.weapon = +!player.state.weapon;
        new packet.SwapWeaponPacket(player).execute(player.gameSocket);
    }
}

class MovementDispatch {
    constructor(controlKeys) {  
        if (typeof controlKeys == typeof 0) {
            this.controlKeys = controlKeys;
        } else if (typeof controlKeys == typeof []) {
            this.controlKeys = controlKeys.reduce((a, b) => a | b, 0);
        }

    }
    check(player) {
        return player.state.playing;

    }
    execute(player) {
        player.controlKeys = this.controlKeys;
    }
}

export default {
    ChatDispatch,
    ReloadDispatch,
    MeleeDispatch,
    SpawnDispatch,
    SwapWeaponDispatch,
    MovementDispatch
}