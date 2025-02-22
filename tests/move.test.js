/* eslint-disable curly */

import Bot from '#bot';
import { Move } from '#constants';

import MovementDispatch from '#dispatch/MovementDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());
    if (msg == 'move') bot.dispatch(new MovementDispatch(Move.FORWARD | Move.JUMP));
})

await player.join(process.env.GAME_CODE || process.argv[2]);