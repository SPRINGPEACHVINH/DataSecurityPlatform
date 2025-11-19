import { encryptedFunc, decryptedFunc } from '../utils/index.js';
import crypto from 'crypto';

const keyGeneration = () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'secp256k1', // ECC curve
    });
}

