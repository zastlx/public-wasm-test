import * as comm from '#comm';

let { CommCode, CommOut } = comm;


class Packet {
    constructor(code, _args) {
        // args = [{type: int8, val: val}, {type: string, val: val}, etc]
        this.out = CommOut.getBuffer();
        this.out.packInt8(code);
        if (_args) {
            for (let arg of _args) {
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

function FirePacket() {
    return new Packet(CommCode.fire)
}

function MeleePacket() {
    return new Packet(CommCode.melee)
}

function ChatPacket(msg) {
    return new Packet(CommCode.chat, [{ type: 'string', val: msg }]);
}

export default {
    Packet,
    RespawnPacket,
    FirePacket,
    MeleePacket,
    ChatPacket
}