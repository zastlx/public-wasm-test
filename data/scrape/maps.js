import fs from 'fs';
import path from 'path';

import { USER_AGENT } from '../../src/constants.js';

const data = await fetch('https://shellshock.io/js/shellshock.js', {
    headers: {
        'User-Agent': USER_AGENT
    }
});

const js = await data.text();

const match = js.match(/\[\{filename.*?\}\]/)?.[0];

// eslint-disable-next-line prefer-const
let parsed = '';

eval(`parsed = ${match}`);

fs.writeFileSync(
    path.join(import.meta.dirname, '..', 'maps.js'),
    `/* eslint-disable */\nexport const Maps = ${JSON.stringify(parsed, null, 4)};`
);