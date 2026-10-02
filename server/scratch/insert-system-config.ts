import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      maintenanceMode: false,
      sessionTimeout: 300,
      enableBiometricCache: true,
      enableDetailedLogging: true,
      enableRateLimiting: true,
      rateLimitRequestsPerMinute: 60,
      enableAuditLogging: true,
      enableTransactionNotifications: true,
    },
  });
  console.log('Default system config inserted or already exists.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
