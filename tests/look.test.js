/* eslint-disable curly */

import dispatch from '#dispatch';
import Player from '#player';

const player = new Player.Player({ name: 'selfbot' });

player.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (me, _player, msg) => {
    if (msg == 'spawn') me.dispatch(new dispatch.SpawnDispatch());
    else if (msg == 'lookAtMe') {
        me.dispatch(new dispatch.LookAtDispatch(_player.id));
    } else if (msg.startsWith('yaw ')) {
        const yaw = parseFloat(msg.split(' ')[1]);
        me.state.view.yaw = yaw;
    } else if (msg.startsWith('pitch ')) {
        const pitch = parseFloat(msg.split(' ')[1]);
        me.state.view.pitch = pitch;
    }
})

await player.join(process.argv[2]);