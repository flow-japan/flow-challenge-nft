const functions = require('firebase-functions');
const { SHA3 } = require('sha3');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

// $ firebase functions:config:set flow.privateKey=xxxxxxxx
// $ firebase functions:config:get > functions/.runtimeconfig.json
const privateKey = functions.config().flow.privkey;

const hashHex = (msg, isHex = true) => {
    const sha = new SHA3(256);
    sha.update(isHex ? Buffer.from(msg, 'hex') : Buffer.from(msg));
    return sha.digest();
};

const hash = (msg) => {
    const isHex = false;
    return hashHex(msg, isHex).toString('hex');
};

const sign = (msg) => {
    const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'));
    const sig = key.sign(hashHex(msg));
    const n = 32;
    const r = sig.r.toArrayLike(Buffer, 'be', n);
    const s = sig.s.toArrayLike(Buffer, 'be', n);
    return Buffer.concat([r, s]).toString('hex');
};

module.exports = { sign, hash };
