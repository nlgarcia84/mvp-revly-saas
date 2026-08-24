import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const { rows } = await pool.query(
    'SELECT id, name, "instagramUsername" FROM "Business" ORDER BY "createdAt"',
  );
  rows.forEach((r) =>
    console.log(`${r.id} | ${r.name}${r.instagramUsername ? ` | ig:@${r.instagramUsername}` : ''}`),
  );
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});