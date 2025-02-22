/* eslint-disable curly */

import Bot from '#bot';

import ReportPlayerDispatch from '#dispatch/ReportPlayerDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());
    if (msg == 'report') bot.dispatch(new ReportPlayerDispatch(_player.id, { cheating: true }));
})

await player.join(process.env.GAME_CODE || process.argv[2]);