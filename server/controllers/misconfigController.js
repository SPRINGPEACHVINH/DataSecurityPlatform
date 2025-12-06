import { encryptedFunc } from '../utils/index.js';
import crypto from 'crypto';
import ecKeyUtils from 'eckey-utils';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_DIR = path.join(__dirname, '../utils/secure_keys');
if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR);

const getCloudsploitKey = async () => {
    try {
        const response = await axios.get(`${process.env.CLOUDSPLOIT_ENDPOINT}/getkey`);

        if (response.status !== 200) {
            throw new Error(`Error fetching key: Status ${response.status}`);
        }

        return {
            status: 200,
            publicKey: response.data.publicKey,
            keyType: response.data.keyType,
            curve: response.data.curve,
            format: response.data.format
        }
    }
    catch (error) {
        return {
            status: 500,
            error: error.message
        }
    }
}

export const generateUserKeys = () => {
    try {
        const ecdh = crypto.createECDH('secp256k1');
        ecdh.generateKeys();

        //Tạo cặp key ECC secp256k1
        const { publicKey, privateKey } = {
            publicKey: ecdh.getPublicKey(),
            privateKey: ecdh.getPrivateKey()
        }

        let pem = ecKeyUtils.generatePem('secp256k1', { sk: privateKey, pk: publicKey });

        //Lưu Key vào file (ghi đè nếu đã tồn tại)
        fs.writeFileSync(path.join(KEY_DIR, 'user_private.pem'), pem.privateKey, { flag: 'w' });
        fs.writeFileSync(path.join(KEY_DIR, 'user_public.pem'), pem.publicKey, { flag: 'w' });

        return {
            message: 'Keys generated successfully',
            publicKey: pem.publicKey,
        };
    } catch (error) {
        return { error: error.message };
    }
};

export const utilityscanCloudMisconfig = async (cloud) => {
    try {
        let credentials = {};

        if (cloud === 'aws') {
            credentials = {
                aws_access_key_id: process.env.AWS_ACCESS_KEY_ID,
                aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
                aws_region: process.env.AWS_REGION
            };

            // Validate credentials
            if (!credentials.aws_access_key_id || !credentials.aws_secret_access_key) {
                throw new Error('Missing AWS credentials in .env file. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
            }

            console.log('AWS credentials loaded successfully');
        }
        else if (cloud === 'azure') {
            credentials = {
                ApplicationID: process.env.AZURE_APPLICATION_ID,
                KeyValue: process.env.AZURE_KEY_VALUE,
                DirectoryID: process.env.AZURE_DIRECTORY_ID,
                SubscriptionID: process.env.AZURE_SUBSCRIPTION_ID
            };

            // Validate credentials
            if (!credentials.ApplicationID || !credentials.KeyValue || !credentials.DirectoryID || !credentials.SubscriptionID) {
                throw new Error('Missing Azure credentials in .env file. Please check AZURE_APPLICATION_ID, AZURE_KEY_VALUE, AZURE_DIRECTORY_ID, and AZURE_SUBSCRIPTION_ID');
            }
        }
        else {
            return { status: 400, error: 'Invalid cloud provider. Must be "aws" or "azure".' };
        }

        // Load User Private Key (PEM string)
        const userPrivateKeyPem = fs.readFileSync(path.join(KEY_DIR, 'user_private.pem'), 'utf8');
        const userPublicKeyPem = fs.readFileSync(path.join(KEY_DIR, 'user_public.pem'), 'utf8');

        // Prepare credentials
        const credentialsJson = JSON.stringify(credentials);

        const cloudsploitPublicPem = (await getCloudsploitKey()).publicKey;

        // Pass PEM strings, NOT parsed Buffers
        const { ciphertext, iv, authTag } = encryptedFunc(
            credentialsJson,
            userPrivateKeyPem,        // PEM string
            cloudsploitPublicPem      // PEM string (NOT parsed)
        );

        // Validate encryption
        if (ciphertext.length < 100) {
            throw new Error(`Ciphertext too short (${ciphertext.length} chars). Encryption failed.`);
        }
        //console.log('Cipher text type', typeof ciphertext);
        const payload = {
            ciphertext: ciphertext,
            iv: iv,
            authTag: authTag,
            userPublicKey: userPublicKeyPem,
            cloud: cloud
        };
        //console.log('Payload:', payload);

        // Uncomment to send to CloudSploit
        const response = await axios.post(`${process.env.CLOUDSPLOIT_ENDPOINT}/scan`, payload);
        return { status: 200, message: 'Scan completed', data: response.data };

        // return {
        //     status: 200,
        //     message: 'Payload prepared and validated successfully',
        //     payloadInfo: {
        //         ciphertextLength: ciphertext.length,
        //         ivLength: iv.length,
        //         authTagLength: authTag.length,
        //         cloud: cloud
        //     }
        // };
    }
    catch (error) {
        return {
            status: 500,
            error: error.message
        }
    }
}

export const scanCloudMisconfig = async (req, res) => {
    try {
        const { cloud } = req.body;
        if (!cloud) {
            return res.status(400).json({ error: 'Missing "cloud" parameter in request body.' });
        }

        const result = await utilityscanCloudMisconfig(cloud);

        if (result.status !== 200) {
            return res.status(result.status).json({
                message: "Failed to handle misconfiguration scan request.",
                error: result.error || "Unknown error",
            });
        }
        res.status(200).json(result.data);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to handle misconfiguration scan request.",
            error: error.message || "Unknown error",
        });
    }
}

// Test function
// (async () => {
//     try {
//         console.log('='.repeat(60));
//         console.log('🚀 Testing scanCloudMisconfig');
//         console.log('='.repeat(60));

//         const result = await scanCloudMisconfig('azure');

//         console.log('\n' + '='.repeat(60));
//         console.log('📊 RESULT:');
//         console.log('='.repeat(60));
//         console.log(JSON.stringify(result, null, 2));

//     } catch (error) {
//         console.error('\n❌ Test failed:', error);
//         process.exit(1);
//     }
// })();
