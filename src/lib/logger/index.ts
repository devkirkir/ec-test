import config from "#config";
import loggerFactory from "./factory.js";

export default loggerFactory(config.app.logLevel);
