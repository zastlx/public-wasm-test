/* eslint-disable curly */

import Bot from '#bot';

import SpawnDispatch from '#dispatch/SpawnDispatch.js';
import SwitchTeamDispatch from '#dispatch/SwitchTeamDispatch.js';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());
    if (msg == 'switchTeam') bot.dispatch(new SwitchTeamDispatch());
})

await player.join(process.env.GAME_CODE || process.argv[2]);