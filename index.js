const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

// Konfigurasi Bot
const BOT_NAME = "AIZORYN BOT";
const PREFIX = ".";

async function startAizorynBot() {
    console.log(`[SYSTEM] Memulai ${BOT_NAME}...`);

    // Kelola sesi WhatsApp
    const { state, saveCreds } = await useMultiFileAuthState('./aizoryn_session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['AIZORYN BOT', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    // Monitor Status Koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n[SCAN QR CODE] Pindai QR di bawah ini menggunakan WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WARNING] Koneksi terputus. Mencoba menghubungkan kembali... (${shouldReconnect})`);
            if (shouldReconnect) {
                startAizorynBot();
            }
        } else if (connection === 'open') {
            console.log(`\n========================================`);
            console.log(`[SUCCESS] ${BOT_NAME} BERHASIL TERHUBUNG!`);
            console.log(`========================================\n`);
        }
    });

    // Penanganan Pesan Masuk (Handler Perintah Moduler)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const typeMsg = Object.keys(m.message)[0];
        const body = (typeMsg === 'conversation') ? m.message.conversation :
                     (typeMsg === 'extendedTextMessage') ? m.message.extendedTextMessage.text :
                     (typeMsg === 'imageMessage') ? m.message.imageMessage.caption : '';

        if (!body.startsWith(PREFIX)) return;

        const args = body.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        console.log(`[COMMAND] ${command} dari ${from}`);

        // --- SISTEM PERINTAH UTAMA ---
        switch (command) {
            case 'ping':
                await sock.sendMessage(from, { text: `Pong! 🏓\n${BOT_NAME} aktif dan siap digunakan.` }, { quoted: m });
                break;

            case 'menu':
            case 'help':
                const menuText = `✨ *${BOT_NAME} UTILITY & CREATOR STUDIO* ✨\n\n` +
                    `*📁 KATEGORI: SYSTEM*\n` +
                    `• ${PREFIX}ping - Cek status bot\n` +
                    `• ${PREFIX}menu - Menampilkan menu ini\n\n` +
                    `*🎨 KATEGORI: CREATOR STUDIO (PHOTO)*\n` +
                    `• ${PREFIX}hd - Tingkatkan kualitas foto\n` +
                    `• ${PREFIX}upscale - Perbesar resolusi foto\n` +
                    `• ${PREFIX}removebg - Hapus latar belakang\n\n` +
                    `*🎬 KATEGORI: CREATOR STUDIO (VIDEO)*\n` +
                    `• ${PREFIX}videohd - Peningkatan visual video\n` +
                    `• ${PREFIX}extractaudio - Ekstrak audio dari video\n\n` +
                    `ℹ️ _Modul Creator Studio sedang disiapkan untuk integrasi AI & FFmpeg server._`;
                await sock.sendMessage(from, { text: menuText }, { quoted: m });
                break;

            case 'hd':
            case 'upscale':
            case 'removebg':
            case 'videohd':
            case 'extractaudio':
                await sock.sendMessage(from, { 
                    text: `⚙️ *[CREATOR STUDIO]*\n\nFitur *${PREFIX}${command}* terdeteksi!\n_Modul pemrosesan gambar/video sedang memverifikasi engine pemrosesan di server hosting._` 
                }, { quoted: m });
                break;

            default:
                // Mengabaikan perintah yang belum terdaftar
                break;
        }
    });
}

// Jalankan Bot
startAizorynBot().catch(err => console.error('[FATAL ERROR]', err));
