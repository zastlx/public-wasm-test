import WebSocket from 'ws';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

firebase.initializeApp({
    "apiKey": "AIzaSyDP4SIjKaw6A4c-zvfYxICpbEjn1rRnN50",
    "authDomain": "shellshockio-181719.firebaseapp.com",
    "databaseURL": "https://shellshockio-181719.firebaseio.com",
    "projectId": "shellshockio-181719",
    "storageBucket": "shellshockio-181719.appspot.com",
    "messagingSenderId": "68327206324"
});

async function fetchConstantsRaw() {
    const resp = await fetch('https://raw.githubusercontent.com/StateFarmNetwork/client-keys/refs/heads/main/constants_latest.json');
    const json = await resp.json();
    return json;
}

async function query_api(request, prox = '') {
    let ws;
    if (prox) {
        ws = new WebSocket('wss://shellshock.io/services/', {
            agent: proxy.agentify(prox)
        });
    } else {
        ws = new WebSocket('wss://shellshock.io/services/');
    }

    const promise_open = new Promise((resolve, reject) => {
        ws.on('open', () => {
            resolve(ws);
        });
        ws.onerror = (err) => {
            reject(err);
        };
    });

    const connected_ws = await promise_open;

    const send_promise = connected_ws.send(JSON.stringify(request));
    await send_promise;



    const response = await new Promise((resolve, reject) => {
        ws.onmessage = (mes) => {
            try {
                const resp = JSON.parse(mes.data);
                resolve(resp);
            } catch (e) {
                console.log("Bad API JSON response in query_api with call: " + request.cmd + " and data: " + JSON.stringify(request));
                console.log("Full data sent: " + JSON.stringify(request));
                console.log("Full data received: " + mes);
                console.log("Full error: " + e);
            }
            ws.close();
        };
        ws.onerror = reject;

    });


    if (response.error) {
        console.log("query_api error:", response.error);
        return null;
    }

    return response;
}

async function login(email, password, prox = '') {

    /*
    DO NOT CALL RAW!!!! (you can if you want :3 it doesn't change anything)
    create an Account() and then call .session() to get this data
    */


    /*
    Response looks something like:
        {
            id: <int>
            firebaseId: <string>
            sessionId: <string>
            session: <int>

            ... <irrelevant data>

            kills: <int>
            deaths: <int>
            currentBalance: <int>
        }
    */

    let SUCCESS = false;
    let user, token;
    let k = 0;

    while (!SUCCESS) {
        try {
            user = await firebase.auth().signInWithEmailAndPassword(email, password);
            token = await user.user.getIdToken();
            SUCCESS = true;
        } catch (error) {
            ++k;
            if (error.code == 'auth/network-request-failed') {
                console.error("cw_api.login: Network req failed (auth/network-request-failed), retrying, k =", k);
            } else if (error.code == 'auth/missing-email') {
                console.error("cw_api.login: You did not specify any emails. Please do so in data/logins.json");
                process.exit(0);
            } else {
                console.error("cw_api.login: Error:", email, password);
                console.error("cw_api.login: Error:", error, 'k =', k);
            }
        }
    }

    // let current_time = new Date().getTime();

    let response = await query_api({
        cmd: "auth",
        firebaseToken: token
    }, prox);
    // let after_time = new Date().getTime();

    // console.log("Took " + (after_time - current_time) + "ms to authenticate");

    return response;
}

async function anonymous(prox = '') {
    let user = await firebase.auth().signInAnonymously();
    let token = await user.user.getIdToken();
    let response = await query_api({
        cmd: "auth",
        firebaseToken: token
    });
    return response
}

export default {
    login,
    query_api,
    fetchConstantsRaw,
    anonymous
}