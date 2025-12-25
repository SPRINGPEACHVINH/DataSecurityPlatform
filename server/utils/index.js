import crypto from 'crypto';
import eckey from 'eckey-utils'

import dotenv from 'dotenv';
dotenv.config();

const algorithm = process.env.ALGORITHM || 'aes-256-gcm';

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
        const senderParsed = eckey.parsePem(senderPrivateKey);
        const receiverParsed = eckey.parsePem(receiverPublicKey);

        console.log('Sender Parsed Key:', senderParsed);
        // Create ECDH instance
        const ecdh = crypto.createECDH(senderParsed.curveName);

        // Set private key
        ecdh.setPrivateKey(senderParsed.privateKey)

        // Compute shared secret
        const sharedSecret = ecdh.computeSecret(
            receiverParsed.publicKey
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
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

export function generateConnectorID() {
    return crypto.randomBytes(20).toString('hex');
}

export function generateConnectorIndexname(cloud) {
    if (!cloud) {
        throw new Error("Cloud provider is required to generate connector index name.");
    }
    else if (cloud === 's3') {
        return "connector-aws-s3-" + crypto.randomBytes(4).toString('hex');
    }
    else if (cloud === 'azure_blob_storage') {
        return "connector-azure-blob-" + crypto.randomBytes(4).toString('hex');
    }
    else {
        throw new Error("Unsupported cloud provider. Only 's3' and 'azure_blob_storage' are supported.");
    }
}

export function updateEnvironmentVariable(key, value) {
    try {

    }
    catch (error) {
        throw new Error(`Failed to update environment variable: ${error.message}`);
    }
}