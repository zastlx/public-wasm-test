/* eslint-disable curly */

import Bot from '#bot';
import { Move } from '#constants';

import MovementDispatch from '#dispatch/MovementDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const bot = new Bot({ name: 'selfbot' });

bot.on('join', (player) => {
    console.log(player.name, 'joined.');
});

bot.on('chat', (_player, msg) => {
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());
    if (msg == 'move') bot.dispatch(new MovementDispatch(Move.FORWARD | Move.JUMP));
})

await bot.join(process.env.GAME_CODE || process.argv[2]);