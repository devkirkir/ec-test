import express from "express";

async function buildApp() {
  const app = express();

  app.use(express.json());

  return app;
}

export default buildApp;
