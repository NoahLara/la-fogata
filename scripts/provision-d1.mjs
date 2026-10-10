// Finds the D1 database of this deploy (creating it on a new Cloudflare account) and writes its id into the
// realtime Worker's config, so `wrangler deploy` and the migrations use it. Run before them, with the Cloudflare
// credentials in the environment. The logic is in packages/api/src/provision.ts, which is tested.
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { ensureDatabase, withDatabaseId } from "../packages/api/src/provision.ts";

const NAME = "fogata";
const CONFIG = new URL("../apps/realtime/wrangler.jsonc", import.meta.url);
const run = promisify(execFile);

/** `wrangler` of the realtime package, which has it installed. */
async function wrangler(args) {
  const { stdout } = await run(
    "pnpm",
    ["--filter", "@fogata/realtime", "exec", "wrangler", ...args],
    {
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  return stdout;
}

const id = await ensureDatabase(wrangler, NAME);
await writeFile(CONFIG, withDatabaseId(await readFile(CONFIG, "utf8"), NAME, id));
console.log(`The database "${NAME}" is ${id}.`);
