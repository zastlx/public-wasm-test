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

const setPrecision = function (value) { return Math.round(value * 8192) / 8192 }; //required precision

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
        console.log(this)
    }

    check(player) {
        return player.state.playing;
    }

    execute(player) {
        let target;

        if (this.id !== 'undefined') {
            target = player.state.players[this.id.toString()];
        } else if (this.name !== 'undefined') {
            target = player.state.players.find(player => player.name == this.name);
        }

        console.log(target.state.position, player.state.position);

        const directionVector = {
            x: target.state.position.x - player.state.position.x,
            y: target.state.position.y - player.state.position.y - 0.05,
            z: target.state.position.z - player.state.position.z
        }

        console.log('direction vector', directionVector);

        const direction = {
            yawReal: calculateYaw(directionVector),
            pitchReal: calculatePitch(directionVector)
        };

        console.log(direction);

        const yawDiff = radDifference(direction.yawReal, player.state.view.yaw);
        const pitchDiff = radDifference(direction.pitchReal, player.state.view.pitch);

        const newYaw = setPrecision(player.state.view.yaw + yawDiff * 1);
        const newPitch = setPrecision(player.state.view.pitch + pitchDiff * 1);

        console.log('yawDiff', yawDiff, 'pitchDiff', pitchDiff, 'newYaw', newYaw, 'newPitch', newPitch)

        player.state.view.yaw = newYaw;
        player.state.view.pitch = newPitch;
    }
}