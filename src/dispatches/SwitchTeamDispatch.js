import packet from '#packet';

export default class SwitchTeamDispatch {
    check(bot) {
        if (bot.me.playing) { return false; } // you probably cant change team mid-game
        if (bot.game.gameModeId == 0) { return false; } // ffa

        if (bot.game.isPrivate) { return true } // private games can switch teams no matter 'fairness'

        const players = bot.players;
        const myTeam = bot.me.team;

        const playersWithMyTeam = players.filter(player => player.team == myTeam).length;
        const playersWithOtherTeam = players.filter(player => player.team != myTeam).length;

        if (playersWithOtherTeam > playersWithMyTeam) { return false; }
        if (playersWithMyTeam == playersWithOtherTeam) { return false; }

        return true;
    }

    execute(bot) {
        new packet.TeamSwitchingTraitorPacket().execute(bot.gameSocket);
    }
}