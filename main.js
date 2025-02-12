import player from "#player";
import dispatch from '#dispatch';
import manager from '#manager';


let player_list = [];
let emails = []; // fill in here
let passwords = []; // fill in here

const NUM_PLAYERS = 1;

for (let i = 0; i < NUM_PLAYERS; i++) {
    player_list.push(new player.Player('', 'ShellGuy 103'));
}

let man = new manager.Manager(player_list);

man.on('chat', (player, msg) => {
    console.log(player.name, "said:", msg);
});

await man.login(emails, passwords);
await man.join('cool-matt-held');



setInterval(async () => { 
    man.update(); 
}, 10);
