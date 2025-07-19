import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    jidNormalizedUser 
} from '@whiskeysockets/baileys';
import { upload } from './mega.js';

const router = express.Router();

// Helper: remove a directory if it exists
function removeFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath, { recursive: true, force: true });
        }
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

// Helper: generate random session ID
function generateRandomId(length = 6, numberLength = 4) {
    const characters = 'HACKLINK';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

router.get('/', async (req, res) => {
    let num = (req.query.number || '').replace(/[^0-9]/g, '');
    const sessionDir = `./${num || 'session'}`;

    // Remove previous session
    removeFile(sessionDir);

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        try {
            const SUPUNMDInc = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }),
                browser: ["Ubuntu", "Chrome", "20.0.04"],
            });

            if (!SUPUNMDInc.authState.creds.registered) {
                await delay(2000);
                const code = await SUPUNMDInc.requestPairingCode(num);
                if (!res.headersSent) {
                    console.log({ num, code });
                    res.send({ code });
                }
            }

            SUPUNMDInc.ev.on('creds.update', saveCreds);
            SUPUNMDInc.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
                if (connection === "open") {
                    await delay(10000);

                    const megaUrl = await upload(
                        fs.createReadStream(`${sessionDir}/creds.json`),
                        `${generateRandomId()}.json`
                    );

                    let sessionID = 'HACKLINK=' + megaUrl.replace('https://mega.nz/file/', '');
                    const userJid = jidNormalizedUser(num + '@s.whatsapp.net');

                    await SUPUNMDInc.sendMessage(userJid, { text: sessionID });

                    await SUPUNMDInc.sendMessage(userJid, {
                        text: `*🪄 HACKLINK TECH.INC BOTS New Update.....💐*\n\n*SESSION SUCCESSFUL ✅*\n\n*උඩ ආපු Session Id connected successfully. Proceed to Deployment 😩🪄💐*\n\n+ ┉┉┉┉┉┉┉┉[ ❤️‍🩹 ]┉┉┉┉┉┉┉┉ +\n*❗𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏 𝐆𝐑𝐎𝐔𝐏*\n* https://chat.whatsapp.com/E9mVfukNRX13eF45Wbmk7t\n\n*❗𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏 𝐂𝐇𝐀𝐍𝐍𝐄𝐋*\n* https://whatsapp.com/channel/0029Vb6Gy5XDzgTBTarvMW1\n\n*❗BLACK-HAWK 𝐂𝐎𝐍𝐓𝐀𝐂𝐓*\n* wa.me/254769677305\n\n\n> 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 BY HACKLINK TECH.INC🫟`
                    });

                    await delay(100);
                    removeFile(sessionDir);
                    process.exit(0); // Optional: use only if you're restarting the bot elsewhere
                } else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log('Connection closed unexpectedly:', lastDisconnect.error);
                    await delay(10000);
                    initiateSession(); // Retry session
                }
            });
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
        }
    }

    await initiateSession();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

export default router;
