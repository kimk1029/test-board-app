// scripts/set-admin.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'kimk1029@naver.com';
  console.log(`Searching for user: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log(`Found user ID: ${user.id}, current userType: ${user.userType}`);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { userType: 1 },
  });

  console.log(`Successfully updated ${email} to userType: ${updatedUser.userType}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
