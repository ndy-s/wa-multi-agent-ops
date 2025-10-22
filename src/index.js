import { startBot } from "./core/bot.js";
import { startLoanAgentLogViewer } from "./services/log-viewer.js";

startBot();
startLoanAgentLogViewer(55555);

