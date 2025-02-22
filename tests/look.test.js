/* eslint-disable curly */

import Bot from '#bot';

import LookAtDispatch from '#dispatch/LookAtDispatch.js';
import LookToDispatch from '#dispatch/LookToDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 's') bot.dispatch(new SpawnDispatch());
    if (msg == 'l') bot.dispatch(new LookAtDispatch(_player.id));

    if (msg.startsWith('yaw ')) {
        const yaw = parseFloat(msg.split(' ')[1]);
        bot.dispatch(new LookToDispatch(yaw, null));
    }

    if (msg.startsWith('pitch ')) {
        const pitch = parseFloat(msg.split(' ')[1]);
        bot.dispatch(new LookToDispatch(null, pitch));
    }
})

await player.join(process.env.GAME_CODE || process.argv[2]);