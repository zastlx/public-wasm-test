import { queryServices } from '#api';
import packet from '#packet';

export default class ChangeGunDispatch {
    constructor(gunId) {
        this.gunId = gunId;
    }

    check(bot) {
        if (bot.state.playing) { return false }

        return true;
    }

    execute(bot) {
        if (this.gunId) {
            new packet.ChangeCharacterPacket(this.gunId).execute(bot.gameSocket);
        }

        console.log(bot.me.character);

        const saveLoadout = queryServices({
            cmd: 'saveLoadout',
            save: true,
            firebaseId: bot.loginData.firebaseId,
            sessionId: bot.loginData.sessionId,
            loadout: {
                classIdx: this.gunId || bot.me.selectedGun,
                hatId: bot.me.character.hat?.id || null,
                stampId: bot.me.character.stamp?.id || null,
                stampPositionX: 0,
                stampPositionY: 0,
                grenadeId: bot.me.character.grenade.id,
                meleeId: bot.me.character.melee.id,
                colorIdx: bot.me.character.eggColor,
                primaryId: [
                    3100,
                    3600,
                    3400,
                    3800,
                    4000,
                    4200,
                    4500
                ],
                secondaryId: new Array(7).fill(3000)
            }
        })

        saveLoadout.then((res) => console.log('saveloadout', res)) 
    }
}