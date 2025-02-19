import * as comm from '#comm';

const { CommCode, CommOut } = comm;

class Packet {
    constructor(code, _args) {
        // args = [{type: int8, val: val}, {type: string, val: val}, etc]
        this.out = CommOut.getBuffer();
        this.out.packInt8(code);
        if (_args) {
            for (const arg of _args) {
                switch (arg.type) {
                    case 'int8':
                        this.out.packInt8(arg.val);
                        break;
                    case 'int8u':
                        this.out.packInt8U(arg.val);
                        break;
                    case 'string':
                        this.out.packString(arg.val);
                        break;
                    case 'float': 
                        this.out.packFloat(arg.val);
                        break;
                }
            }
        }
    }
    get length() {
        return this.buf.length;
    }
    execute(ws) {
        this.out.send(ws);
    }
}

function RespawnPacket() {
    return new Packet(CommCode.requestRespawn)
}

function FirePacket(player) {
    // TODO: finish
    return new Packet(CommCode.fire, [
        { type: 'int8', val: player.id }
    ])
}

function MeleePacket() {
    return new Packet(CommCode.melee)
}

function ChatPacket(msg) {
    return new Packet(CommCode.chat, [
        { type: 'string', val: msg }
    ]);
}

function SwapWeaponPacket(player) {
    return new Packet(CommCode.swapWeapon, [
        { type: 'int8', val: player.state.weapon }
    ]);
}

export default {
    Packet,
    RespawnPacket,
    FirePacket,
    MeleePacket,
    ChatPacket,
    SwapWeaponPacket
}