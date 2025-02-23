import Bot from '#bot';

const player = new Bot({ name: 'selfbot' });

const login = await player.login(process.argv[2], process.argv[2]);

console.log(login);