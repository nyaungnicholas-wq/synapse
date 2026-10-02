// Run after seeding on a PUBLIC demo deployment. The seed's sample accounts share a password
// that is printed in the README, so on a public site nobody may log in with it:
//  - every seeded account loses its password (visitors use their own /demo copy instead);
//  - admin@synapse.test gets DEMO_ADMIN_PASSWORD if that secret is set, otherwise no login at all.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/crypto";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const cleared = await db.user.updateMany({ where: { isDemo: false }, data: { passwordHash: null } });
  await db.session.deleteMany({});
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "";
  if (adminPassword.length >= 12) {
    await db.user.update({ where: { email: "admin@synapse.test" }, data: { passwordHash: await hashPassword(adminPassword) } });
    console.log(`LOCKDOWN OK cleared=${cleared.count} admin=enabled`);
  } else {
    console.log(`LOCKDOWN OK cleared=${cleared.count} admin=disabled`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
