# ShellfBot Documentation

Enabling easy creation of bots since 2025

Why this exists: Several of our projects seemed to rely on the same needs of joining a game and doing some simple tasks. This codebase exists as a unified, elegant, single point we can build upon.

built by hijinks, enjoy

special thanks to BWD for leaking the source, this sped this up by about ten thousand times ❤️


## Architecture Details

After hearing puppy complain about how using lots of workers used lots of memory, the bots are designed such that hundreds or even thousands of bot instances can run on the same thread. This is all handled synchronously. I fucking hate callbacks. There are no callbacks in ShellfBot.

- Most handling the players is via a "manager" (see "Manager class documentation" below) that can handle all the operations for all the players. The manager is a glorified list with a few extra methods. Do not question it.
- Under the hood all the message callbacks are just "push message to the stack" which I don't think will cause any race conditions.
- To keep things ~~callback-free~~ synchronous, the two ways you interact with bots are called hooks and dispatches.

A *hook* listens for a certain event, such as a death, respawn, or chat message. When a callback is attached to a hook and the hook fires, the callback will be called *synchronously* the next time the player updates. If you have a large delay in between update calls, events might not be responded to promptly. (See player's `on` function.)

A *dispatch* is a way of safely making the player do something. Each dispatch checks to make sure it can safely run on an update step (more than 6 seconds since last respawn, obeying chat cooldown, etc.) and then executes by sending the relevant packets. (See "dispatch documentation" section below.)


## Player class documentation
class `Player`:

Keep reading for attribute documentation.

#### Methods:
`constructor(name: str = '', proxy: str = '')` - Sets the name/id to use when joining games (optional) and a socks4/5 proxy to use for joining the game.

Example usage:
```javascript
let p0 = new Player(); // random name, no proxy
let p1 = new Player('bot'); // name is bot, no proxy
let p2 = new Player('', 'socks5://127.0.0.1') // random name, given proxy
let p3 = new Player('bot', 'socks5://...'); // given name and proxy
```

`async login(email: str, password: str)` - Logs the player into an account. Make sure to await this, or you will get some odd unintended side effects. Doesn't do any error handling. If a proxy was specified when the Player object was created, it will be used for the login. After the login is complete, `<player object>.state.loggedIn` will be true.

Example usage:

```javascript
let p = new Player();

console.log(p.state.loggedIn) // false

await p.login('onlypuppy7@gmail.com', 'Password1!')

console.log(p.state.loggedIn) // true
```

`async join(code: str)` - Fetches game data, sets up the socket, and joins the player into a game. The player must be logged in to join a game. Make sure to await this, or you will get some odd unintended side effects. If a proxy was specified on startup, it will use that. Check the console for a CloseCode if this function fails. If the game does not exist, this function will throw an error indicating that. After this function is complete:

`<player obj>.state.joinedGame` will be true

`<player obj>.gameSocket` will exist

`<player obj>.state.meta.code` will be the code passed in.

Hooks will begin to fire. You can safely call `update()`.

Example usage:
```javascript
let p = new Player() // ..., login, etc

console.log(p.state.joinedGame) // false
await p.join('four-kilo-coke')
console.log(p.state.joinedGame) // true
console.log(p.state.meta.code) // four-kilo-coke
```

`async update()` - Does the following, in the given order:

 - Handles all incoming packets
 - Checks and attempts to run all dispatches
 - Fires any hooks that got called that update step

Will throw an error if player is not in a game (`player.state.joinedGame must be true`). **Do not use with `while (true)` or `process.nextTick`, as these will choke the socket!** Only use a callback at the very top level, use a manager, and do something like the following:

```javascript
async function update_once() {
    await p.update();
    console.log("Update step complete");
    setTimeout(update_once, 10) // Using setInterval is a bad idea. You don't want multiple update calls running at the same time.
}

update_once();
```

`dispatch(disp: dispatch.Dispatch)` - Adds a new dispatch to the player's dispatch list. See Architecture Details for more info on what a dispatch is.

Example usage:
```javascript
p.dispatch(new dispatch.SpawnDispatch())
p.dispatch(new dispatch.ChatDispatch('jorking it'))
p.dispatch(new dispatch.ReloadDispatch())
```

`on(event, cb)`: Hooks `event` and runs `cb` with given arguments next update step after the event happens.

All arguments start with `me` to reference the player calling, so you can hook an entire manager. Valid events (and arguments):
 
- `chat`: (`me: Player`, `sender: Player`,`msg: str`, `flags: Int8??` )
- `join`: (`me: Player`, `joiner: Player`)
- `death`: (`me: Player`, `killed: Player`, `killer: Player`)
- `fire`: (`me: Player`, `shooter: Player`)
- `collect`: (`me: Player`, `collector: Player`, `type: int[0-1]`)
- `pause`: (`me: Player`, `pauser: Player`)
- `respawn`: (`me: Player`, `spawner: Player`)
- `packet`: (`me: Player`, `packet: ArrayBuffer`)

Example usage:

```javascript

// Hook chat message
p.on('chat', (me, chatter, msg) => {
    console.log(`${chatter.name} said ${msg}!`);
    // Note: packets aren't sent if you say something.
    // (chatter will never == me)
});

// Hook player join
// This will fire multiple times on game join, and will fire on self.
p.on('join', (me, joiner) => {
    if (!(me.name == joiner.name)) {
        console.log(`${joiner.name} joined the game.`)
    }
});

// Death fires on a death
p.on('death', (me, killed, killer) => {
    if (me.name == killed.name) {
        console.log("I died.");
        me.dispatch(new dispatch.SpawnDispatch()); // Spawn back in when safe
    } else if (me.name == killer.name) {
        console.log("I killed", killed.name);
    }
});

// Fire triggers when someone shoots

// Collect triggers when someone picks up an item

// Pause triggers when someone hits ESC

// Respawn triggers whenever someone spawns in
p.on('respawn', (me, spawner) => {
    if (me.name == spawner.name) {
        me.dispatch(new dispatch.SpawnDispatch()) // Continuously spawn in when possible
    }
})

// Packet fires on every single packet.
// Make this handler as light as possible, because it adds up *fast*.

p.on('packet', (me, packet) => {
    console.log("I just got a packet of length", packet.byteLength);
    // Enjoy the consolespam
})

```

There are other functions on `Player`. You should not call them directly. Consult the following list for function:

I want to...

 - Sync and run hooks and dispatches: `update()`.
 - Do something when an event happens: `on()`.
 - Make the player do something: `dispatch()`.
 - Log in and join: `login()` and `join()`.

 #### Attributes:

 `<bot player obj>.`...
 - `name`: given (or random) name
 - `nUpdates`: number of times `update()` has been called
 - `initTime`: time created
 - `gameSocket` (unsafe before `join`): raw socket
 - `state`: {

    - `joinedGame`: true when `join` called
    - `loggedIn`: " "
    - `playing`: false if not currently spawned in
    - `gameFound`: one guess (handles matchmaker socket)
    - `meta`: {

        - `code`: 🤯
        - `gameType`: Int8, idk which is which
        - `map`: Map index
        - `playerLimit`: 🤯
        - `isGameOwner`: 🤯
        - `isPrivateGame`: 🤯

        }

    - `me`: {

        - `id`: In-game id
        - `team`: team id (int8)

        }

    - `players`: dictionary by id of other players. Note that other players are not `Player`s but `InGamePlayer`s instead. This just means you cannot hook and update them. They are mostly dummies for tracking state information such as position.

    - `position`: `.x`, `.y`, `.z`
    - `jumping` and `climbing`: 🤯
    - `view`: `.yaw`, `.pitch`

    - `grenades`, `kills`, and `hp`: 🤯

    }
 - `loginData`: raw response from firebase / auth api
 - `gameData`: raw response from matchmaker


## water break 🚰 😮‍💨
imagine how long its taking you to read this... and I had to write all this shit up. this project is important enough to me that I wrote good documentation, so you fuckers better be grateful.

## Manager class documentation

#### Methods:

`constructor(players, use_proxies=false)` - Sets up the manager. If `use_proxies` is true, it will attempt to read from a list in `proxies.json`. Player list is the list of players the manager will manage. It can be blank, but then the manager will be useless.

Example usage:
```javascript

let player_list = [];

for (let i = 0; i < 10; i++) {
    player_list.push(new player.Player());
}

let man = new manager.Manager(player_list/*, true // with proxies for the players */);

```

`async login(emails, passwords)` - For each set of email and password, logs one of its players in. Does not complain if there are too many or too few. Literally just a map call wrapped in Promise.all.

Example usage:
```javascript
// Assume code above

let emails = ['onlypuppy7@gmail.com', 'webmaster@seqsy.de'];
let passwords = ['12345678', 'DYer!1S&A5;e|&RexEkd+j47']

await man.login(emails, passwords);
```

`async join(code)` - Just a map call. See player documentation.

`dispatch(disp)` - " "

`on(event, callback)` - " "

`update()` - " "

`avgUpdateTime()` - Returns the average time (in ms) of an update step over the last 100 updates. Try to keep lowish, so the program will remain snappy.

#### Attributes:
 - `nUpdates`: number of update steps.


## Dispatch documentation

Currently there are only 3 dispatches, which cover the functionality of toolkit and creamer. To come is (#1) firing, (#2) moving and looking around, and (#3) if i get to it pathing. 

#### SpawnDispatch
 - Literally just `new SpawnDispatch()`
 - Safe to use liberally: doesn't spawn in when the player can't
 - Spawns the player in

#### ChatDispatch
 - `new ChatDispatch(msg)`
 - Respects the cooldown
 - Does not check if account can chat, so be careful with that

#### ReloadDispatch
 - `new ReloadDispatch()`
 - Fucking useless because you can't fire




## Cookbook

Example code that clunkily does the same thing as the creamer, in about a thousand lines less:

```javascript

let NUM_CREAMERS = 100; // Go wild, it's super light
let EMAILS = [...] // 100 long
let PWS = [...] // 100 long

let CODE = 'jork-strp-club';

let p = [];

for (let i = 0; i < NUM_CREAMERS; i++) {
    p.push(new player.Player('StreamCreamer'))
}


let man = new manager.Manager(p);

man.on('join', (me, _) => {
    me.dispatch(new dispatch.SpawnDispatch())
});

man.on('respawn', (me, _) => {
    me.dispatch(new dispatch.SpawnDispatch())
    me.dispatch(new dispatch.ChatDispatch("Fuck SFC. Professor Creamer on top."))
})

await man.login(EMAILS, PWS);
await man.join(CODE);

function upd() {
    man.update()
    setTimeout(upd, 10);
}

upd();
```