/* eslint-disable curly */

import dispatch from '#dispatch';
import Player from '#player';

const player = new Player.Player('selfbot');

player.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (me, _player, msg) => {
    if (msg == 'spawn') me.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'swapWeapon') player.dispatch(new dispatch.SwapWeaponDispatch());
})

await player.join(process.argv[2]);

setInterval(() => player.update(), 10);