import dispatch from '#dispatch';
import Player from '#player';

const player = new Player.Player('selfbot');

player.on('join', (me, player) => {
    console.log(player.name, 'joined.');
});

player.on('chat', (me, player, msg) => {
    if (msg == 'spawn') { me.dispatch(new dispatch.SpawnDispatch()); }
    if (msg == 'fireOnce') { me.dispatch(new dispatch.FireDispatch()); }
    if (msg == 'fireUntilEmpty') {
        console.log(me.state.weapons);
        for (let i = 0; i < me.state.weapons[me.state.weapon].ammo.rounds; i++) {
            me.dispatch(new dispatch.FireDispatch());
        }
    }
    if (msg == 'reload') { me.dispatch(new dispatch.ReloadDispatch()); }
})

await player.join(process.argv[2]);

setInterval(() => player.update(), 10);