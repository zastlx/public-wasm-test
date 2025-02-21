const mod = function (n, m) {
    const remain = n % m;
    return remain >= 0 ? remain : remain + m;
};

const PI2 = Math.PI * 2;

const radDifference = function (fromAngle, toAngle) {
    let diff = (fromAngle - toAngle + Math.PI) % PI2 - Math.PI;
    diff = diff < -Math.PI ? diff + PI2 : diff;
    return diff;
};

const setPrecision = function (value) { return Math.round(value * 8192) / 8192 }; // required precision

const calculateYaw = function (pos) {
    return setPrecision(mod(Math.atan2(pos.x, pos.z), PI2));
};

const calculatePitch = function (pos) {
    return setPrecision(-Math.atan2(pos.y, Math.hypot(pos.x, pos.z)) % 1.5);
};

export default class LookAtDispatch {
    idOrName;

    constructor(idOrName) {
        if (typeof idOrName == 'number') {
            this.id = idOrName
        } else if (typeof idOrName == 'string') {
            this.name = idOrName
        }
    }

    check(bot) {
        return bot.me.playing;
    }

    execute(bot) {
        let target;

        if (this.id !== 'undefined') {
            target = bot.players[this.id.toString()];
        } else if (this.name !== 'undefined') {
            target = bot.players.find(player => player.name == this.name);
        }

        console.log(target.position, bot.me.position);

        const directionVector = {
            x: target.position.x - bot.me.position.x,
            y: target.position.y - bot.me.position.y - 0.05,
            z: target.position.z - bot.me.position.z
        }

        console.log('direction vector', directionVector);

        const direction = {
            yawReal: calculateYaw(directionVector),
            pitchReal: calculatePitch(directionVector)
        };

        console.log(direction);

        const yawDiff = radDifference(direction.yawReal, bot.me.view.yaw);
        const pitchDiff = radDifference(direction.pitchReal, bot.me.view.pitch);

        const newYaw = setPrecision(bot.me.view.yaw + yawDiff * 1);
        const newPitch = setPrecision(bot.me.view.pitch + pitchDiff * 1);

        console.log('yawDiff', yawDiff, 'pitchDiff', pitchDiff, 'newYaw', newYaw, 'newPitch', newPitch)

        bot.me.view.yaw = newYaw;
        bot.me.view.pitch = newPitch;
    }
}