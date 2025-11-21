import oracledb from "oracledb";
import logger from "../helpers/logger.js";
import { openOracleDB } from "../db/oracle.js";

export async function callSql(query, params = {}) {
    const connection = await openOracleDB();

    try {
        const result = await connection.execute(query, params, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            autoCommit: true,
        });

        logger.info(`[Oracle] SQL executed: ${query} | params=${JSON.stringify(params)}`);
        return result.rows;
    } catch (err) {
        logger.error(
            `[Oracle] SQL execution failed: ${query} | error=${err.message} | params=${JSON.stringify(params)}`
        );
        throw err;
    }
}

