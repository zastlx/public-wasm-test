/* eslint-disable curly */

import dispatch from '#dispatch';
import Bot from '#bot';

import { Move } from '#constants';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'move') bot.dispatch(new dispatch.MovementDispatch(Move.FORWARD | Move.JUMP));
})

await player.join(process.argv[2]);