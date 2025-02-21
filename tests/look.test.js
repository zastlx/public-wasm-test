/* eslint-disable curly */

import dispatch from '#dispatch';
import Bot from '#bot';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'lookAtMe') bot.dispatch(new dispatch.LookAtDispatch(_player.id));

    if (msg.startsWith('yaw ')) {
        const yaw = parseFloat(msg.split(' ')[1]);
        bot.dispatch(new dispatch.LookToDispatch(yaw, null));
    }

    if (msg.startsWith('pitch ')) {
        const pitch = parseFloat(msg.split(' ')[1]);
        bot.dispatch(new dispatch.LookToDispatch(null, pitch));
    }
})

await player.join(process.argv[2]);