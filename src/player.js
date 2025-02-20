
import { SocksProxyAgent } from 'socks-proxy-agent';
import { WebSocket } from 'ws';

import api from '#api';

import comm, { CommIn, CommOut, updatePacketConstants } from '#comm';

import { findItemById, GameModesById, getWeaponFromMeshName, Maps, USER_AGENT } from './constants.js';

const consts = await updatePacketConstants();
const CommCode = consts[0];
const CloseCode = consts[1];

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
                { ammo: {} },
                { ammo: {} }
            ],
            weaponData: this.data.weaponData,
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
    constructor(params = {}) {
        if (!params.name) { params.name = ''; }
        if (!params.proxy) { params.proxy = ''; }
        if (!params.doUpdate) { params.doUpdate = true; }

        this.proxy = params.proxy;
        this.useProxy = !!params.proxy;

        this.name = params.name || Math.random().toString(36).substring(8);
        this.autoUpdate = params.doUpdate;
        this.updateInterval = params.updateInterval || 5;

        this._hooks = {
            'chat': [],
            'join': [],
            'death': [],
            'fire': [],
            'collect': [],
            'pause': [],
            'respawn': [],
            'packet': [],
            'tick': []
        }

        this._liveCallbacks = [];

        this.state = {
            joinedGame: false,
            loggedIn: false,
            playing: false,
            gameFound: false,
            me: {},
            players: {},
            position: {
                x: NaN,
                y: NaN,
                z: NaN
            },
            jumping: false,
            climbing: false,
            reloading: false, // TODO: test time values
            swappingGun: false,
            usingMelee: false,
            view: {
                yaw: NaN,
                pitch: NaN
            },
            weapon: 0,
            weapons: [
                { ammo: {} },
                { ammo: {} }
            ],
            weaponData: {},
            grenades: 0,
            buffer: {
                0: {},
                1: {},
                2: {}
            },
            kills: 0,
            hp: 100
        };

        this.game = {
            raw: {}, // the stuff returned by the matchmaker
            code: ''
        }

        this.loginData = null;

        this._dispatches = [];
        this._packetQueue = [];

        this.gameSocket = null;
        this.matchmakerSocket = null;

        this.lastPingTime = -1;
        this.lastDeathTime = -1;
        this.lastChatTime = -1;
        this.nUpdates = 0;
        this.lastUpdateTime = -1;

        this.controlKeys = 0;

        this.initTime = Date.now();

    }
    async login(email, pass) {
        const time = Date.now()
        this.email = email; this.pass = pass;
        this.loginData = await api.login(email, pass, this.proxy ? this.proxy : '');
        this.state.loggedIn = true;
        console.log('Logged in successfully. Time:', Date.now() - time, 'ms');
    }
    dispatch(disp) {
        this._dispatches.push(disp);
    }
    drain() {
        for (let i = 0; i < this._dispatches.length; i++) {
            const disp = this._dispatches[i];
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
            console.log('Not logged in, attempting to create anonymous user...');
            this.loginData = await api.anonymous(this.proxy ? this.proxy : '');
        }

        this.matchmakerSocket = new WebSocket('wss://shellshock.io/matchmaker/', {
            headers: {
                'user-agent': USER_AGENT,
                'accept-language': 'en-US,en;q=0.9'
            },
            agent: this.useProxy ? new SocksProxyAgent(this.proxy) : null
        });

        this.matchmakerSocket.onopen = () => {
            this.matchmakerSocket.send(JSON.stringify({
                command: 'joinGame',
                id: code,
                observe: false,
                sessionId: this.loginData.sessionId
            }))
        }

        this.matchmakerSocket.onmessage = (msg) => {
            let mes;

            try {
                mes = JSON.parse(msg.data);
            } catch {
                console.log('Error parsing message:', msg.data);
            }

            if (mes.command == 'gameFound') {
                this.game.raw = mes;
                delete this.game.raw.command; // pissed me off
                this.game.code = code.toUpperCase();
                this.gameFound = true;
            } else { console.log(mes); }

            if (mes.error && mes.error == 'gameNotFound') { throw new Error(`Game ${code} not found (likely expired).`) }

        }

        while (!this.gameFound) { await new Promise(r => setTimeout(r, 10)); }

    }
    #onGameMesssage(msg) { // to minify with vscode
        CommIn.init(msg.data);

        let out;
        const cmd = CommIn.unPackInt8U();

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
                out.packString(this.game.raw.uuid); // game id

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
                this.game.gameModeId = CommIn.unPackInt8U(); // aka gameType
                this.game.gameMode = GameModesById[this.game.gameModeId];
                // console.log("Gametype:", this.game.gameMode, this.game.gameModeId);
                this.game.mapIdx = CommIn.unPackInt8U();
                this.game.map = Maps[this.game.mapIdx];
                // console.log("Map:", this.game.map);
                this.game.playerLimit = CommIn.unPackInt8U();
                // console.log("Player limit:", this.game.playerLimit);
                this.game.isGameOwner = CommIn.unPackInt8U() == 1;
                // console.log("Is game owner:", this.game.isGameOwner);
                this.game.isPrivate = CommIn.unPackInt8U() == 1;
                // console.log("Is private game:", this.game.isPrivate);

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
                    console.log('Received but did not handle a:', Object.entries(CommCode).filter(([, v]) => v == cmd)[0][0], cmd);
                    // packet could potentially not exist, then [0][0] will error
                } catch { null }
                console.log('!!! You shouldn\'t be seeing this!');
                console.log('!!! This message means the startup sequence received an unexpected packet.');
                console.log('!!! Try refreshing comm codes. If you still see this error, contact hijinks');
                throw new Error('Unexpected packet received during startup: ' + cmd);

        }

    }
    async join(code) {
        await this.matchmaker(code);

        console.log(`Joining ${code} using proxy ${this.useProxy ? this.proxy : 'none'}`);

        this.gameSocket = new WebSocket(`wss://${this.game.raw.subdomain}.shellshock.io/game/${this.game.raw.id}`, {
            headers: {
                'user-agent': USER_AGENT,
                'accept-language': 'en-US,en;q=0.9'
            },
            agent: this.useProxy ? new SocksProxyAgent(this.proxy) : null
        });

        this.gameSocket.binaryType = 'arraybuffer';

        this.gameSocket.onopen = () => {
            // console.log('Successfully connected to game server.');
        }

        this.gameSocket.onmessage = this.#onGameMesssage.bind(this);

        this.gameSocket.onclose = (e) => {
            console.log('Game socket closed:', e.code, Object.entries(CloseCode).filter(([, v]) => v == e.code));
            console.log(this.gameSocket)
        }

        while (!this.state.joinedGame) { await new Promise(r => setTimeout(r, 1)); }

        const out = CommOut.getBuffer();
        out.packInt8(CommCode.clientReady);
        out.send(this.gameSocket);

        this.gameSocket.onmessage = (msg) => {
            this._packetQueue.push(msg.data);
        }

        this.game.code = code;

        console.log(`Successfully joined ${code}. Startup to join time: ${Date.now() - this.initTime} ms`);

        if (this.autoUpdate) {
            console.log('autoUpdate enabled...');
            setInterval(() => this.update(), this.updateInterval);
        }
    }
    update() {
        if (!this.state.joinedGame) { throw new Error('Not playing, can\'t update. '); }

        this.nUpdates++;

        if (this._packetQueue.length === 0 && this._dispatches.length === 0) { return; }

        let packet;
        while ((packet = this._packetQueue.shift()) !== undefined) { this.handlePacket(packet); }

        this.drain();

        if (Date.now() - this.lastUpdateTime >= 100 ) {
            this._liveCallbacks.push(...this._hooks['tick'].map((fn) => fn.apply(this, [this])));
            // Send out update packet
            const out = CommOut.getBuffer();
            out.packInt8(CommCode.syncMe);
            out.packInt8(0); // stateIdx
            out.packInt8(0); // serverStateIdx
            for (let i = 0; i < 3; i++) {
                out.packInt8(this.controlKeys); // controlkeys
                out.packInt8(0); // shots (unused) 
                out.packRadU(this.state.view.yaw); // yaw
                out.packRad(this.state.view.pitch); // pitch
            }
            out.send(this.gameSocket);
            /*
            var out = CommOut.getBuffer();
      out.packInt8(CommCode.syncMe);
      out.packInt8(Math.mod(me.stateIdx - FramesBetweenSyncs, stateBufferSize));
      out.packInt8(me.serverStateIdx);
      var startIdx = Math.mod(me.stateIdx - FramesBetweenSyncs, stateBufferSize);
      for (var i2 = 0; i2 < FramesBetweenSyncs; i2++) {
        var idx = Math.mod(startIdx + i2, stateBufferSize);
        out.packInt8(me.stateBuffer[idx].controlKeys);
        out.packInt8(me.stateBuffer[idx].shots);
        out.packRadU(me.stateBuffer[idx].yaw_);
        out.packRad(me.stateBuffer[idx].pitch_);
        me.stateBuffer[Math.mod(idx - stateBufferSize / 2, stateBufferSize)].shots = 0;
      }
      out.send(ws);
            */
        }

        let cb;
        while ((cb = this._liveCallbacks.shift()) !== undefined) { cb(); }

        this.lastUpdateTime = Date.now();
    }
    #processChatPacket() {
        const id = CommIn.unPackInt8U();
        const msgFlags = CommIn.unPackInt8U();
        const text = CommIn.unPackString().valueOf();
        const player = this.state.players[Object.keys(this.state.players).find(p => this.state.players[p].id == id)];
        // console.log(`Player ${player.name}: ${text} (flags: ${msgFlags})`);
        // console.log(`Their position: ${player.state.position.x}, ${player.state.position.y}, ${player.state.position.z}`);
        this._hooks['chat'].forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, player, text, msgFlags])));
    }
    #processAddPlayerPacket() {
        const id_ = CommIn.unPackInt8U();
        const uniqueId = CommIn.unPackString();
        const name = CommIn.unPackString();
        const safename = CommIn.unPackString(); // ??? (a)
        const charClass = CommIn.unPackInt8U();
        const playerData = {
            id_: id_,
            uniqueId_: uniqueId,
            name_: name,
            safename_: safename,
            charClass_: charClass,
            team_: CommIn.unPackInt8U(),
            primaryWeaponItem_: findItemById(CommIn.unPackInt16U()),
            secondaryWeaponItem_: findItemById(CommIn.unPackInt16U()), // b
            shellColor_: CommIn.unPackInt8U(),
            hatItem_: findItemById(CommIn.unPackInt16U()),
            stampItem_: findItemById(CommIn.unPackInt16U()),
            unknownInt8: CommIn.unPackInt8(), // c
            otherUnknownInt8: CommIn.unPackInt8(),
            grenadeItem_: findItemById(CommIn.unPackInt16U()),
            meleeItem_: findItemById(CommIn.unPackInt16U()),
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
        playerData.weaponData = getWeaponFromMeshName(playerData.primaryWeaponItem_.item_data.meshName);
        if (!this.state.players[playerData.id_]) {
            this.state.players[playerData.id_] = new InGamePlayer(playerData.id_, playerData.team_, playerData);
        }

        this._hooks['join'].forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, this.state.players[playerData.id_]])));
        // console.log(`I am ${this.state.me.id}, player ${playerData.id_} joined.`);
        const unp = CommIn.unPackInt8U();
        if (unp == CommCode.addPlayer) { // there is another player stacked
            this.#processAddPlayerPacket();
        }
    }

    #processRespawnPacket() {
        const id = CommIn.unPackInt8U();
        const seed = CommIn.unPackInt16U();
        const x = CommIn.unPackFloat();
        const y = CommIn.unPackFloat();
        const z = CommIn.unPackFloat();
        const rounds0 = CommIn.unPackInt8U();
        const store0 = CommIn.unPackInt8U();
        const rounds1 = CommIn.unPackInt8U();
        const store1 = CommIn.unPackInt8U();
        const grenades = CommIn.unPackInt8U();
        const player = id == this.state.me.id ? this : this.state.players[id];
        if (player) {
            player.state.playing = true;
            player.state.randomSeed = seed;
            player.state.weapons[0].ammo.rounds = rounds0;
            player.state.weapons[0].ammo.store = store0;
            player.state.weapons[1].ammo.rounds = rounds1;
            player.state.weapons[1].ammo.store = store1;

            if (player == this) {
                // import weaponData because it broked
                player.state.weaponData = this.state.players[this.state.me.id].state.weaponData;
            }

            player.state.grenades = grenades;
            player.state.position = { x: x, y: y, z: z };
            // console.log(`Player ${player.name} respawned at ${x}, ${y}, ${z}`);
            this._hooks['respawn'].forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, player])));
        } else {
            // console.log(`Player ${id} not found. (me: ${this.state.me.id}) (respawn)`);
        }
    }
    #processExternalSyncPacket() {
        const id = CommIn.unPackInt8U();
        const x = CommIn.unPackFloat();
        const y = CommIn.unPackFloat();
        const z = CommIn.unPackFloat();
        const climbing = CommIn.unPackInt8U();
        const player = this.state.players[id];
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
        if (!player.state.jumping || Math.abs(player.state.position.y - y) > 0.5) { player.state.position.y = y; }

        player.state.position.z = z;
        player.state.buffer[0].x = x;
        player.state.buffer[0].y = y;
        player.state.buffer[0].z = z;
        player.state.climbing = climbing;
        // console.log(`Player ${player.name} is now at ${x}, ${y}, ${z} (climbing = ${climbing})`);
    }
    #processPausePacket() {
        const id = CommIn.unPackInt8U();
        const player = this.state.players[id];
        if (player) {
            player.state.playing = false;
            // console.log(`Player ${player.name} paused.`);
            this._hooks['pause'].forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, player])));
        }
    }
    #processSwapWeaponPacket() {
        const id = CommIn.unPackInt8U();
        const weaponIdx = CommIn.unPackInt8U();

        const player = this.state.players[id];
        if (player) {
            player.state.weapon = weaponIdx;
        }
    }
    #processDeathPacket() {
        const killedId = CommIn.unPackInt8U();
        const byId = CommIn.unPackInt8U();
        // const rs = CommIn.unPackInt8U();

        const killedPlayer = killedId == this.state.me.id ? this : this.state.players[killedId];
        const byPlayer = byId == this.state.me.id ? this : this.state.players[byId];

        /*
        const byPlayerLastDmg = CommIn.unPackInt8U();
        const killedByPlayerLastDmg = CommIn.unPackInt8U();
        */

        if (killedPlayer) {
            killedPlayer.state.playing = false;
            killedPlayer.state.kills = 0;
            killedPlayer.lastDeathTime = Date.now();
            // console.log(`Player ${killedPlayer.name} died.`);
        }

        if (byPlayer) { byPlayer.state.kills++; }
        // console.log(`Player ${byPlayer.name} is on a streak of ${byPlayer.state.kills} kills.`);

        this._hooks['death'].forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, killedPlayer, byPlayer])));
    }

    #processFirePacket() {
        const id = CommIn.unPackInt8U(); // there should be 6 floats after this, but that's irrelevant for our purposes 
        const player = this.state.players[id];
        this._hooks['fire'].forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, player])));
    }

    #processCollectPacket() {
        const id = CommIn.unPackInt8U();
        const type = CommIn.unPackInt8U();
        const applyToWeaponIdx = CommIn.unPackInt8U();
        const itemId = CommIn.unPackInt16U();
        const AMMO = 0; const GRENADE = 1;
        if (id == this.state.me.id) {
            if (type == AMMO) {
                return; // FIXME: Implement
            } else if (type == GRENADE) {
                this.state.grenades >= 3 ? this.state.grenades = 3 : this.state.grenades++;
            } else {
                console.log('#processCollectPacket: Invalid collect type', type);
            }
        }

        this._hooks['collect'].forEach((fn) => {
            this._liveCallbacks.push(fn.apply(this, [this, this.state.players[id], type, applyToWeaponIdx, itemId]))
        });
    }

    #processHitThemPacket() {
        const id = CommIn.unPackInt8U();
        const hp = CommIn.unPackInt8U();
        const player = this.state.players[id];
        player.state.hp = hp;
    }

    #processReloadPacket() {
        return;
    }

    handlePacket(packet) {
        CommIn.init(packet);
        this._hooks['packet'].forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, packet])));
        const cmd = CommIn.unPackInt8U();
        switch (cmd) {
            case CommCode.chat:
                this.#processChatPacket(packet);
                break;

            case CommCode.addPlayer:
                this.#processAddPlayerPacket(packet);
                break;

            case CommCode.respawn:
                this.#processRespawnPacket(packet);
                break;

            case CommCode.swapWeapon:
                this.#processSwapWeaponPacket(packet);
                break;

            case CommCode.syncThem:
                this.#processExternalSyncPacket(packet);
                break;

            case CommCode.pause:
                this.#processPausePacket(packet);
                break;

            case CommCode.die:
                this.#processDeathPacket(packet);
                break;

            case CommCode.fire:
                this.#processFirePacket(packet);
                break;

            case CommCode.collectItem:
                this.#processCollectPacket(packet);
                break;

            case CommCode.hitThem:
                this.#processHitThemPacket(packet);
                break;

            case CommCode.reload:
                this.#processReloadPacket(packet);
                break;

            default:
                console.log(`I got but did not handle a: ${Object.entries(CommCode).filter(([, v]) => v == cmd)[0][0]} (${cmd})`);
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