import * as mega from 'megajs';

// Mega authentication credentials (SECURE THIS in real use!)
const auth = {
    email: 'nicksonkipruto79@gmail.com',
    password: 'Kim2024K',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

// Authenticate once to reuse the storage instance
let storagePromise = null;

function getStorage() {
    if (!storagePromise) {
        storagePromise = new Promise((resolve, reject) => {
            const storage = new mega.Storage(auth, () => resolve(storage));
            storage.on('error', reject);
        });
    }
    return storagePromise;
}

// Upload function
export const upload = async (data, name) => {
    try {
        const storage = await getStorage();

        return new Promise((resolve, reject) => {
            const uploadStream = storage.upload({ name, allowUploadBuffering: true });

            uploadStream.on('complete', (file) => {
                file.link((err, url) => {
                    if (err) return reject(err);
                    resolve(url);
                });
            });

            uploadStream.on('error', (err) => {
                reject(err);
            });

            data.pipe(uploadStream);
        });

    } catch (err) {
        throw new Error(`Upload failed: ${err.message}`);
    }
};

// Download function
export const download = (url) => {
    return new Promise((resolve, reject) => {
        try {
            const file = mega.File.fromURL(url);

            file.loadAttributes((err) => {
                if (err) return reject(err);

                file.downloadBuffer((err, buffer) => {
                    if (err) return reject(err);
                    resolve(buffer);
                });
            });
        } catch (err) {
            reject(err);
        }
    });
};
