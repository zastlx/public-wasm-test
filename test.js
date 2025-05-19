import { process } from './src/wasm/wrapper';

const data = await fetch('https://egg.dance/js/shellshock.js');
const text = await data.text();

console.log('fetched shellshock.js;', text.length, 'bytes');

const balls = await process(text);
console.log(balls);