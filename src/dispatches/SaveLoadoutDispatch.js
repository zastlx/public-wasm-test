import { queryServices } from '#api';
import { findItemById, gunIndexes } from '#constants';
import packet from '#packet';

class SaveLoadoutDispatch {
    constructor(opts) {
        this.changes = {
            classIdx: opts.gunId,
            hatId: opts.hatId,
            stampId: opts.stampId,
            grenadeId: opts.grenadeId,
            meleeId: opts.meleeId,
            colorIdx: opts.eggColor,
            primaryId: opts.primaryIds,
            secondaryId: opts.secondaryIds
        };

        // filter out undefined
        this.changes = Object.fromEntries(Object.entries(this.changes).filter(([, v]) => v !== undefined));
    }

    check(bot) {
        return !bot.me.playing;
    }

    execute(bot) {
        if (this.changes.classIdx && this.changes.classIdx !== bot.me.selectedGun) {
            bot.me.weapons[0] = new gunIndexes[this.changes.classIdx]();
        }

        const loadout = {
            ...bot.account.loadout,
            ...this.changes
        }

        const saveLoadout = queryServices({
            cmd: 'saveLoadout',
            save: true,
            firebaseId: bot.account.firebaseId,
            sessionId: bot.account.sessionId,
            loadout
        });

        bot.account.loadout = loadout;

        saveLoadout.then((res) => {
            console.log('saveloadout', res);

            new packet.ChangeCharacterPacket(this.changes?.classIdx || bot.me.selectedGun).execute(bot.gameSocket);

            // apply changes to the bot
            Object.entries(this.changes).forEach(([changeKey, changeValue]) => {
                switch (changeKey) {
                    case 'classIdx':
                        bot.me.selectedGun = changeValue;
                        break;

                    case 'hatId':
                        bot.me.character.hat = findItemById(changeValue);
                        break;

                    case 'stampId':
                        bot.me.character.stamp = findItemById(changeValue);
                        break;

                    case 'grenadeId':
                        bot.me.character.grenade = findItemById(changeValue);
                        break;

                    case 'meleeId':
                        bot.me.character.melee = findItemById(changeValue);
                        break;

                    case 'colorIdx':
                        bot.me.character.eggColor = changeValue;
                        break;

                    case 'primaryId':
                        bot.me.character.primaryGun = findItemById(changeValue[bot.me.selectedGun]);
                        break;

                    case 'secondaryId':
                        bot.me.character.secondaryGun = findItemById(changeValue[bot.me.selectedGun]);
                        break;
                }
            })
        })
    }
}

export default SaveLoadoutDispatch;