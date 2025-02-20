/* eslint-disable curly */

import dispatch from '#dispatch';
import Player from '#player';

const player = new Player.Player({ name: 'selfbot', updateInterval: 20 });

player.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (me, player, msg) => {
    if (msg == 'spawn') me.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'lookAtMe') me.dispatch(new dispatch.LookAtDispatch(player.id));
})

await player.join(process.argv[2]);