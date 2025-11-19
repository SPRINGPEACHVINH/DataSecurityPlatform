import { encryptedFunc } from '../utils/index.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_DIR = path.join(__dirname, '../utils/secure_keys');
if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR);

const getCloudsploitKey = async () => {
    try {
        const response = await axios.get('https://springpeachvinh.id.vn/v1/getkey', {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status !== 200) {
            throw new Error(`Error fetching key: Status ${response.status}`);
        }

        return {
            status: 200,
            publicKey: response.publicKey,
            keyType: response.keyType,
            curve: response.curve,
            format: response.format
        }
    }
    catch (error) {
        return {
            status: 500,
            error: error.message
        }
    }
}

export const generateUserKeys = (req, res) => {
    try {
        //Tạo cặp key ECC secp256k1
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp256k1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        //Lưu Key vào file (ghi đè nếu đã tồn tại)
        fs.writeFileSync(path.join(KEY_DIR, 'user_private.pem'), privateKey, { flag: 'w' });
        fs.writeFileSync(path.join(KEY_DIR, 'user_public.pem'), publicKey, { flag: 'w' });

        return res.status(200).json({
            message: 'Keys generated successfully',
            publicKey: publicKey
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}; 
