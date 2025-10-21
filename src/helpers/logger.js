import winston from "winston";
import "winston-daily-rotate-file";

const dailyRotateTransport = new winston.transports.DailyRotateFile({
    filename: "logs/%DATE%-app.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
});

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        dailyRotateTransport
    ]
});

export default logger;
