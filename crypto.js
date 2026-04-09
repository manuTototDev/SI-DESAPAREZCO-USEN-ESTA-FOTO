/* ═══════════════════════════════════════════════════════════════
   CRYPTO MODULE — Zero-Knowledge Encryption
   AES-256-GCM + PBKDF2 via Web Crypto API
   
   No external dependencies. No server. No backdoors.
   ═══════════════════════════════════════════════════════════════ */

const CryptoModule = (() => {
    'use strict';

    // ── CONSTANTS ──────────────────────────────────────────────
    const PBKDF2_ITERATIONS = 600000;  // OWASP recommendation
    const SALT_LENGTH = 16;            // 128 bits
    const IV_LENGTH = 12;              // 96 bits for AES-GCM
    const KEY_LENGTH = 256;            // AES-256
    const FILE_SIGNATURE = 'SDF1';     // Si Desaparezco Ficha v1

    // ── HELPERS ────────────────────────────────────────────────
    
    /**
     * Encode string to Uint8Array
     */
    function encode(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * Decode Uint8Array to string
     */
    function decode(buffer) {
        return new TextDecoder().decode(buffer);
    }

    /**
     * Generate cryptographically secure random bytes
     */
    function randomBytes(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * Convert ArrayBuffer to base64 string
     */
    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert base64 string to ArrayBuffer
     */
    function base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Concatenate multiple Uint8Arrays
     */
    function concatBuffers(...arrays) {
        const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    // ── KEY DERIVATION ─────────────────────────────────────────

    /**
     * Derive a cryptographic key from a password using PBKDF2
     * @param {string} password - User's password
     * @param {Uint8Array} salt - Random salt
     * @returns {Promise<CryptoKey>} - Derived AES key
     */
    async function deriveKey(password, salt) {
        // Import password as raw key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // Derive AES-256-GCM key
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: KEY_LENGTH
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // ── ENCRYPTION ─────────────────────────────────────────────

    /**
     * Encrypt data with AES-256-GCM
     * Output format: [SIGNATURE(4)] [SALT(16)] [IV(12)] [CIPHERTEXT(variable)]
     * 
     * @param {object} data - Data to encrypt (will be JSON-serialized)
     * @param {string} password - User's password
     * @param {function} onProgress - Progress callback (0-100)
     * @returns {Promise<Uint8Array>} - Encrypted file bytes
     */
    async function encrypt(data, password, onProgress = () => {}) {
        onProgress(10);

        // Generate random salt and IV
        const salt = randomBytes(SALT_LENGTH);
        const iv = randomBytes(IV_LENGTH);

        onProgress(20);

        // Derive key from password
        const key = await deriveKey(password, salt);

        onProgress(50);

        // Serialize and encrypt
        const plaintext = encode(JSON.stringify(data));
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            plaintext
        );

        onProgress(80);

        // Assemble: signature + salt + iv + ciphertext
        const signature = encode(FILE_SIGNATURE);
        const result = concatBuffers(
            signature,
            salt,
            iv,
            new Uint8Array(ciphertext)
        );

        onProgress(100);
        return result;
    }

    // ── DECRYPTION ─────────────────────────────────────────────

    /**
     * Decrypt a .sidf file
     * 
     * @param {ArrayBuffer} fileBuffer - Raw file bytes
     * @param {string} password - Decryption password
     * @param {function} onProgress - Progress callback (0-100)
     * @returns {Promise<object>} - Decrypted data object
     * @throws {Error} - If file is invalid or password is wrong
     */
    async function decrypt(fileBuffer, password, onProgress = () => {}) {
        onProgress(10);

        const bytes = new Uint8Array(fileBuffer);

        // Verify file signature
        const signatureBytes = bytes.slice(0, 4);
        const signature = decode(signatureBytes);
        if (signature !== FILE_SIGNATURE) {
            throw new Error('ARCHIVO_INVALIDO');
        }

        onProgress(20);

        // Extract components
        const salt = bytes.slice(4, 4 + SALT_LENGTH);
        const iv = bytes.slice(4 + SALT_LENGTH, 4 + SALT_LENGTH + IV_LENGTH);
        const ciphertext = bytes.slice(4 + SALT_LENGTH + IV_LENGTH);

        onProgress(30);

        // Derive key from password
        const key = await deriveKey(password, salt);

        onProgress(60);

        // Decrypt
        try {
            const plaintext = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                ciphertext
            );

            onProgress(90);

            const data = JSON.parse(decode(plaintext));

            onProgress(100);
            return data;

        } catch (e) {
            throw new Error('CONTRASEÑA_INCORRECTA');
        }
    }

    // ── PASSWORD STRENGTH ──────────────────────────────────────

    /**
     * Evaluate password strength
     * @param {string} password
     * @returns {object} { score: 0-4, label: string, color: string }
     */
    function evaluatePassword(password) {
        if (!password) return { score: 0, label: '—', color: '#dddde2' };

        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const levels = [
            { label: 'MUY DÉBIL', color: '#c42b2b' },
            { label: 'DÉBIL', color: '#c47b2b' },
            { label: 'ACEPTABLE', color: '#c4b32b' },
            { label: 'FUERTE', color: '#6b9e3c' },
            { label: 'MUY FUERTE', color: '#2b7a3e' }
        ];

        const level = levels[Math.min(score, 4)];
        return {
            score: score,
            label: level.label,
            color: level.color
        };
    }

    // ── PUBLIC API ─────────────────────────────────────────────
    return {
        encrypt,
        decrypt,
        evaluatePassword,
        bufferToBase64,
        base64ToBuffer
    };
})();
