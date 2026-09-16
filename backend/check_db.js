const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: { captainProfile: true },
    });
    console.log('--- USERS ---');
    console.log(JSON.stringify(users.map(u => ({ id: u.id, email: u.email, role: u.role, captain: u.captainProfile })), null, 2));

    const rides = await prisma.ride.findMany({
      take: 10,
    });
    console.log('--- RIDES ---');
    console.log(JSON.stringify(rides, null, 2));
  } catch (err) {
    console.error('ERROR IN DB SCRIPT:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
