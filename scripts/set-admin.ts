const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const email = 'kimk1029@naver.com'
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { userType: 1 },
    })
    console.log(`Updated user ${email} to admin (userType: 1)`)
  } catch (error) {
    console.error(`Failed to update user ${email}:`, error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
