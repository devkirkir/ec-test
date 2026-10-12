import crypto from "node:crypto";

const key = crypto.randomBytes(32).toString("hex");
console.log(`======== INSERT IN ENV ========`);
console.log(`API_KEY=${key}`);
console.log(`================================`);
