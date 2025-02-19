import fs from 'fs';
import path from 'path';

import api from '#api';

export class Pool {
    constructor(constructorFn, size) {
        this.size = 0;
        this.originalSize = size;
        this.constructorFn = constructorFn;
        this.objects = [];
        this.idx = 0;
        this.numActive = 0;
        this.expand(size);
    }
    expand(num) {
        for (let i2 = 0; i2 < num; i2++) {
            const obj = this.constructorFn();
            obj.id = i2 + this.size;
            obj.active = false;
            this.objects.push(obj);
        }
        this.size += num;
    }
    retrieve(id) {
        if (id != void 0) {
            while (id >= this.size) { this.expand(this.originalSize); }

            this.numActive++;
            this.objects[id].active = true;
            return this.objects[id];
        }
        let i2 = this.idx;
        do {
            i2 = (i2 + 1) % this.size;
            const obj = this.objects[i2];
            if (!obj.active) {
                this.idx = i2;
                this.numActive++;
                obj.active = true;
                return obj;
            }
        } while (i2 != this.idx);
        this.expand(this.originalSize);
        console.log('Expanding pool for: ' + this.objects[0].constructor.name + ' to: ' + this.size);
        return this.retrieve();
    }
    recycle(obj) {
        obj.active = false;
        this.numActive--;
    }
    forEachActive(fn) {
        for (let i2 = 0; i2 < this.size; i2++) {
            const obj = this.objects[i2];
            if (obj.active === true) { fn(obj, i2); }

        }
    }
}

export class OutBuffer {
    constructor(size) {
        this.idx = 0;
        this.arrayBuffer = new ArrayBuffer(size);
        this.buffer = new Uint8Array(this.arrayBuffer, 0, size);
    }
    send(ws2) {
        const b2 = new Uint8Array(this.arrayBuffer, 0, this.idx);
        ws2.send(b2);
        CommOut.bufferPool.recycle(this);
    }
    packInt8(val) {
        this.buffer[this.idx] = val & 255;
        this.idx++;
    }
    packInt16(val) {
        this.buffer[this.idx] = val & 255;
        this.buffer[this.idx + 1] = val >> 8 & 255;
        this.idx += 2;
    }
    packInt24(val) {
        this.buffer[this.idx] = val & 255;
        this.buffer[this.idx + 1] = val >> 8 & 255;
        this.buffer[this.idx + 2] = val >> 16 & 255;
        this.idx += 3;
    }
    packInt32(val) {
        this.buffer[this.idx] = val & 255;
        this.buffer[this.idx + 1] = val >> 8 & 255;
        this.buffer[this.idx + 2] = val >> 16 & 255;
        this.buffer[this.idx + 3] = val >> 24 & 255;
        this.idx += 4;
    }
    packRadU(val) {
        this.packInt24(val * 2097152);
    }
    packRad(val) {
        this.packInt16((val + Math.PI) * 8192);
    }
    packFloat(val) {
        this.packInt16(val * 256);
    }
    packDouble(val) {
        this.packInt32(val * 1048576);
    }
    packString(str, doMalicious = false) {
        if (typeof str !== 'string') { str = ''; }
        this.packInt8(doMalicious ? 254 : str.length);
        for (let i2 = 0; i2 < str.length; i2++) { this.packInt16(str.charCodeAt(i2)); }

    }
    packLongString(str) {
        if (typeof str !== 'string') { str = ''; }
        this.packInt16(str.length);
        for (let i2 = 0; i2 < str.length; i2++) { this.packInt16(str.charCodeAt(i2)); }

    }
}

export class CommOut {
    static buffer = null;
    static bufferPool = new Pool(() => {
        return new OutBuffer(16384);
    }, 2);
    static getBuffer() {
        const b2 = this.bufferPool.retrieve();
        b2.idx = 0;
        return b2;
    }
}

