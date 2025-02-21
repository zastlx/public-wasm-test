/* eslint-disable curly */

import dispatch from '#dispatch';
import Bot from '#bot';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'swapWeapon') bot.dispatch(new dispatch.SwapWeaponDispatch());
})

await player.join(process.argv[2]);