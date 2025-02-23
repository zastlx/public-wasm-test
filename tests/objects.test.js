/* eslint-disable curly */

import Bot from '#bot';

import ChatDispatch from '#dispatch/ChatDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const player = new Bot({ name: 'selfbot' });

player.on('join', (player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());

    if (msg == 'activeWeapon') bot.dispatch(new ChatDispatch(`using the ${bot.me.activeGun == 1 ? 'secondary' : 'primary'}`));
    if (msg == 'weapons0') console.log(bot.players[0].weapons);
    if (msg == 'selfWeapons') console.log(bot.me.weapons);

    if (msg == 'game') console.log(bot.game);
    if (msg == 'players') console.log(bot.players);
    if (msg == 'player0') console.log(bot.players[0]);
})

await player.join(process.env.GAME_CODE || process.argv[2]);