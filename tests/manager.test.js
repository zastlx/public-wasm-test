/* eslint-disable curly */

import Bot from '#bot';
import Manager from '#manager';

import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const playerList = [];
const NUM_PLAYERS = 5;

for (let i = 0; i < NUM_PLAYERS; i++) {
    playerList.push(new Bot({ name: process.argv[3] || 'selfbot' }));
}

const man = new Manager(playerList);

man.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

man.on('chat', (bot, _player, msg) => {
    console.log(bot.me.name, bot.me.id, _player.name, msg);
    if (msg == 'spawn') bot.dispatch(new SpawnDispatch());
});

man.on('respawn', (bot, p) => {
    if (bot.me.name == p.name) bot.dispatch(new SpawnDispatch());
});

await man.join(process.env.GAME_CODE || process.argv[2])