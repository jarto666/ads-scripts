import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function generateMagicLink(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    console.log('\nExisting users:');
    const users = await prisma.user.findMany({ select: { email: true } });
    users.forEach((u) => console.log(`  - ${u.email}`));
    process.exit(1);
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(token, 10);

  // Token expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.magicLinkToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const webBaseUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
  const magicLink = `${webBaseUrl}/auth/callback?token=${token}`;

  console.log('\n✅ Magic link generated for:', user.email);
  console.log('\n🔗 Login URL:\n');
  console.log(magicLink);
  console.log('\n⏰ Expires:', expiresAt.toLocaleString());
  console.log('');
}

const email = process.argv[2];

if (!email) {
  console.log('Usage: npx ts-node scripts/generate-magic-link.ts <email>');
  process.exit(1);
}

generateMagicLink(email)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
