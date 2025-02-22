/* eslint-disable curly */

import Bot from '#bot';

import PauseDispatch from '#dispatch/PauseDispatch.js';
import SaveLoadoutDispatch from '#dispatch/SaveLoadoutDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

import { findItemById } from '#constants';

const bot = new Bot({ name: 'selfbot' });

bot.on('join', () => {
    console.log(bot.name, 'joined.');
});

bot.on('chat', (_bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());
    if (msg == 'pause') bot.dispatch(new PauseDispatch());

    if (msg.startsWith('changeGun ')) {
        const gun = parseInt(msg.split(' ')[1]);
        bot.dispatch(new SaveLoadoutDispatch(gun));
    }

    if (msg.startsWith('changeHat ')) {
        const hat = parseInt(msg.split(' ')[1]);
        bot.me.character.hat = findItemById(hat);
        bot.dispatch(new SaveLoadoutDispatch());
    }

    if (msg.startsWith('changeStamp ')) {
        const stamp = parseInt(msg.split(' ')[1]);
        bot.me.character.stamp = findItemById(stamp);
        bot.dispatch(new SaveLoadoutDispatch());
    }

    if (msg.startsWith('changeColor ')) {
        const color = parseInt(msg.split(' ')[1]);
        bot.me.character.eggColor = color;
        bot.dispatch(new SaveLoadoutDispatch());
    }
})

await bot.join(process.env.GAME_CODE || process.argv[2]);