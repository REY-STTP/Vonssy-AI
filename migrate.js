const fs = require('fs');
const postgres = require('postgres');

async function migrate() {
  const dns = require('dns');
  dns.setDefaultResultOrder('verbatim');

  const connectionString = 'postgresql://postgres.vfqmdutxwuxilagjyqej:Rerey%40261203@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';
  const sql = postgres(connectionString, { connect_timeout: 15 });

  try {
    console.log('Reading migration file...');
    let migration = fs.readFileSync('db/migrations/0001_initial.sql', 'utf8');
    
    // Remove all single-line comments completely before splitting
    migration = migration.replace(/--.*$/gm, '');

    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} statements...`);
    
    for (const stmt of statements) {
      if (stmt) {
        try {
          await sql.unsafe(stmt + ';');
        } catch (err) {
          console.error('\nFAILED ON STATEMENT:\n' + stmt + '\n\nError:', err.message);
          throw err;
        }
      }
    }
    
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed!');
  } finally {
    await sql.end();
  }
}

migrate();