export class CommIn {
    static buffer;
    static idx;
    static init(buf) {
        this.buffer = new Uint8Array(buf);
        this.idx = 0;
    }
    static isMoreDataAvailable() {
        return Math.max(0, this.buffer.length - this.idx);
    }
    static peekInt8U() {
        return this.buffer[this.idx];
    }
    static unPackInt8U() {
        const i2 = this.idx;
        this.idx++;
        return this.buffer[i2];
    }
    static unPackInt8() {
        const v = this.unPackInt8U();
        return (v + 128) % 256 - 128;
    }
    static unPackInt16U() {
        const i2 = this.idx;
        this.idx += 2;
        return this.buffer[i2] + this.buffer[i2 + 1] * 256;
    }
    static unPackInt24U() {
        const i2 = this.idx;
        this.idx += 3;
        return this.buffer[i2] + this.buffer[i2 + 1] * 256 + this.buffer[i2 + 2] * 65536;
    }
    static unPackInt32U() {
        const i2 = this.idx;
        this.idx += 4;
        return this.buffer[i2] + this.buffer[i2 + 1] * 256 + this.buffer[i2 + 2] * 65536 + this.buffer[i2 + 3] * 16777216;
    }
    static unPackInt16() {
        const v = this.unPackInt16U();
        return (v + 32768) % 65536 - 32768;
    }
    static unPackInt32() {
        const v = this.unPackInt32U();
        return (v + 2147483648) % 4294967296 - 2147483648;
    }
    // Unsigned radians (0 to 6.2831)
    static unPackRadU() {
        return this.unPackInt24U() / 2097152;
    }
    // Signed radians (-3.1416 to 3.1416)
    static unPackRad() {
        const v = this.unPackInt16U() / 8192;
        return v - Math.PI;
    }
    // Float value packing (-327.68 to 327.67)
    static unPackFloat() {
        return this.unPackInt16() / 256;
    }
    static unPackDouble() {
        return this.unPackInt32() / 1048576;
    }
    static unPackString(maxLen) {
        maxLen = maxLen || 255;
        const len = Math.min(this.unPackInt8U(), maxLen);
        return this.unPackStringHelper(len);
    }
    static unPackLongString(maxLen) {
        maxLen = maxLen || 16383;
        const len = Math.min(this.unPackInt16U(), maxLen);
        return this.unPackStringHelper(len);
    }
    static unPackStringHelper(len) {
        const remainder = this.isMoreDataAvailable();
        if (remainder < len) { return 0; }
        let str = new String();
        for (let i2 = 0; i2 < len; i2++) {
            const c = this.unPackInt16U();
            if (c > 0) { str += String.fromCodePoint(c); }
        }
        return str;
    }
}

let lastTime = 0;

const constantsJSONPath = path.join(import.meta.dirname, '..', 'data', 'constants.json');

export async function updatePacketConstants() {
    if (fs.existsSync(constantsJSONPath)) { lastTime = JSON.parse(fs.readFileSync(constantsJSONPath)).lastFetchedAt; }

    let consts;

    if (Date.now() - lastTime > 1000 * 60 * 60 * 24) {
        const rawConsts = await api.fetchConstantsRaw();
        const rawCommCodes = rawConsts.vars.CommCode;
        const rawCloseCodes = rawConsts.vars.CloseCode;

        const commCodeStart = parseInt(rawConsts.vars.CommCodeStart);
        const closeCodeStart = parseInt(rawConsts.vars.CloseCodeStart.replace('e3', '000'));

        const keyRegex = /([a-zA-Z]+)/g

        const commCodeKeys = rawCommCodes.match(keyRegex);
        const closeCodeKeys = rawCloseCodes.match(keyRegex);

        consts = {
            CommCode: {},
            CloseCode: {}
        };

        for (let i = 0; i < commCodeKeys.length; i++) { consts.CommCode[commCodeKeys[i]] = commCodeStart + i; }

        for (let i = 0; i < closeCodeKeys.length; i++) { consts.CloseCode[closeCodeKeys[i]] = closeCodeStart + i; }

        // console.log(consts)

        fs.writeFileSync(constantsJSONPath, JSON.stringify({
            lastFetchedAt: Date.now(),
            data: consts
        }, null, 4));

    } else { consts = JSON.parse(fs.readFileSync(constantsJSONPath)).data; }

    return [consts.CommCode, consts.CloseCode];
}

export const consts = await updatePacketConstants();
export const CommCode = consts[0];
export const CloseCode = consts[1];

export const StatsArr = [
    'kills',
    'deaths',
    'streak',
    'killsCluck9mm',
    'killsGrenade',
    'killsRpegg',
    'killsEggk47',
    'killsScrambler',
    'killsFreeRanger',
    'killsWhipper',
    'killsCrackshot',
    'killsTriHard',
    'killsMelee',
    'killsPrivate',
    'killsPublic',
    'killsKing',
    'killsSpatula',
    'killsTeams',
    'killsFFA',
    'deathsCluck9mm',
    'deathsGrenade',
    'deathsRpegg',
    'deathsEggk47',
    'deathsScrambler',
    'deathsFreeRanger',
    'deathsWhipper',
    'deathsCrackshot',
    'deathsTriHard',
    'deathsMelee',
    'deathsFall',
    'deathsPrivate',
    'deathsPublic',
    'deathsKing',
    'deathsSpatula',
    'deathsTeams',
    'deathsFFA',
    'kotcCaptured',
    'kotcWins'
];

export const ReportReasons = {
    'report_reason_cheating': 1,
    'report_reason_harassment': 2,
    'report_reason_offensive': 4,
    'report_reason_other': 8
}

export default {
    ReportReasons,
    Pool,
    CommIn,
    CommOut,
    updatePacketConstants,
    StatsArr,
    CommCode,
    CloseCode
}