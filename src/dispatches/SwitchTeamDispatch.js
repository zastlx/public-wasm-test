import packet from '#packet';

export default class SwitchTeamDispatch {
    check(player) {
        if (player.state.playing) { return false; } // you probably cant change team mid-game
        if (player.game.gameModeId == 0) { return false; } // ffa

        if (player.game.isPrivate) { return true } // private games can switch teams no matter 'fairness'

        const players = player.state.players;
        const myTeam = player.team;

        const playersWithMyTeam = players.filter(player => player.team == myTeam).length;
        const playersWithOtherTeam = players.filter(player => player.team != myTeam).length;

        if (playersWithOtherTeam > playersWithMyTeam) { return false; }
        if (playersWithMyTeam == playersWithOtherTeam) { return false; }

        return true;
    }

    execute(player) {
        new packet.TeamSwitchingTraitorPacket().execute(player.gameSocket);
    }
}