import oracledb from "oracledb";
import logger from "../helpers/logger.js";
import { config } from "../config/env.js";

let dbInstance = null;

export async function openOracleDB() {
    if (dbInstance) return dbInstance;

    try {
        dbInstance = await oracledb.getConnection({
            user: config.oracleUser,
            password: config.oraclePassword,
            connectString: config.oracleConnectString,
        });

        logger.info("🌐 Connected to Oracle database");
    } catch (err) {
        logger.error("❌ Failed to connect to Oracle DB:", err);
        throw err;
    }

    return dbInstance;
}

