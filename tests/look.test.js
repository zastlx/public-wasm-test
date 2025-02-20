/* eslint-disable curly */

import dispatch from '#dispatch';
import Player from '#player';

const player = new Player.Player({ name: 'selfbot' });

player.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (me, player, msg) => {
    if (msg == 'spawn') me.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'lookAtMe') me.dispatch(new dispatch.LookAtDispatch(player.id));
    if (msg.startsWith('yaw ')) {
        const yaw = parseFloat(msg.split(' ')[1]);
        me.state.view.yaw = yaw;
    }
    if (msg.startsWith('pitch ')) {
        const pitch = parseFloat(msg.split(' ')[1]);
        me.state.view.pitch = pitch;
    }
})

await player.join(process.argv[2]);