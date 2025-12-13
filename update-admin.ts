import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'kimk1029@naver.com'
  
  try {
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: { userType: 1 },
    })
    console.log(`Successfully updated userType for ${email} to 1 (Admin)`)
    console.log(updatedUser)
  } catch (error) {
    console.error(`Failed to update user ${email}:`, error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
