// Runs supabase/tests/*.sql (pgTAP) against the linked project without Docker.
// Each test's final `select line from tap order by at; rollback;` is swapped for
// a raise, so the transaction always aborts (nothing is committed) and the TAP
// output comes back in the error message.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = "supabase/tests";
const tmp = mkdtempSync(join(tmpdir(), "homeiq-db-test-"));
let failed = false;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
  const sql = readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n");
  const tail = "select line from tap order by at;\nrollback;";
  if (!sql.includes(tail)) throw new Error(`${file} must end with: ${tail}`);

  const runnable = sql.replace(
    tail,
    "reset role;\ndo $x$ begin raise exception E'TAP\\n%', (select string_agg(line, E'\\n' order by at) from tap); end $x$;",
  );
  const path = join(tmp, file);
  writeFileSync(path, runnable);

  let out = "";
  try {
    out = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", path], {
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  // The CLI prints {"error":{"message":"unexpected status 400: {\"message\":\"...\"}"}}
  let message = out;
  try {
    const cliMessage = JSON.parse(out.slice(out.indexOf("{"))).error.message;
    message = JSON.parse(cliMessage.slice(cliMessage.indexOf("{"))).message;
  } catch {}
  const tap = message.match(/TAP\r?\n([\s\S]*?)\r?\nCONTEXT:/);
  if (!tap) {
    console.error(`${file}: no TAP output (a statement errored before the end?)\n${message}`);
    failed = true;
    continue;
  }
  const lines = tap[1].split(/\r?\n/);
  console.log(`# ${file}\n${lines.join("\n")}`);
  if (lines.some((l) => l.startsWith("not ok") || l.startsWith("# Looks like"))) failed = true;
}

process.exit(failed ? 1 : 0);
