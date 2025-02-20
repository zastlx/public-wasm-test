/* eslint-disable curly */

import dispatch from '#dispatch';
import Player from '#player';

import { Move } from '#constants';

const player = new Player.Player({ name: 'selfbot' });

player.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (me, _player, msg) => {
    if (msg == 'spawn') me.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'move') me.dispatch(new dispatch.MovementDispatch(Move.FORWARD | Move.JUMP));
})

await player.join(process.argv[2]);