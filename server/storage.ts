// Where the shop's data lives: Postgres when DATABASE_URL is set, JSON files otherwise.
//
// Each store (accounts, orders, …) is a set of named lists of records. The app keeps
// the lists in memory and calls save() after changing them; only the records that
// changed are written. In Postgres every record is one row:
//
//   records(store, part, id, data jsonb)    e.g. ("accounts", "users", "<uuid>", {...})
//
// open("accounts", { users: (u) => u.id, sessions: (s) => s.hash })
//   → { data: { users: [...], sessions: [...] }, save() }

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

export async function openStorage({ databaseUrl, dataDir }) {
  return databaseUrl ? openPostgres(databaseUrl, dataDir) : openFiles(dataDir);
}

const readJsonFile = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

const emptyData = (parts, from = {}) => Object.fromEntries(Object.keys(parts).map((p) => [p, Array.isArray(from?.[p]) ? from[p] : []]));

/* ── Files (local development) ─────────────────────────────── */

function openFiles(dataDir) {
  return {
    kind: "files",
    describe: `files in ${dataDir}`,
    async open(name, parts: Record<string, any>, { legacy }: { legacy?: any } = {}) {
      const file = path.join(dataDir, `${name}.json`);
      let raw = readJsonFile(file);
      if (!raw && legacy) raw = legacy(); // older file formats
      const data = emptyData(parts, raw);
      let queue = Promise.resolve();
      const save = () =>
        (queue = track(
          queue
            .then(() => {
              mkdirSync(dataDir, { recursive: true });
              writeFileSync(`${file}.tmp`, JSON.stringify(data));
              renameSync(`${file}.tmp`, file);
            })
            .catch((error) => console.error(`[storage] saving ${name} failed:`, error.message))
        ));
      if (!existsSync(file) && raw) await save();
      return { data, save };
    },
    close: settle,
  };
}

/* ── Postgres ──────────────────────────────────────────────── */

// Saves still being written; awaited on shutdown.
const inflight = new Set();
const track = (promise) => {
  inflight.add(promise);
  promise.finally(() => inflight.delete(promise)).catch(() => {});
  return promise;
};
const settle = () => Promise.allSettled([...inflight]);

async function openPostgres(url, dataDir) {
  const { default: pg } = await import("pg");
  const host = new URL(url).hostname;
  // Render's internal address has no dots and needs no TLS; external addresses do.
  const ssl = process.env.DATABASE_SSL === "false" ? false : host.includes(".") && !["localhost", "127.0.0.1"].includes(host) ? { rejectUnauthorized: false } : false;
  const pool = new pg.Pool({ connectionString: url, ssl, max: 5 });
  pool.on("error", (error) => console.error("[storage] database error:", error.message));

  // A new database can take a minute to accept connections: keep trying for ~2 minutes.
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query("SELECT 1");
      break;
    } catch (error) {
      if (attempt >= 24) throw new Error(`Can't reach the database at ${host}: ${error.message}`);
      console.warn(`[storage] waiting for the database (${error.message}); retrying in 5s`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      store      text        NOT NULL,
      part       text        NOT NULL,
      id         text        NOT NULL,
      data       jsonb       NOT NULL,
      seq        bigserial,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (store, part, id)
    )`);

  return {
    kind: "postgres",
    describe: `Postgres at ${host}`,
    async open(name, parts: Record<string, any>, { legacy }: { legacy?: any } = {}) {
      const { rows } = await pool.query("SELECT part, id, data FROM records WHERE store = $1 ORDER BY seq", [name]);
      const data = emptyData(parts);
      const saved = Object.fromEntries(Object.keys(parts).map((p) => [p, new Map()])); // id → JSON as stored
      for (const row of rows) {
        if (!data[row.part]) continue;
        data[row.part].push(row.data);
        saved[row.part].set(row.id, JSON.stringify(row.data));
      }

      // Write what changed since the last save, in one transaction.
      let queue = Promise.resolve();
      const flush = async () => {
        const upserts = [];
        const deletes = [];
        for (const [part, key] of Object.entries(parts)) {
          const seen = new Set();
          for (const record of data[part]) {
            const id = String(key(record));
            seen.add(id);
            const json = JSON.stringify(record);
            if (saved[part].get(id) !== json) upserts.push([part, id, json]);
          }
          for (const id of saved[part].keys()) if (!seen.has(id)) deletes.push([part, id]);
        }
        if (!upserts.length && !deletes.length) return;
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (const [part, id, json] of upserts) {
            await client.query(
              `INSERT INTO records (store, part, id, data) VALUES ($1, $2, $3, $4::jsonb)
               ON CONFLICT (store, part, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
              [name, part, id, json]
            );
          }
          for (const [part, id] of deletes) await client.query("DELETE FROM records WHERE store = $1 AND part = $2 AND id = $3", [name, part, id]);
          await client.query("COMMIT");
          for (const [part, id, json] of upserts) saved[part].set(id, json);
          for (const [part, id] of deletes) saved[part].delete(id);
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          client.release();
        }
      };
      const save = () => {
        const run = track(queue.then(flush));
        queue = run.catch((error) => console.error(`[storage] saving ${name} failed:`, error.message));
        return run; // callers that await see failures
      };

      // First run against an empty database: bring in the data from the old files.
      if (!rows.length) {
        const old = readJsonFile(path.join(dataDir, `${name}.json`)) || legacy?.();
        if (old) {
          Object.assign(data, emptyData(parts, old));
          await save();
          const count = Object.values(data).reduce((n, list) => n + list.length, 0);
          if (count) console.log(`[storage] imported ${count} ${name} records from ${dataDir}`);
        }
      }
      return { data, save };
    },
    async close() {
      await settle();
      await pool.end();
    },
  };
}
