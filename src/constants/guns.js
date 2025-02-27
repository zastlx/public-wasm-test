const Gun = class {
    constructor() {
        this.dmgTypeId = 0;
        this.highPrecision = false;
        this.equipTime = 13;
        this.stowWeaponTime = 13;
        this.accuracy = this.constructor.accuracyMax;
        this.shootingAccuracy = this.constructor.accuracyMax;
        this.movementAccuracy = this.constructor.accuracyMax;
        this.accuracyMax = this.constructor.accuracyMax;
        this.accuracyMin = this.constructor.accuracyMin;
        this.accuracyLoss = this.constructor.accuracyLoss;
        this.accuracyRecover = this.constructor.accuracyRecover;
        this.tracer = 0;
        this.burstQueue = 0;
        this.adsMod = this.constructor.adsMod || 0.5;
        this.movementAccuracyMod = this.constructor.movementAccuracyMod || 1;
    }
};
Gun.reloadBloom = true;
Gun.reloadTimeMod = 1;

// eggk47
const Eggk47 = class _Eggk47 extends Gun {
    constructor() {
        super();
        this.ammo = {
            rounds: 30,
            capacity: 30,
            reload: 30,
            store: 240,
            storeMax: 240,
            pickup: 30
        };
        this.longReloadTime = 205;
        this.shortReloadTime = 160;
    }
};
Eggk47.weaponName = 'EggK-47';
Eggk47.standardMeshName = 'eggk47';
Eggk47.rof = 3;
Eggk47.recoil = 7;
Eggk47.automatic = true;
Eggk47.damage = 20;
Eggk47.totalDamage = 20;
Eggk47.range = 20;
Eggk47.velocity = 1.5;
Eggk47.tracer = 1;

// p90 / scrambler
const DozenGauge = class _DozenGauge extends Gun {
    constructor() {
        super();
        this.ammo = {
            rounds: 2,
            capacity: 2,
            reload: 2,
            store: 24,
            storeMax: 24,
            pickup: 8
        };
        this.longReloadTime = 155;
        this.shortReloadTime = 155;
    }
};
DozenGauge.weaponName = 'Dozen Gauge';
DozenGauge.standardMeshName = 'dozenGauge';
DozenGauge.rof = 8;
DozenGauge.recoil = 10;
DozenGauge.automatic = false;
DozenGauge.damage = 8;
DozenGauge.totalDamage = DozenGauge.damage * 20;
DozenGauge.range = 8;
DozenGauge.velocity = 1;
DozenGauge.tracer = 0;

// free ranger
const CSG1 = class _CSG1 extends Gun {
    constructor() {
        super();
        this.ammo = {
            rounds: 15,
            // Number of rounds currently loaded
            capacity: 15,
            // Magazine capacity
            reload: 15,
            // Number of rounds added per reload
            store: 60,
            // Number of rounds player is carrying for this weapon
            storeMax: 60,
            // Maximum number of rounds player can carry
            pickup: 15
            // Number of rounds added for each ammo drop collected
        };
        this.hasScope = true;
        this.longReloadTime = 225;
        this.shortReloadTime = 165;
        this.highPrecision = true;
    }
};
CSG1.weaponName = 'CSG-1';
CSG1.standardMeshName = 'csg1';
CSG1.rof = 13;
CSG1.recoil = 13;
CSG1.automatic = false;
CSG1.damage = 110;
CSG1.totalDamage = 110;
CSG1.range = 50;
CSG1.velocity = 1.75;
CSG1.tracer = 0;

// secondary / 9mm
const Cluck9mm = class _Cluck9mm extends Gun {
    constructor() {
        super();
        this.ammo = {
            rounds: 15,
            capacity: 15,
            reload: 15,
            store: 60,
            storeMax: 60,
            pickup: 15
        };
        this.longReloadTime = 195;
        this.shortReloadTime = 160;
    }
};

Cluck9mm.weaponName = 'Cluck 9mm';
Cluck9mm.standardMeshName = 'cluck9mm';
Cluck9mm.rof = 4;
Cluck9mm.recoil = 6;
Cluck9mm.automatic = false;
Cluck9mm.damage = 25;
Cluck9mm.totalDamage = 25;
Cluck9mm.range = 15;
Cluck9mm.velocity = 1;
Cluck9mm.tracer = 0;

// rpegg / rpg
const RPEGG = class _RPEGG extends Gun {
    constructor() {
        super();
        this.ammo = {
            rounds: 1,
            capacity: 1,
            reload: 1,
            store: 3,
            storeMax: 3,
            pickup: 1
        };
        this.hasScope = true;
        this.longReloadTime = 170;
        this.shortReloadTime = 170;
    }
};
RPEGG.weaponName = 'RPEGG';
RPEGG.standardMeshName = 'rpegg';
RPEGG.rof = 40;
RPEGG.recoil = 60;
RPEGG.automatic = false;
RPEGG.damage = 140;
RPEGG.radius = 2.75;
RPEGG.totalDamage = RPEGG.damage * RPEGG.radius * 0.5;
RPEGG.range = 45;
RPEGG.minRange = 3;
RPEGG.velocity = 0.4;

