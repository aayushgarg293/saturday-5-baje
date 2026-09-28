import { defineConfig, type Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

/**
 * Dev-only: lets the running game save a rendered frame to disk.
 *
 * The page calls `__shot()` (see src/dev/shot.ts), which renders one frame and
 * POSTs it here as a JPEG; this writes it to `.shots/<name>.jpg`. That gives
 * Claude an image file it can open and look at. `apply: "serve"` means this
 * only exists under `npm run dev`, never in the production build.
 */
function shotSaver(outDir: string): Plugin {
  return {
    name: "shot-saver",
    apply: "serve",
    configureServer(server) {
      fs.mkdirSync(outDir, { recursive: true });
      server.middlewares.use("/__shot", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("POST only");
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            // keep the file name safe: letters, digits, dot, dash, underscore
            const name = String(body.name || "shot").replace(/[^\w.-]/g, "_");
            const data = String(body.data || "").replace(/^data:image\/\w+;base64,/, "");
            const file = path.join(outDir, `${name}.jpg`);
            fs.writeFileSync(file, Buffer.from(data, "base64"));
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, file }));
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  // relative asset paths, so the build works from any folder or sub-path
  base: "./",
  plugins: [shotSaver(path.resolve(process.cwd(), ".shots"))],
  server: { port: 5180, strictPort: true, host: "127.0.0.1", open: false },
  preview: { port: 5181, strictPort: true, host: "127.0.0.1", open: false },
  build: {
    target: "es2022",
    outDir: "dist",
    // Three.js alone is ~530 KB, so the default 500 KB warning always fires.
    chunkSizeWarningLimit: 800,
  },
});
