import api from '#api';

import { WebSocket } from 'ws';

import comm, { CommIn, CommOut, updatePacketConstants } from '#comm';
import { SocksProxyAgent } from 'socks-proxy-agent';

let consts = await updatePacketConstants();
let CommCode = consts[0];
let CloseCode = consts[1];

class InGamePlayer {
    constructor(id, team, playerData) {
        this.id = id;
        this.team = team;

        this.name = playerData.name_;

        this.data = playerData;

        this.state = {
            joinedGame: true,
            playing: false,
            position: {
                x: this.data.x_,
                y: this.data.y_,
                z: this.data.z_
            },
            jumping: false,
            climbing: false,
            view: {
                yaw: this.data.yaw_,
                pitch: this.data.pitch_
            },
            weapon: this.data.weaponIdx_,
            weapons: [
                {
                    ammo: {}
                },
                {
                    ammo: {}
                }
            ],
            buffer: {
                0: {},
                1: {},
                2: {}
            },
            kills: 0,
            hp: 100
        }
    }
}


class Player {
    constructor(id = '', proxy = '') {
        this.proxy = proxy;
        this.use_proxy = proxy !== '';

        this.id = id ? id : Math.random().toString(36).substring(8);

        this.name = this.id

        this._hooks = {
            'chat': [],
            'join': [],
            'death': [],
            'fire': [],
            'collect': [],
            'pause': [],
            'respawn': [],
            'packet': []
        }

        this._live_callbacks = [];

        this.state = {
            joinedGame: false,
            loggedIn: false,
            playing: false,
            gameFound: false,
            meta: {

            },
            me: {

            },
            players: {

            },
            position: {
                x: NaN,
                y: NaN,
                z: NaN
            },
            jumping: false,
            climbing: false,
            view: {
                yaw: NaN,
                pitch: NaN
            },
            weapon: 0,
            weapons: [
                {
                    ammo: {}
                },
                {
                    ammo: {}
                }
            ],
            grenades: 0,
            buffer: {
                0: {},
                1: {},
                2: {}
            },
            kills: 0,
            hp: 100
        };

        this.loginData = null;
        this.currentGameCode = null;
        this.gameData = null;

        this._dispatches = [];
        this._packet_queue = [];

        this.gameSocket = null;
        this.matchmakerSocket = null;

        this.lastPingTime = -1;
        this.lastDeathTime = -1;
        this.lastChatTime = -1;
        this.nUpdates = 0;

        this.initTime = Date.now();


    }
    async login(email, pass) {
        let time = Date.now()
        this.email = email; this.pass = pass;
        this.loginData = await api.login(email, pass, this.proxy ? this.proxy : '');
        this.state.loggedIn = true;
        console.log("Logged in successfully. Time:", Date.now() - time, "ms");
    }
    dispatch(disp) {
        this._dispatches.push(disp);
    }
    drain() {
        for (let i = 0; i < this._dispatches.length; i++) {
            let disp = this._dispatches[i];
            if (disp.check(this)) {
                disp.execute(this);
                this._dispatches.splice(i, 1);
                return; // only 1 dispatch per update
            } else {
                // console.log("Dispatch failed", this.state.joinedGame, this.lastChatTime)
            }
        }
    }
    async matchmaker(code) {
        if (!this.state.loggedIn) {
            console.log("Not logged in, attempting to create anonymous user...");
            this.loginData = await api.anonymous(this.proxy ? this.proxy : '');
        }

        this.matchmakerSocket = new WebSocket('wss://shellshock.io/matchmaker/', {
            headers: {
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'accept-language': 'en-US,en;q=0.9',
            },
            agent: this.use_proxy ? new SocksProxyAgent(this.proxy) : null
        });

        this.matchmakerSocket.onopen = () => {
            this.matchmakerSocket.send(JSON.stringify({
                command: 'joinGame',
                id: code,
                observe: false,
                sessionId: this.loginData.sessionId
            }))
        }

        this.matchmakerSocket.onmessage = async (msg) => {
            let mes;

            try {
                mes = JSON.parse(msg.data);
            } catch {
                console.log('Error parsing message:', msg.data);
            }

            if (mes.command == 'gameFound') {
                this.currentGameCode = code.toUpperCase();
                this.gameData = mes;
                this.state.gameFound = true;
            } else {
                console.log(mes);
            }

            if (mes.error && mes.error == 'gameNotFound') {
                throw new Error(`Game ${code} not found (likely expired).`)
            }
        }

        while (!this.state.gameFound) {
            await new Promise(r => setTimeout(r, 10));
        }
    }
    async _gameSocket_onMessage_initial(msg) { // to minify with vscode

        CommIn.init(msg.data);

        let out;
        let cmd = CommIn.unPackInt8U();

        switch (cmd) {
            case CommCode.socketReady:
                /*

                var i=Ec.getBuffer();
                i.packInt8(nc.joinGame)

                i.packString(e.playerName)
                i.packString(e.uuid)

                i.packInt8(t)
                i.packInt8(Tc.playerAccount.classIdx)

                i.packInt32(Tc.playerAccount.session)
                i.packString(Tc.playerAccount.firebaseId)
                i.packString(Tc.playerAccount.sessionId)

                i.send(Zw);

                */

                out = CommOut.getBuffer();
                out.packInt8(CommCode.joinGame);

                out.packString(this.name); // name
                out.packString(this.gameData.uuid); // game id

                out.packInt8(0); // hidebadge
                out.packInt8(0); // weapon choice

                out.packInt32(this.loginData.session); // session int
                out.packString(this.loginData.firebaseId); // firebase id
                out.packString(this.loginData.sessionId); // session id

                out.send(this.gameSocket);

                break;
            case CommCode.gameJoined:

                this.state.me.id = CommIn.unPackInt8U();
                // console.log("My id is:", this.state.me.id);
                this.state.me.team = CommIn.unPackInt8U();
                // console.log("My team is:", this.state.me.team);
                this.state.meta.gameType = CommIn.unPackInt8U();
                // console.log("Gametype:", this.state.meta.gameType);
                this.state.meta.map = CommIn.unPackInt8U();
                // console.log("Map:", this.state.meta.map);
                this.state.meta.playerLimit = CommIn.unPackInt8U();
                // console.log("Player limit:", this.state.meta.playerLimit);
                this.state.meta.isGameOwner = CommIn.unPackInt8U() == 1;
                // console.log("Is game owner:", this.state.meta.isGameOwner);
                this.state.meta.isPrivateGame = CommIn.unPackInt8U() == 1;
                // console.log("Is private game:", this.state.meta.isPrivateGame);

                // console.log('Successfully joined game.');
                this.state.joinedGame = true;
                this.state.lastDeathTime = Date.now();


                break;
            case CommCode.eventModifier:
                // console.log("Echoed eventModifier"); // why the fuck do you need to do this
                out = CommOut.getBuffer();
                out.packInt8(CommCode.eventModifier);
                out.send(this.gameSocket);
                break;
            default:
                try {
                    console.log("Received but did not handle a:", Object.entries(CommCode).filter(([k, v]) => v == cmd)[0][0], cmd);
                    // packet could potentially not exist, then [0][0] will error
                } catch { }
                console.log("!!! You shouldn't be seeing this!");
                console.log("!!! This message means the startup sequence received an unexpected packet.");
                console.log("!!! Try refreshing comm codes. If you still see this error, contact hijinks");
                throw new Error("Unexpected packet received during startup: " + cmd);
                break;

        }

    }
    async join(code) {
        await this.matchmaker(code);

        console.log(`Joining ${code} using proxy ${this.use_proxy ? this.proxy : 'none'}`);


        this.gameSocket = new WebSocket(`wss://${this.gameData.subdomain}.shellshock.io/game/${this.gameData.id}`, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1230.0.0.0 Safari/537.36',
                'accept-language': 'en-US,en;q=0.9'
            },
            agent: this.use_proxy ? new SocksProxyAgent(this.proxy) : null
        });

        this.gameSocket.binaryType = 'arraybuffer';

        this.gameSocket.onopen = () => {
            // console.log('Successfully connected to game server.');
        }

        this.gameSocket.onmessage = this._gameSocket_onMessage_initial.bind(this);

        this.gameSocket.onclose = (e) => {
            console.log('Game socket closed:', Object.entries(CloseCode).filter(([k, v]) => v == e.code));
            console.error(e)
        }

        while (!this.state.joinedGame) {
            await new Promise(r => setTimeout(r, 1));
        }

        let out = CommOut.getBuffer();
        out.packInt8(CommCode.clientReady);
        out.send(this.gameSocket);

        this.gameSocket.onmessage = (msg) => {
            this._packet_queue.push(msg.data);
        }

        this.state.meta.code = code;

        console.log(`Successfully joined ${code}. Startup to join time: ${Date.now() - this.initTime} ms`);

    }
    async update() {

        if (!this.state.joinedGame) {
            throw new Error("Not playing, can't update. ");
        }

        this.nUpdates++;


        if (this._packet_queue.length === 0 && this._dispatches.length === 0) {
            return;
        }

        let packet;

        while (packet = this._packet_queue.shift()) {
            this.handle_packet(packet);
        }

        this.drain();

        let cb;

        while (cb = this._live_callbacks.shift()) {
            cb();
        }
    }
    _handle_chat_packet(packet) {
        let id = CommIn.unPackInt8U();
        let msg_flags = CommIn.unPackInt8U();
        let text = CommIn.unPackString().valueOf();
        let player = this.state.players[Object.keys(this.state.players).find(p => this.state.players[p].id == id)];
        // console.log(`Player ${player.name}: ${text} (flags: ${msg_flags})`);
        // console.log(`Their position: ${player.state.position.x}, ${player.state.position.y}, ${player.state.position.z}`);
        this._hooks['chat'].forEach((fn) => this._live_callbacks.push(fn.apply(this, [this, player, text, msg_flags])));
    }
    _handle_add_player_packet(packet) {
        let id_ = CommIn.unPackInt8U();
        let uniqueId = CommIn.unPackString();
        let name = CommIn.unPackString();
        let safename = CommIn.unPackString(); // ??? (a)
        let charClass = CommIn.unPackInt8U();
        let playerData = {
            id_: id_,
            uniqueId_: uniqueId,
            name_: name,
            safename_: safename,
            charClass_: charClass,
            team_: CommIn.unPackInt8U(),
            primaryWeaponItem_: CommIn.unPackInt16U(),
            secondaryWeaponItem_: CommIn.unPackInt16U(), // b
            shellColor_: CommIn.unPackInt8U(),
            hatItem_: CommIn.unPackInt16U(),
            stampItem_: CommIn.unPackInt16U(),
            unknown_int8_1: CommIn.unPackInt8(), // c
            unknown_int8_2: CommIn.unPackInt8(),
            grenadeItem_: CommIn.unPackInt16U(),
            meleeItem_: CommIn.unPackInt16U(),
            x_: CommIn.unPackFloat(),
            y_: CommIn.unPackFloat(),
            z_: CommIn.unPackFloat(),
            dx_: CommIn.unPackFloat(),
            dy_: CommIn.unPackFloat(),
            dz_: CommIn.unPackFloat(),
            yaw_: CommIn.unPackRadU(),
            pitch_: CommIn.unPackRad(),
            score_: CommIn.unPackInt32U(),
            kills_: CommIn.unPackInt16U(),
            deaths_: CommIn.unPackInt16U(),
            streak_: CommIn.unPackInt16U(),
            totalKills_: CommIn.unPackInt32U(),
            totalDeaths_: CommIn.unPackInt32U(),
            bestGameStreak_: CommIn.unPackInt16U(),
            bestOverallStreak_: CommIn.unPackInt16U(),
            shield_: CommIn.unPackInt8U(),
            hp_: CommIn.unPackInt8U(),
            playing_: CommIn.unPackInt8U(),
            weaponIdx_: CommIn.unPackInt8U(),
            controlKeys_: CommIn.unPackInt8U(),
            upgradeProductId_: CommIn.unPackInt8U(),
            activeShellStreaks_: CommIn.unPackInt8U(),
            social_: CommIn.unPackLongString(),
            hideBadge_: CommIn.unPackInt8U()
        };
        playerData.gameData_ = {};
        playerData.gameData_.mapIdx = CommIn.unPackInt8U();
        playerData.gameData_.private = CommIn.unPackInt8U();
        playerData.gameData_.gameType = CommIn.unPackInt8U();
        playerData.stats_ = {};
        comm.StatsArr.forEach((stat) => playerData.stats_[stat] = 0);
        playerData.stats_.kills = playerData.kills_;
        playerData.stats_.deaths = playerData.deaths_;
        playerData.stats_.streak = playerData.streak_;
        if (!this.state.players[playerData.id_]) {
            this.state.players[playerData.id_] = new InGamePlayer(playerData.id_, playerData.team_, playerData);
        }
        this._hooks['join'].forEach((fn) => this._live_callbacks.push(fn.apply(this, [this, this.state.players[playerData.id_]])));
        // console.log(`I am ${this.state.me.id}, player ${playerData.id_} joined.`);
        let unp = CommIn.unPackInt8U();
        if (unp == CommCode.addPlayer) { // there is another player stacked
            // console.log("Stacked player, adding");
            this._handle_add_player_packet();
        }

    }
    _handle_respawn_packet(packet) {
        let id = CommIn.unPackInt8U();
        let seed = CommIn.unPackInt16U();
        let x = CommIn.unPackFloat();
        let y = CommIn.unPackFloat();
        let z = CommIn.unPackFloat();
        let rounds0 = CommIn.unPackInt8U();
        let store0 = CommIn.unPackInt8U();
        let rounds1 = CommIn.unPackInt8U();
        let store1 = CommIn.unPackInt8U();
        let grenades = CommIn.unPackInt8U();
        let player = id == this.state.me.id ? this : this.state.players[id];
        if (player) {
            player.state.playing = true;
            player.state.randomSeed = seed;
            player.state.weapons[0].ammo.rounds = rounds0;
            player.state.weapons[0].ammo.store = store0;
            player.state.weapons[1].ammo.rounds = rounds1;
            player.state.weapons[1].ammo.store = store1;
            player.state.grenades = grenades;
            player.state.position = { x: x, y: y, z: z };
            // console.log(`Player ${player.name} respawned at ${x}, ${y}, ${z}`);
            this._hooks['respawn'].forEach((fn) => this._live_callbacks.push(fn.apply(this, [this, player])));
        } else {
            // console.log(`Player ${id} not found. (me: ${this.state.me.id}) (respawn)`);
        }
    }
    _handle_external_sync_packet(packet) {
        let id = CommIn.unPackInt8U();
        let x = CommIn.unPackFloat();
        let y = CommIn.unPackFloat();
        let z = CommIn.unPackFloat();
        let climbing = CommIn.unPackInt8U();
        let player = this.state.players[id];
        if (!player || player.id == this.state.me.id) {
            for (let i2 = 0; i2 < 3 /* FramesBetweenSyncs */; i2++) {
                CommIn.unPackInt8U();
                CommIn.unPackRadU();
                CommIn.unPackRad();
            }
        }
        player.state.index = 0;
        let yaw, pitch;
        for (let i2 = 0; i2 < 3; i2++) {
            player.state.buffer[i2].controlKeys = CommIn.unPackInt8U();
            yaw = CommIn.unPackRadU();
            player.state.buffer[i2].yaw_ = yaw
            pitch = CommIn.unPackRad();
            player.state.buffer[i2].pitch_ = pitch
        }
        player.state.position.x = x;
        if (!player.state.jumping || Math.abs(player.state.position.y - y) > 0.5) {
            player.state.position.y = y;
        }
        player.state.position.z = z;
        player.state.buffer[0].x = x;
        player.state.buffer[0].y = y;
        player.state.buffer[0].z = z;
        player.state.climbing = climbing;
        // console.log(`Player ${player.name} is now at ${x}, ${y}, ${z} (climbing = ${climbing})`);
    }
    _handle_pause_packet(packet) {
        let id = CommIn.unPackInt8U();
        let player = this.state.players[id];
        if (player) {
            player.state.playing = false;
            // console.log(`Player ${player.name} paused.`);
            this._hooks['pause'].forEach((fn) => this._live_callbacks.push(fn.apply(this, [this, player])));
        }
    }
    _handle_death_packet(packet) {

        let killedId = CommIn.unPackInt8U();
        let byId = CommIn.unPackInt8U();
        let rs = CommIn.unPackInt8U();

        let killedPlayer = killedId == this.state.me.id ? this : this.state.players[killedId];
        let byPlayer = byId == this.state.me.id ? this : this.state.players[byId];

        let byPlayerLastDmg = CommIn.unPackInt8U();
        let killedByPlayerLastDmg = CommIn.unPackInt8U();

        if (killedPlayer) {
            killedPlayer.state.playing = false;
            killedPlayer.state.kills = 0;
            killedPlayer.lastDeathTime = Date.now();
            // console.log(`Player ${killedPlayer.name} died.`);
        }

        if (byPlayer) {
            byPlayer.state.kills++;
            // console.log(`Player ${byPlayer.name} is on a streak of ${byPlayer.state.kills} kills.`);
        }

        this._hooks['death'].forEach((fn) => this._live_callbacks.push(fn.apply(this, [this, killedPlayer, byPlayer])));


    }
    _handle_fire_packet(packet) {
        let id = CommIn.unPackInt8U(); // there should be 6 floats after this, but that's irrelevant for our purposes 
        let player = this.state.players[id];
        this._hooks['fire'].forEach((fn) => this._live_callbacks.push(fn.apply(this, [this, player])));
    }
    _handle_collect_packet(packet) {
        let id = CommIn.unPackInt8U();
        let type = CommIn.unPackInt8U();
        let applyToWeaponIdx = CommIn.unPackInt8U();
        let itemId = CommIn.unPackInt16U();
        let AMMO = 0; let GRENADE = 1;
        if (id == this.state.me.id) {
            if (type == AMMO) {
                return; // FIXME: Implement
            } else if (type == GRENADE) {
                this.state.grenades >= 3 ? this.state.grenades = 3 : this.state.grenades++;
            } else {
                console.log("_handle_collect_packet: Invalid collect type", type);
            }
        }
        this._hooks['collect'].forEach((fn) => this._live_callbacks.push(fn.apply(this, [this, this.state.players[id], type, applyToWeaponIdx, itemId])));
    }
    _handle_hit_them_packet(packet) {
        let id = CommIn.unPackInt8U();
        let hp = CommIn.unPackInt8U();
        let player = this.state.players[id];
        player.state.hp = hp;
    }
    _handle_reload_packet(packet) {
        return;
    }
    handle_packet(packet) {
        CommIn.init(packet);
        this._hooks['packet'].forEach((fn) => this._live_callbacks.push(fn.apply(this, [this, packet])));
        let cmd = CommIn.unPackInt8U();
        switch (cmd) {
            case CommCode.chat:
                this._handle_chat_packet(packet);
                break;

            case CommCode.addPlayer:
                this._handle_add_player_packet(packet);
                break;

            case CommCode.respawn:
                this._handle_respawn_packet(packet);
                break;

            case CommCode.syncThem:
                this._handle_external_sync_packet(packet);
                break;

            case CommCode.pause:
                this._handle_pause_packet(packet);
                break;

            case CommCode.die:
                this._handle_death_packet(packet);
                break;

            case CommCode.fire:
                this._handle_fire_packet(packet);
                break;

            case CommCode.collectItem:
                this._handle_collect_packet(packet);
                break;

            case CommCode.hitThem:
                this._handle_hit_them_packet(packet);
                break;

            case CommCode.reload:
                this._handle_reload_packet(packet);
                break;

            default:
                console.log(`I got but did not handle a: ${Object.entries(CommCode).filter(([k, v]) => v == cmd)[0][0]} (${cmd})`);
                break;
        }
    }
    on(event, cb) {
        if (Object.keys(this._hooks).includes(event)) {
            this._hooks[event].push(cb);
        } else {
            throw new Error(`Event ${event} is not a valid hook (valid: ${Object.keys(this._hooks)})`);
        }
    }

}

export default {
    Player
};