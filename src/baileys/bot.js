import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";
import logger from "../utils/logger.js";
import { handleMessage } from "./handlers/index.js";

const AUTH_INFO_PATH = path.join(process.cwd(), "auth_info");

export async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
    });

    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            logger.info("📱 QR Code received, scan to log in.");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.output?.payload?.error || "Unknown";

            logger.info(`🔌 Connection closed | StatusCode: ${statusCode} | Reason: ${reason}`);

            if (statusCode !== DisconnectReason.loggedOut) {
                logger.info("🔁 Reconnecting...");
                startBot();
            } else {
                logger.warn("❌ Logged out. Cleaning up auth_info folder...");

                if (fs.existsSync(AUTH_INFO_PATH)) {
                    try {
                        fs.rmSync(AUTH_INFO_PATH, { recursive: true, force: true });
                        logger.info("✅ auth_info folder deleted successfully.");
                    } catch (err) {
                        logger.error("❌ Failed to delete auth_info folder:", err);
                    }
                }

                setTimeout(() => {
                    logger.info("🔄 Restarting bot...");
                    startBot();
                }, 2000);
            }
        } else if (connection === "open") {
            logger.info(`✅ Bot connected | User ID: ${sock.user?.id}`);
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async (m) => {
        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue;

            try {
                await handleMessage(sock, msg);
            } catch (error) {
                logger.error(`Error processing message from ${msg.key.remoteJid}:`, error);
            }
        }
    });

}
