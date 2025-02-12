import player from "#player";
import dispatch from '#dispatch';
import manager from '#manager';


let player_list = [];
let emails = ['lexicon907974@hotmail.com','harsh04@gmail.com', 'stairway.536@dimmermail.com', 'abandon-8118@290mail.net', 'fling-81@7318mail.com', 'lychee8270741@nexusmail.com', 'infrared-676@yahoo.com', 'mahogany294445@yahoo.com', 'iterate66@hotmail.com', 'network.1@16mail.org', 'abrupt16@08mail.com', '3175smart@76mail.net', 'bagpipe_7518@829mail.org', 'warhorse1232@wirymail.com', 'kitten.2@scalemail.net'];
let passwords = ['allhailthetoolk1t_Stzqocm3Eb4N', 'allhailthetoolk1t_mh2E3EgTinl77', 'allhailthetoolk1t_dCOkro4rDIDEsC', 'allhailthetoolk1t_mgG4mkrkG0DC', 'allhailthetoolk1t_N0FPRV146iyh', 'allhailthetoolk1t_1vmw92xGrFdmhew', 'allhailthetoolk1t_E4Vfh9d3fup41q', 'allhailthetoolk1t_rFYz6rJQLT1JFBo', 'allhailthetoolk1t_zJymqIXyydAvHe', 'allhailthetoolk1t_qaOaYBEsxnNKZWC', 'allhailthetoolk1t_qLFlDHjG5a8l', 'allhailthetoolk1t_rUlUDZBMd6Cpw', 'allhailthetoolk1t_40RAjhFmsHYLIf', 'allhailthetoolk1t_J3cOXmc0UiSCTb', 'allhailthetoolk1t_9H97weZNWZpH'];

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
