/* eslint-disable curly */

import dispatch from '#dispatch';
import manager from '#manager';
import player from '#player';

const playerList = [];
const NUM_PLAYERS = 16;

for (let i = 0; i < NUM_PLAYERS; i++) {
    playerList.push(new player.Player({ name: process.argv[3] || 'selfbot' }));
}

const man = new manager.Manager(playerList);

man.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

man.on('chat', (me, _player, msg) => {
    if (msg == 'spawn') me.dispatch(new dispatch.SpawnDispatch());
});

man.on('respawn', (me, p) => {
    if (me.name == p.name) me.dispatch(new dispatch.SpawnDispatch());
});

await man.join(process.argv[2])