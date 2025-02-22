/* eslint-disable curly */

import Bot from '#bot';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.onAny((event, ...args) => {
    if (!['packet', 'tick'].includes(event)) console.log('onAny', event, ...args);
});

await player.join(process.env.GAME_CODE || process.argv[2]);