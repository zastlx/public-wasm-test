import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { USER_AGENT } from 'src/constants';

const { data: js } = await axios.get('https://shellshock.io/js/shellshock.js', {
    headers: {
        'User-Agent': USER_AGENT
    }
});

const match = js.match(/\[\{filename.*?\}\]/)?.[0];

// eslint-disable-next-line prefer-const
let parsed = '';

eval(`parsed = ${match}`);

fs.writeFileSync(path.join(import.meta.dirname, '..', 'maps.json'), JSON.stringify(parsed, null, 4));