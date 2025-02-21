
import { SocksProxyAgent } from 'socks-proxy-agent';
import { WebSocket } from 'ws';

import api from '#api';

import comm, { CommIn, CommOut, updatePacketConstants } from '#comm';

import GamePlayer from './bot/GamePlayer.js';

import {
    CollectTypes,
    CoopStagesById,
    CoopStates,
    findItemById,
    GameActions,
    GameModesById,
    GameOptionFlags,
    getWeaponFromMeshName,
    Maps,
    ShellStreak,
    USER_AGENT
} from './constants.js';

const consts = await updatePacketConstants();
const CommCode = consts[0];
const CloseCode = consts[1];

class Bot {
    // params.name - the bot name
    // params.proxy - a socks(4|5) proxy
    // params.doUpdate - whether to auto update
    // params.updateInterval - the auto update interval
    // params.doPing - whether to auto ping (for bot.<ping>)
    // params.pingInterval - the ping interval
    constructor(params = {}) {
        this.proxy = params.proxy || '';
        this.name = params.name || Math.random().toString(36).substring(8);

        this.autoPing = params.doPing || true;
        this.autoUpdate = params.doUpdate || true;

        this.pingInterval = params.pingInterval || 1000;
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

        // private information NOT FOR OTHER PLAYERS!!
        this.state = {
            loggedIn: false,
            gameFound: false,

            // once we implement more packets these may be moved to "players"
            reloading: false,
            swappingGun: false,
            usingMelee: false
        }

        this.players = {}
        this.me = new GamePlayer(this.id, 0, {})

        this.game = {
            raw: {}, // matchmaker response
            code: '',

            // data given on sign in
            gameModeId: 0, // assume ffa
            gameMode: GameModesById[0], // assume ffa
            mapIdx: 0,
            map: {
                filename: '',
                hash: '',
                name: '',
                modes: {
                    FFA: false,
                    Teams: false,
                    Spatula: false,
                    King: false
                },
                availability: 'both',
                numPlayers: '18'
            },
            playerLimit: 0,
            isGameOwner: false,
            isPrivate: true,

            // game options
            options: {
                gravity: 1,
                damage: 1,
                healthRegen: 1,
                locked: false,
                noTeamChange: false,
                noTeamShuffle: false,
                // array of weapons from eggk to trihard
                // false = alloed to use
                // true = cannot use
                weaponsDisabled: Array(7).fill(false),
                mustUseSecondary: false // if weaponsDisabled is ALL true
            },

            // data from metaGame
            teamScore: [0, 0, 0], // [0, blue, red] - no clue what 1st index is for

            // data from spatula game
            spatula: {
                coords: { x: 0, y: 0, z: 0 },
                controlledBy: 0,
                controlledByTeam: 0
            },

            // data from kotc
            stage: CoopStates.capturing,
            activeZone: 0,
            capturing: 0,
            captureProgress: 0,
            numCapturing: 0,
            stageName: '',
            capturePercent: 0.0
        }

        this.loginData = null;

        this._dispatches = [];
        this._packetQueue = [];

        this.gameSocket = null;
        this.matchmakerSocket = null;

        this.ping = 0;
        this.lastPingTime = -1;

        this.lastDeathTime = -1;
        this.lastChatTime = -1;

        this.lastUpdateTime = -1;
        this.nUpdates = 0;

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
            agent: this.proxy ? new SocksProxyAgent(this.proxy) : null
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
                this.me.id = CommIn.unPackInt8U();
                // console.log("My id is:", this.me.id);
                this.me.team = CommIn.unPackInt8U();
                // console.log("My team is:", this.me.team);
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
                this.lastDeathTime = Date.now();
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

        console.log(`Joining ${code} using proxy ${this.proxy || 'none'}`);

        this.gameSocket = new WebSocket(`wss://${this.game.raw.subdomain}.shellshock.io/game/${this.game.raw.id}`, {
            headers: {
                'user-agent': USER_AGENT,
                'accept-language': 'en-US,en;q=0.9'
            },
            agent: this.proxy ? new SocksProxyAgent(this.proxy) : null
        });

        this.gameSocket.binaryType = 'arraybuffer';

        this.gameSocket.onopen = () => {
            // console.log('Successfully connected to game server.');
        }

        this.gameSocket.onmessage = this.#onGameMesssage.bind(this);

        this.gameSocket.onclose = (e) => {
            console.log('Game socket closed:', e.code, Object.entries(CloseCode).filter(([, v]) => v == e.code));
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

        if (this.autoPing) {
            console.log('autoPing enabled...');
            const out = CommOut.getBuffer();
            out.packInt8(CommCode.ping);
            out.send(this.gameSocket);
            this.lastPingTime = Date.now();
        }
    }

    update() {
        if (!this.state.joinedGame) { throw new Error('Not playing, can\'t update. '); }

        this.nUpdates++;

        if (this._packetQueue.length === 0 && this._dispatches.length === 0) { return; }

        let packet;
        while ((packet = this._packetQueue.shift()) !== undefined) { this.handlePacket(packet); }

        this.drain();

        if (Date.now() - this.lastUpdateTime >= 50) {
            this._liveCallbacks.push(...this._hooks.tick.map((fn) => fn.apply(this, [this])));
            // Send out update packet
            const out = CommOut.getBuffer();
            out.packInt8(CommCode.syncMe);
            out.packInt8(Math.random() * 128 | 0); // stateIdx
            out.packInt8(this.me.serverStateIdx); // serverStateIdx
            for (let i = 0; i < 3; i++) {
                out.packInt8(this.controlKeys); // controlkeys
                out.packInt8(0); // shots (unused)
                out.packRadU(this.me.view.yaw); // yaw
                out.packRad(this.me.view.pitch); // pitch
                out.packInt8(100); // ??? 
            }
            out.send(this.gameSocket);
            this.lastUpdateTime = Date.now();
        }

        let cb;
        while ((cb = this._liveCallbacks.shift()) !== undefined) { cb(); }

    }

    #processChatPacket() {
        const id = CommIn.unPackInt8U();
        const msgFlags = CommIn.unPackInt8U();
        const text = CommIn.unPackString().valueOf();
        const player = this.players[Object.keys(this.players).find(p => this.players[p].id == id)];
        // console.log(`Player ${player.name}: ${text} (flags: ${msgFlags})`);
        // console.log(`Their position: ${player.position.x}, ${player.position.y}, ${player.position.z}`);
        this._hooks.chat.forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, player, text, msgFlags])));
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
        if (!this.players[playerData.id_]) {
            this.players[playerData.id_] = new GamePlayer(playerData.id_, playerData.team_, playerData);
        }

        if (this.me.id == playerData.id_) {
            this.me = this.players[playerData.id_];
        }

        this._hooks.join.forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, this.players[playerData.id_]])));
        // console.log(`I am ${this.me.id}, player ${playerData.id_} joined.`);
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
        const player = id == this.me.id ? this.me : this.players[id];
        if (player) {
            player.playing = true;
            player.randomSeed = seed;

            player.weapons[0].ammo.rounds = rounds0;
            player.weapons[0].ammo.store = store0;
            player.weapons[1].ammo.rounds = rounds1;
            player.weapons[1].ammo.store = store1;

            player.grenades = grenades;
            player.position = { x: x, y: y, z: z };
            // console.log(`Player ${player.name} respawned at ${x}, ${y}, ${z}`);
            this._hooks.respawn.forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, player])));
        } else {
            // console.log(`Player ${id} not found. (me: ${this.me.id}) (respawn)`);
        }
    }

    #processExternalSyncPacket() {
        const id = CommIn.unPackInt8U();
        const x = CommIn.unPackFloat();
        const y = CommIn.unPackFloat();
        const z = CommIn.unPackFloat();
        const climbing = CommIn.unPackInt8U();
        const player = this.players[id];
        if (!player || player.id == this.me.id) {
            for (let i2 = 0; i2 < 3 /* FramesBetweenSyncs */; i2++) {
                CommIn.unPackInt8U();
                CommIn.unPackRadU();
                CommIn.unPackRad();
            }
        }

        let yaw, pitch;
        for (let i2 = 0; i2 < 3; i2++) {
            player.buffer[i2].controlKeys = CommIn.unPackInt8U();
            yaw = CommIn.unPackRadU();
            if (!isNaN(yaw)) { player.buffer[i2].yaw_ = yaw }
            pitch = CommIn.unPackRad();
            if (!isNaN(pitch)) { player.buffer[i2].pitch_ = pitch }
        }

        player.position.x = x;

        if (!player.jumping || Math.abs(player.position.y - y) > 0.5) {
            player.position.y = y;
        }

        player.position.z = z;
        player.buffer[0].x = x;
        player.buffer[0].y = y;
        player.buffer[0].z = z;
        player.climbing = climbing;
        // console.log(`Player ${player.name} is now at ${x}, ${y}, ${z} (climbing = ${climbing})`);
    }

    #processPausePacket() {
        const id = CommIn.unPackInt8U();
        const player = this.players[id];
        if (player) {
            player.playing = false;
            // console.log(`Player ${player.name} paused.`);
            this._hooks.pause.forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, player])));
        }
    }

    #processSwapWeaponPacket() {
        const id = CommIn.unPackInt8U();
        const newWeaponId = CommIn.unPackInt8U();

        const player = this.players[id];
        if (player) {
            player.weapon = newWeaponId;
        }
    }

    #processDeathPacket() {
        const killedId = CommIn.unPackInt8U();
        const byId = CommIn.unPackInt8U();
        // const rs = CommIn.unPackInt8U();

        const killedPlayer = killedId == this.me.id ? this : this.players[killedId];
        const byPlayer = byId == this.me.id ? this : this.players[byId];

        /*
        const byPlayerLastDmg = CommIn.unPackInt8U();
        const killedByPlayerLastDmg = CommIn.unPackInt8U();
        */

        if (killedPlayer) {
            killedPlayer.playing = false;
            killedPlayer.kills = 0;
            killedPlayer.lastDeathTime = Date.now();
            // console.log(`Player ${killedPlayer.name} died.`);
        }

        if (byPlayer) { byPlayer.kills++; }
        // console.log(`Player ${byPlayer.name} is on a streak of ${byPlayer.kills} kills.`);

        this._hooks.death.forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, killedPlayer, byPlayer])));
    }

    #processFirePacket() {
        const id = CommIn.unPackInt8U(); // there should be 6 floats after this, but that's irrelevant for our purposes 
        const player = this.players[id];
        this._hooks.fire.forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, player])));
    }

    #processCollectPacket() {
        const playerId = CommIn.unPackInt8U();
        const type = CommIn.unPackInt8U();
        const applyToWeaponIdx = CommIn.unPackInt8U();
        const itemId = CommIn.unPackInt16U();

        const player = this.players[playerId];

        if (type == CollectTypes.AMMO) {
            return; // TODO: Implement
        }

        if (type == CollectTypes.GRENADE) {
            player.grenades >= 3 ? player.grenades = 3 : player.grenades++;
        }

        this._hooks.collect.forEach((fn) => {
            this._liveCallbacks.push(fn.apply(this, [this, player, type, applyToWeaponIdx, itemId]))
        });
    }

    #processHitThemPacket() {
        const id = CommIn.unPackInt8U();
        const hp = CommIn.unPackInt8U();
        const player = this.players[id];
        player.hp = hp;
    }

    #processSyncMePacket() {
        const id = CommIn.unPackInt8U();
        const player = this.players[id];

        CommIn.unPackInt8U(); // stateIdx

        const serverStateIdx = CommIn.unPackInt8U();
        player.serverStateIdx = serverStateIdx;

        player.position.x = CommIn.unPackFloat();
        player.position.y = CommIn.unPackFloat();
        player.position.z = CommIn.unPackFloat();
        return;
    }

    #processEventModifierPacket() {
        const out = CommOut.getBuffer();
        out.packInt8(CommCode.eventModifier);
        out.send(this.gameSocket);
    }

    #processRemovePlayerPacket() {
        const id = CommIn.unPackInt8U();
        delete this.players[id.toString()];
    }

    #processGameStatePacket() {
        if (this.game.gameModeId == 2) { // spatula
            this.game.teamScore[1] = CommIn.unPackInt16U();
            this.game.teamScore[2] = CommIn.unPackInt16U();

            const spatulaCoords = {
                x: CommIn.unPackFloat(),
                y: CommIn.unPackFloat(),
                z: CommIn.unPackFloat()
            };

            const controlledBy = CommIn.unPackInt8U();
            const controlledByTeam = CommIn.unPackInt8U();

            this.game.spatula = {
                coords: spatulaCoords,
                controlledBy: controlledBy,
                controlledByTeam: controlledByTeam
            };
        } else if (this.game.gameModeId == 3) { // kotc
            this.game.stage = CommIn.unPackInt8U(); // constants.CoopStates
            this.game.activeZone = CommIn.unPackInt8U(); // a number to represent which 'active zone' kotc is using
            this.game.capturing = CommIn.unPackInt8U(); // the team capturing, named "teams" in shell src
            this.game.captureProgress = CommIn.unPackInt16U(); // progress of the coop capture
            this.game.numCapturing = CommIn.unPackInt8U(); // number of players capturing - number/1000
            this.game.teamScore[1] = CommIn.unPackInt8U(); // team 1 (blue) score
            this.game.teamScore[2] = CommIn.unPackInt8U(); // team 2 (red) score

            // not in shell, for utility purposes =D
            this.game.stageName = CoopStagesById[this.game.stage]; // name of the stage ('start' / 'capturing' / 'etc')
            this.game.capturePercent = this.game.captureProgress / 1000; // progress of the capture as a percentage
        }

        if (this.game.gameModeId !== 2) {
            delete this.game.spatula;
        }

        if (this.game.gameModeId !== 3) {
            delete this.game.stage;
            delete this.game.activeZone;
            delete this.game.capturing;
            delete this.game.captureProgress;
            delete this.game.numCapturing
        }

        if (this.game.gameModeId !== 3 && this.game.gameModeId !== 2) {
            delete this.game.teamScore;
        }
    }

    #processBeginStreakPacket() {
        const id = CommIn.unPackInt8U();
        const ksType = CommIn.unPackInt8U();
        const player = this.players[id];

        switch (ksType) {
            case ShellStreak.HardBoiled:
                player.hpShield = 100;
                player.streakRewards.push(ShellStreak.HardBoiled);
                break;

            case ShellStreak.EggBreaker:
                player.streakRewards.push(ShellStreak.EggBreaker);
                break;

            case ShellStreak.Restock:
                // TODO: player.weaponData is it implemented?
                break;

            case ShellStreak.OverHeal:
                player.hp = Math.min(200, player.hp + 100);
                player.streakRewards.push(ShellStreak.OverHeal);
                // TODO: figure otu how overheal counts down
                break;

            case ShellStreak.DoubleEggs:
                player.streakRewards.push(ShellStreak.DoubleEggs);
                break;

            case ShellStreak.MiniEgg:
                player.streakRewards.push(ShellStreak.MiniEgg);
                break;
        }
    }

    #processEndStreakPacket() {
        const id = CommIn.unPackInt8U();
        const ksType = CommIn.unPackInt8U();
        const player = this.players[id];

        const streaks = [
            ShellStreak.EggBreaker,
            ShellStreak.OverHeal,
            ShellStreak.DoubleEggs,
            ShellStreak.MiniEgg
        ];

        if (streaks.includes(ksType) && player.streakRewards.includes(ksType)) {
            player.streakRewards = player.streakRewards.filter((r) => r != ksType);
        }
    }

    #processHitShieldPacket() {
        const hb = CommIn.unPackInt8U();
        const hp = CommIn.unPackInt8U();

        this.me.hpShield = hb;
        this.me.hp = hp;

        if (this.me.hpShield <= 0) {
            this.me.streakRewards = this.me.streakRewards.filter((r) => r != ShellStreak.HardBoiled);
        }
    }

    #processGameOptionsPacket() {
        this.game.options
        let gravity = CommIn.unPackInt8U();
        let damage = CommIn.unPackInt8U();
        let healthRegen = CommIn.unPackInt8U();

        if (gravity < 1 || gravity > 4) { gravity = 4; }
        if (damage < 0 || damage > 8) { damage = 4; }
        if (healthRegen > 16) { healthRegen = 4; }

        this.game.options.gravity = gravity / 4;
        this.game.options.damage = damage / 4;
        this.game.options.healthRegen = healthRegen / 4;

        const rawFlags = CommIn.unPackInt8U();

        Object.keys(GameOptionFlags).forEach((optionFlagName) => {
            const value = rawFlags & GameOptionFlags[optionFlagName] ? 1 : 0;
            this.game.options[optionFlagName] = value;
        });

        this.game.options.weaponsDisabled = Array.from({ length: 7 }, () => CommIn.unPackInt8U() === 1);
        this.game.options.mustUseSecondary = this.game.options.weaponsDisabled.every((v) => v);
        return false;
    }

    #processGameActionPacket() {
        const action = CommIn.unPackInt8U();

        if (action == GameActions.pause) {
            console.log('settings changed, gameOwner changed game settings, force paused');
            this.me.playing = false;
        }

        if (action == GameActions.reset) {
            console.log('owner reset game');

            this.me.kills = 0;
            this.game.teamScore = [0, 0, 0];

            this.game.spatula.controlledBy = 0;
            this.game.spatula.controlledByTeam = 0;
            this.game.spatula.coords = { x: 0, y: 0, z: 0 };

            this.game.stage = CoopStates.capturing;
            this.game.activeZone = 0;
            this.game.capturing = 0;
            this.game.captureProgress = 0;
            this.game.numCapturing = 0;
            this.game.stageName = CoopStagesById[CoopStates.capturing];
            this.game.capturePercent = 0.0;
        }
    }

    #processPingPacket() {
        this.ping = Date.now() - this.lastPingTime;

        setTimeout(() => {
            const out = CommOut.getBuffer();
            out.packInt8(CommCode.ping);
            out.send(this.gameSocket);
            this.lastPingTime = Date.now();
        }, this.pingInterval);
    }

    handlePacket(packet) {
        CommIn.init(packet);
        this._hooks.packet.forEach((fn) => this._liveCallbacks.push(fn.apply(this, [this, packet])));
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

            case CommCode.syncMe:
                this.#processSyncMePacket(packet);
                break;

            case CommCode.eventModifier:
                this.#processEventModifierPacket(packet);
                break;

            case CommCode.removePlayer:
                this.#processRemovePlayerPacket(packet);
                break;

            case CommCode.metaGameState:
                this.#processGameStatePacket(packet);
                break;

            case CommCode.beginShellStreak:
                this.#processBeginStreakPacket(packet);
                break;

            case CommCode.endShellStreak:
                this.#processEndStreakPacket(packet);
                break;

            case CommCode.hitMeHardBoiled:
                this.#processHitShieldPacket(packet);
                break;

            case CommCode.gameOptions:
                this.#processGameOptionsPacket(packet);
                break;

            case CommCode.gameAction:
                this.#processGameActionPacket(packet);
                break;

            case CommCode.ping:
                this.#processPingPacket(packet);
                break;

            case CommCode.reload:
            case CommCode.spawnItem:
            case CommCode.explode:
            case CommCode.melee:
            case CommCode.throwGrenade:
                // do nothing
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

export default Bot;