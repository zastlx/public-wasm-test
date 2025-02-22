/* eslint-disable curly */

import dispatch from '#dispatch';
import Bot from '#bot';
import { findItemById } from '#constants';

const bot = new Bot({ name: 'selfbot' });

bot.on('join', () => {
    console.log(bot.name, 'joined.');
});

bot.on('chat', (_bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'pause') bot.dispatch(new dispatch.PauseDispatch());

    if (msg.startsWith('changeGun ')) {
        const gun = parseInt(msg.split(' ')[1]);
        bot.dispatch(new dispatch.SaveLoadoutDispatch(gun));
    }

    if (msg.startsWith('changeHat ')) {
        const hat = parseInt(msg.split(' ')[1]);
        bot.me.character.hat = findItemById(hat);
        bot.dispatch(new dispatch.SaveLoadoutDispatch());
    }

    if (msg.startsWith('changeStamp ')) {
        const stamp = parseInt(msg.split(' ')[1]);
        bot.me.character.stamp = findItemById(stamp);
        bot.dispatch(new dispatch.SaveLoadoutDispatch());
    }

    if (msg.startsWith('changeColor ')) {
        const color = parseInt(msg.split(' ')[1]);
        bot.me.character.eggColor = color;
        bot.dispatch(new dispatch.SaveLoadoutDispatch());
    }
})

await bot.join(process.argv[2]);