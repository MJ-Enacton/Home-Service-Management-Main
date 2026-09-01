import "dotenv/config";
import { createServer } from "node:http";
import next from "next";

const APP_PORT = Number(process.env.PORT) || 3000;

const dev = process.argv.includes("--dev");
const app = next({ dev });

await app.prepare();

const handle = app.getRequestHandler();

const appHttpServer = createServer((req, res) => handle(req, res));

appHttpServer.listen(APP_PORT, () => {
  console.log(
    `> Next.js running on http://localhost:${APP_PORT} (${dev ? "development" : "production"})`,
  );
});