import Matchmaker from '../src/matchmaker.js';

const mm = new Matchmaker();

await mm.getRegions();

let randomRegion = mm.getRandomRegion();
console.log('selected random region', randomRegion);

let randomGamemode = mm.getRandomGameMode();
console.log('selected random gamemode', randomGamemode);

let games = await mm.findPublicGame({
    region: randomRegion,
    mode: randomGamemode
})

console.log('found a game!', games);