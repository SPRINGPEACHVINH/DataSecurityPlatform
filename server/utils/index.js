import crypto from 'crypto';

import dotenv from 'dotenv';
dotenv.config();

const key = process.env.key;
const algorithm = process.env.algorithm;

function generateTimeBasedRunScanID() {
    const vietnamTimeOffset = 7 * 60 * 60 * 1000;
    const now = new Date(Date.now() + vietnamTimeOffset);

    const year = now.getUTCFullYear().toString();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
    const seconds = now.getUTCSeconds().toString().padStart(2, '0');

    const milliseconds = now.getUTCMilliseconds().toString().padStart(3, '0');
    const microsecondsPart = milliseconds + '000';

    const timestampPart = `${year}${month}${day}${hours}${minutes}${seconds}${microsecondsPart}`;

    let randomSuffix = '';
    for (let i = 0; i < 12; i++) {
        randomSuffix += Math.floor(Math.random() * 16).toString(16);
    }

    const combinedString = timestampPart + randomSuffix;

    const RunScanID = `${combinedString.substring(0, 8)}-${combinedString.substring(8, 12)}-${combinedString.substring(12, 16)}-${combinedString.substring(16, 20)}-${combinedString.substring(20, 32)}`;

    return RunScanID;
}

function encryptedFunc(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + encrypted.toString('hex');
}

function decryptedFunc(encryptedText) {
    const iv = Buffer.from(encryptedText.substring(0, 32), 'hex');
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(Buffer.from(encryptedText.substring(32), 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

export { generateTimeBasedRunScanID, encryptedFunc, decryptedFunc };

