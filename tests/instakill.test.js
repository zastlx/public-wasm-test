import Bot from '#bot';

import FireDispatch from '#dispatch/FireDispatch.js';
import LookAtDispatch from '#dispatch/LookAtDispatch.js';
import ReloadDispatch from '#dispatch/ReloadDispatch.js';
import SaveLoadoutDispatch from '#dispatch/SaveLoadoutDispatch.js';
import SpawnDispatch from '#dispatch/SpawnDispatch.js';

const bot = new Bot({ name: 'selfbot' });

bot.on('join', (player) => {
    console.log(player.name, 'joined.');
});

bot.on('chat', (_player, msg) => {
    if (msg == 's') {
        bot.dispatch(new SaveLoadoutDispatch(5)); // change gun to crackshot
        bot.dispatch(new SpawnDispatch()); // spawn in game
    }

    if (msg == 'kms') {
        bot.dispatch(new LookAtDispatch(_player.id)); // look at the player who sent the message
        bot.dispatch(new FireDispatch()); // fire the gun - this will kill the player as it's a cs
        bot.dispatch(new ReloadDispatch()); // reload the gun for future trolling
    }
})

await bot.join(process.env.GAME_CODE || process.argv[2]);