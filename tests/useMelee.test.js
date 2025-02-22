/* eslint-disable curly */

import Bot from '#bot';

import MeleeDispatch from '#dispatch/MeleeDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());
    if (msg == 'melee') bot.dispatch(new MeleeDispatch());
})

await player.join(process.env.GAME_CODE || process.argv[2]);