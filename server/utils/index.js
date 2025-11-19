import crypto from 'crypto';

import dotenv from 'dotenv';
dotenv.config();

const key = process.env.key;
const algorithm = process.env.algorithm;

export function generateTimeBasedRunScanID() {
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

// Encryption Function: Requires sender's (User) Private Key and receiver's (CloudSploit) Public Key
export function encryptedFunc(text, senderPrivateKey, receiverPublicKey) {
    try {
        const privateKeyObj = crypto.createPrivateKey(senderPrivateKey);
        const publicKeyObj = crypto.createPublicKey(receiverPublicKey);

        // Create ECDH instance
        const ecdh = crypto.createECDH(privateKeyObj.asymmetricKeyDetails.namedCurve);

        // Set private key
        ecdh.setPrivateKey(privateKeyObj.export({ format: 'der', type: 'sec1' }));

        // Compute shared secret
        const sharedSecret = ecdh.computeSecret(
            publicKeyObj.export({ format: 'der', type: 'spki' })
        );

        // Create AES Key from Shared Secret (Hash to 32 bytes)
        const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();

        // Encryption
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(algorithm, aesKey, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        // Return object containing all information needed for decryption
        return {
            ciphertext: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag
        };
    }
    catch (error) {
        return {
            status: 500,
            error: error.message
        }
    }
}