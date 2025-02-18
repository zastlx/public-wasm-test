import player from "#player";
import dispatch from '#dispatch';
import manager from '#manager';

import { readFileSync } from 'fs';


let player_list = [];
let emails = []; // fill in here
let passwords = []; // fill in here

JSON.parse(readFileSync('logins.json')).accounts.forEach(element => { emails.push(element.email); passwords.push(element.password); });

const NUM_PLAYERS = 1;

for (let i = 0; i < NUM_PLAYERS; i++) {
    player_list.push(new player.Player('spammer'));
}

let man = new manager.Manager(player_list);

man.on('chat', (me, player, msg) => {
    if (msg == "spawn") {
        me.dispatch(new dispatch.SpawnDispatch());
    }
}); 

man.on('respawn', (me, p) => {
    if (me.name == p.name) {
        me.dispatch(new dispatch.SpawnDispatch());
    }
});

man.on('join', (me, player) => {
    console.log(player.name, "joined.");
});

await man.login(emails, passwords);
await man.join('kate-burl-pint');



setInterval(async () => { 
    man.update(); 
}, 10);