// whipper
const SMG = class _SMG extends Gun {
    constructor() {
        super();
        this.ammo = {
            rounds: 40,
            capacity: 40,
            reload: 40,
            store: 200,
            storeMax: 200,
            pickup: 40
        };
        this.longReloadTime = 225;
        this.shortReloadTime = 190;
    }
};
SMG.weaponName = 'SMEGG';
SMG.standardMeshName = 'smg';
SMG.rof = 2;
SMG.recoil = 7;
SMG.automatic = true;
SMG.damage = 15;
SMG.totalDamage = 15;
SMG.range = 20;
SMG.velocity = 1.25;
SMG.tracer = 2;

// crackshot
const M24 = class _M24 extends Gun {
    constructor() {
        super();
        this.ammo = {
            rounds: 1,
            capacity: 1,
            reload: 1,
            store: 12,
            storeMax: 12,
            pickup: 4
        };
        this.hasScope = true;
        this.longReloadTime = 144;
        this.shortReloadTime = 144;
    }
};
M24.weaponName = 'M2DZ';
M24.standardMeshName = 'm24';
M24.rof = 15;
M24.recoil = 20;
M24.automatic = false;
M24.damage = 200;
M24.totalDamage = 15;
M24.range = 60;
M24.velocity = 2;
M24.tracer = 0;

// trihard / tri-hard
const AUG = class _AUG extends Gun {
    constructor() {
        super();
        this.ammo = {
            rounds: 24,
            capacity: 24,
            reload: 24,
            store: 150,
            storeMax: 150,
            pickup: 24
        };
        this.longReloadTime = 205;
        this.shortReloadTime = 160;
    }
};
AUG.weaponName = 'TriHard';
AUG.standardMeshName = 'aug';
AUG.rof = 15;
AUG.recoil = 18;
AUG.automatic = false;
AUG.movementInstability = 2;
AUG.damage = 20;
AUG.totalDamage = 20;
AUG.range = 20;
AUG.velocity = 1.5;
AUG.tracer = 0;
AUG.burst = 3;
AUG.burstRof = 1800 / 600;

Eggk47.damage = 30;
Eggk47.accuracyMax = 0.03;
Eggk47.accuracyMin = 0.15;
Eggk47.accuracyLoss = 0.05;
Eggk47.accuracyRecover = 0.025;
Eggk47.totalDamage = 30;
DozenGauge.damage = 8.5;
DozenGauge.accuracyMax = 0.14;
DozenGauge.accuracyMin = 0.17;
DozenGauge.accuracyLoss = 0.17;
DozenGauge.accuracyRecover = 0.02;
DozenGauge.totalDamage = 170;
DozenGauge.adsMod = 0.6;
DozenGauge.movementAccuracyMod = 0.2;
CSG1.damage = 105;
CSG1.accuracyMax = 4e-3;
CSG1.accuracyMin = 0.3;
CSG1.accuracyLoss = 0.3;
CSG1.accuracyRecover = 0.025;
CSG1.totalDamage = 105;
RPEGG.accuracyMax = 0.015;
RPEGG.accuracyMin = 0.3;
RPEGG.accuracyLoss = 0.3;
RPEGG.accuracyRecover = 0.02;
RPEGG.absoluteMinAccuracy = 0.3;
SMG.damage = 23;
SMG.accuracyMax = 0.06;
SMG.accuracyMin = 0.19;
SMG.accuracyLoss = 0.045;
SMG.accuracyRecover = 0.05;
SMG.totalDamage = 23;
SMG.adsMod = 0.6;
SMG.movementAccuracyMod = 0.7;
M24.damage = 170;
M24.accuracyMax = 0;
M24.accuracyMin = 0.35;
M24.accuracyLoss = 0.1;
M24.accuracyRecover = 0.023;
M24.totalDamage = 170;
M24.movementAccuracyMod = 0.85;
M24.reloadBloom = false;
M24.reloadTimeMod = 0.8;
Cluck9mm.damage = 26;
Cluck9mm.accuracyMax = 0.035;
Cluck9mm.accuracyMin = 0.15;
Cluck9mm.accuracyLoss = 0.09;
Cluck9mm.accuracyRecover = 0.08;
Cluck9mm.totalDamage = 26;
Cluck9mm.adsMod = 0.8;
Cluck9mm.movementAccuracyMod = 0.6;
AUG.damage = 35;
AUG.accuracyMax = 0.03;
AUG.accuracyMin = 0.15;
AUG.accuracyLoss = 0.04;
AUG.accuracyRecover = 0.03;
AUG.totalDamage = 34;
AUG.adsMod = 0.6;
AUG.movementAccuracyMod = 0.8;

export {
    Eggk47,
    DozenGauge,
    CSG1,
    Cluck9mm,
    RPEGG,
    SMG,
    M24,
    AUG
}