/* eslint-disable curly */

import Bot from '#bot';
import dispatch from '#dispatch';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new dispatch.SpawnDispatch());

    if (msg == 'activeWeapon') bot.dispatch(new dispatch.ChatDispatch(`using the ${bot.me.weapon == 1 ? 'secondary' : 'primary'}`));
    if (msg == 'weaponData0') console.log(bot.players[0].weaponData);
    if (msg == 'selfWeaponData') console.log(bot.me.weaponData);

    if (msg == 'game') console.log(bot.game);
    if (msg == 'players') console.log(bot.players);
    if (msg == 'player0') console.log(bot.players[0]);
})

await player.join(process.argv[2]);