/* eslint-disable curly */

import Bot from '#bot';

import SpawnDispatch from '#dispatch/SpawnDispatch.js';
import SwapWeaponDispatch from '#dispatch/SwapWeaponDispatch.js';

const player = new Bot({ name: 'selfbot' });

player.on('join', (player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());
    if (msg == 'swapWeapon') bot.dispatch(new SwapWeaponDispatch());
})

await player.join(process.env.GAME_CODE || process.argv[2]);