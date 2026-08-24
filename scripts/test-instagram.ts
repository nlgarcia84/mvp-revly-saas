import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const { rows } = await pool.query(
    `SELECT id, name, "instagramAccessToken", "instagramTokenExpiry", "instagramBusinessAccountId", "instagramUsername"
     FROM "Business"
     WHERE "instagramAccessToken" IS NOT NULL`,
  );

  if (rows.length === 0) {
    console.log('No hay ningún negocio con Instagram conectado en la BD.');
    await pool.end();
    return;
  }

  for (const b of rows) {
    console.log(`\n=== ${b.name} (${b.id}) ===`);
    console.log('username:', b.instagramUsername);
    console.log('expiry:', b.instagramTokenExpiry);
    if (b.instagramTokenExpiry && new Date(b.instagramTokenExpiry).getTime() < Date.now()) {
      console.log('⚠ token CADUCADO');
    }
    const token = b.instagramAccessToken;
    const uid = b.instagramBusinessAccountId;

    // perfil
    const prof = await fetch(
      `${'https://graph.instagram.com'}/${uid}?fields=id,username,account_type&access_token=${encodeURIComponent(token)}`,
    );
    console.log('perfil status:', prof.status);
    console.log('perfil:', await prof.text());

    // media recientes
    const media = await fetch(
      `${'https://graph.instagram.com'}/${uid}/media?fields=id,caption,timestamp,media_type,permalink,thumbnail_url,media_url,comments_count&limit=8&access_token=${encodeURIComponent(token)}`,
    );
    const mediaJson = (await media.json()) as {
      data?: Array<{ id: string; caption?: string; timestamp?: string; media_type?: string; comments_count?: number; permalink?: string }>;
      error?: { message?: string; code?: number };
    };
    if (mediaJson.error) {
      console.log('media error:', mediaJson.error.code, mediaJson.error.message);
      continue;
    }
    console.log('media count:', mediaJson.data?.length ?? 0);
    for (const m of mediaJson.data ?? []) {
      console.log(` - ${m.media_type} | comments=${m.comments_count} | ${m.timestamp} | ${(m.caption ?? '').slice(0, 60)}`);
      if ((m.comments_count ?? 0) > 0) {
        const cm = await fetch(
          `${'https://graph.instagram.com'}/${m.id}/comments?fields=id,text,timestamp,username,replies{id,text,timestamp,username}&limit=50&access_token=${encodeURIComponent(token)}`,
        );
        const cmJson = (await cm.json()) as { data?: Array<{ id: string; text?: string; username?: string }>; error?: { message?: string } };
        if (cmJson.error) {
          console.log('   comentarios error:', cmJson.error.message);
        } else {
          console.log('   comentarios:', (cmJson.data ?? []).length);
          for (const c of cmJson.data ?? []) {
            console.log(`     • @${c.username}: ${(c.text ?? '').slice(0, 50)}`);
          }
        }
      }
    }
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
