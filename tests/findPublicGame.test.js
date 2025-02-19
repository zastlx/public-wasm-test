import Matchmaker from '../src/matchmaker.js';

const mm = new Matchmaker();

await mm.getRegions();

const randomRegion = mm.getRandomRegion();
console.log('selected random region', randomRegion);

const randomGamemode = mm.getRandomGameMode();
console.log('selected random gamemode', randomGamemode);

const games = await mm.findPublicGame({
    region: randomRegion,
    mode: randomGamemode
})

console.log('found a game!', games);

mm.close();