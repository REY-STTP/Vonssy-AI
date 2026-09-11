const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(path.join(__dirname, '.env.local'));
loadEnvFile(path.join(__dirname, '.env'));

async function migrate() {
  const dns = require('dns');
  dns.setDefaultResultOrder('verbatim');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set. See .env.example.');
    process.exit(1);
  }
  const sql = postgres(connectionString, { connect_timeout: 15 });

  try {
    const dir = path.join(__dirname, 'db', 'migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    console.log(`Found ${files.length} migration files...`);

    for (const file of files) {
      console.log(`\n--- ${file} ---`);
      let migration = fs.readFileSync(path.join(dir, file), 'utf8');

      // Remove all single-line comments completely before splitting
      migration = migration.replace(/--.*$/gm, '');

      const statements = migration
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log(`Executing ${statements.length} statements...`);

      // E8: one transaction per file — a mid-file failure rolls back
      // the whole file instead of leaving a half-applied schema.
      // sql.begin() reserves a single connection for the transaction.
      try {
        await sql.begin(async (tx) => {
          for (const stmt of statements) {
            try {
              await tx.unsafe(stmt + ';');
            } catch (err) {
              console.error(`\nFAILED IN ${file} ON STATEMENT:\n` + stmt + '\n\nError:', err.message);
              throw err;
            }
          }
        });
      } catch (err) {
        console.error(`Rolled back ${file}.`);
        throw err;
      }
    }

    console.log('\nAll migrations successful!');
  } catch (err) {
    console.error('Migration failed!');
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

migrate();
