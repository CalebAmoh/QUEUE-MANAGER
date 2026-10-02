import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

async function test() {
  console.log("Testing database connection...");
  console.log("URL:", process.env.DATABASE_URL);
  
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ Database connection successful! (${Date.now() - start}ms)`);
    
    const selfCount = await prisma.selfService.count();
    console.log(`📊 Self-services found: ${selfCount}`);
  } catch (err) {
    console.error("❌ Database connection failed:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
