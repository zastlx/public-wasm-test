import fs from 'fs';

import path from 'path';
import dispatch from '#dispatch';
import manager from '#manager';
import player from '#player';

import Matchmaker from './src/matchmaker.js';

import { Move } from './src/constants.js';

const playerList = [];
const emails = []; // fill in here
const passwords = []; // fill in here

const loginJSONPath = path.join(import.meta.dirname, 'data', 'logins.json');
if (fs.existsSync(loginJSONPath)) {
    JSON.parse(fs.readFileSync(loginJSONPath)).accounts.forEach(element => {
        emails.push(element.email);
        passwords.push(element.password);
    });
} else {
    fs.writeFileSync(loginJSONPath, JSON.stringify({
        accounts: [
            { email: 'example@example.com', password: 'example' },
            { email: 'example2@example.com', password: 'example2' }
        ]
    }, null, 4));
}

if (emails.length == 0 || passwords.length == 0) {
    console.log('No logins found in logins.json, please add some.');
    process.exit(1);
}

const NUM_PLAYERS = 1;

for (let i = 0; i < NUM_PLAYERS; i++) { playerList.push(new player.Player({ name: process.argv[3] || 'spammer', updateInterval: 1})); }

const man = new manager.Manager(playerList);

man.on('chat', (me, _player, msg) => {
    if (msg == 'spawn') { me.dispatch(new dispatch.SpawnDispatch()); }
});

man.on('respawn', (me, p) => {
    if (me.name == p.name) { 
        me.dispatch(new dispatch.SpawnDispatch());
        me.dispatch(new dispatch.MovementDispatch(Move.FORWARD | Move.JUMP));
        console.log('respawned');
    }
});

man.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

await man.login(emails, passwords);

let gameCode = process.argv[2];
if (!gameCode) {
    console.log('no game code specified, joining random game');
    const mm = new Matchmaker(man.getSessionId());

    await mm.getRegions();

    const game = await mm.findPublicGame({
        region: mm.getRandomRegion(),
        mode: mm.getRandomGameMode()
    });

    console.log('joining a public game', game.id);

    gameCode = game.id;
}

await man.join(gameCode);