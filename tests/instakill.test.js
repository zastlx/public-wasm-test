import Bot from '#bot';

import FireDispatch from '#dispatch/FireDispatch.js';
import LookAtDispatch from '#dispatch/LookAtDispatch.js';
import ReloadDispatch from '#dispatch/ReloadDispatch.js';
import SaveLoadoutDispatch from '#dispatch/SaveLoadoutDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const player = new Bot({ name: 'selfbot' });

player.on('join', (_bot, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (bot, _player, msg) => {
    if (msg == 's') {
        bot.dispatch(new SaveLoadoutDispatch(5)); // change to crackshot
        bot.dispatch(new SpawnDispatch());
    }

    if (msg == 'kms') {
        bot.dispatch(new LookAtDispatch(_player.id));
        bot.dispatch(new FireDispatch());
        bot.dispatch(new ReloadDispatch());
    }
})

await player.join(process.env.GAME_CODE || process.argv[2]);