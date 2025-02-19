/* eslint-disable curly */

import Player from '#player';

const player = new Player.Player('selfbot');

player.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (me, _player, msg) => {
    if (msg == 'game') console.log(me.game);
})

await player.join(process.argv[2]);

setInterval(() => player.update(), 10);