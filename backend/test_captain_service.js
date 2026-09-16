const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany({
    include: { captainProfile: true }
  });

  console.log('Total users:', users.length);
  for (const user of users) {
    console.log(`User: ${user.email} (${user.id}), role: ${user.role}, hasCaptain: ${Boolean(user.captainProfile)}`);
  }

  // Let's test the scheduled rides query directly
  const now = new Date();
  const minScheduledTime = new Date(now.getTime() - 15 * 60 * 1000);

  try {
    const rides = await prisma.ride.findMany({
      where: {
        status: 'SCHEDULED',
        OR: [
          { captainId: 'any-id' },
          { captainId: null, scheduledAt: { gte: minScheduledTime } },
        ],
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });
    console.log('Direct scheduled rides query success! Count:', rides.length);
  } catch (err) {
    console.error('Direct scheduled rides query FAILED:', err);
  }

  await prisma.$disconnect();
}

test();
