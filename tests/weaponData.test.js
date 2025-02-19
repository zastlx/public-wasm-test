/* eslint-disable curly */

import dispatch from '#dispatch';
import Player from '#player';

const player = new Player.Player({ name: 'selfbot' });

player.on('join', (_me, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (me, _player, msg) => {
    if (msg == 'spawn') me.dispatch(new dispatch.SpawnDispatch());
    if (msg == 'activeWeapon') me.dispatch(new dispatch.ChatDispatch(`using the ${me.state.weaponIdx == 1 ? 'secondary' : 'primary'}`));
    if (msg == 'weaponData0') console.log(player.state.players[0].state.weaponData);
    if (msg == 'selfWeaponData') console.log(player.state.weaponData);
})

await player.join(process.argv[2]);