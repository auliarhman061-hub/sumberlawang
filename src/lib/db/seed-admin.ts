import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function seedAdmin() {
  console.log("Adding admin user...");

  await sql`
    DELETE FROM users WHERE email = 'auliarhman061@gmail.com'
  `;

  const result = await sql`
    INSERT INTO users (clerk_id, name, email, role)
    VALUES ('user_3Dqzn9Phk549bdiutHitSVCOCRp', 'Admin', 'auliarhman061@gmail.com', 'admin')
    RETURNING *
  `;

  console.log("Admin added:", result);
}

seedAdmin().catch(console.error);