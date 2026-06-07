/**
 * Seed an initial admin user.
 * Usage: npx ts-node prisma/seed-admin.ts <email> <password> <name> [role]
 * Role defaults to SUPER_ADMIN.
 *
 * Example:
 *   npx ts-node prisma/seed-admin.ts admin@gateml.com secret123 "Rob Admin" SUPER_ADMIN
 */
import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [,, email, password, name, role = 'SUPER_ADMIN'] = process.argv;

  if (!email || !password || !name) {
    console.error('Usage: npx ts-node prisma/seed-admin.ts <email> <password> <name> [role]');
    process.exit(1);
  }

  if (!Object.values(AdminRole).includes(role as AdminRole)) {
    console.error(`Invalid role. Choose from: ${Object.values(AdminRole).join(', ')}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where:  { email },
    update: { passwordHash, name, role: role as AdminRole },
    create: { email, passwordHash, name, role: role as AdminRole },
  });

  console.log(`✓ Admin user: ${admin.email} (${admin.role}) [${admin.id}]`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
