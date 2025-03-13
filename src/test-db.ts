import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Create a test record
    const test = await prisma.test.create({
      data: {
        name: 'Test Entry'
      }
    })
    console.log('Created test entry:', test)

    // Read all test records
    const allTests = await prisma.test.findMany()
    console.log('All test entries:', allTests)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 