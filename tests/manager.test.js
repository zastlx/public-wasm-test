/* eslint-disable curly */

import dispatch from '#dispatch';
import manager from '#manager';
import Bot from '#bot';

const playerList = [];
const NUM_PLAYERS = 16;

for (let i = 0; i < NUM_PLAYERS; i++) {
    playerList.push(new Bot({ name: process.argv[3] || 'selfbot' }));
}

const man = new manager.Manager(playerList);

man.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

man.on('chat', (bot, _player, msg) => {
    if (msg == 'spawn') bot.dispatch(new dispatch.SpawnDispatch());
});

man.on('respawn', (bot, p) => {
    if (bot.me.name == p.name) bot.dispatch(new dispatch.SpawnDispatch());
});

await man.join(process.argv[2])