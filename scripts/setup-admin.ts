import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function main() {
  console.log('🔧 BugFlow Admin Setup')
  console.log('=====================\n')

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    })

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', existingAdmin.email)
      const overwrite = await question('Do you want to create another admin? (y/N): ')
      
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.')
        return
      }
    }

    // Get admin details
    const name = await question('Admin Name: ')
    const email = await question('Admin Email: ')
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    let password: string
    let confirmPassword: string

    do {
      password = await question('Admin Password (min 8 characters): ')
      if (password.length < 8) {
        console.log('❌ Password must be at least 8 characters long')
        continue
      }

      confirmPassword = await question('Confirm Password: ')
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match')
      }
    } while (password !== confirmPassword || password.length < 8)

    // Hash password
    console.log('\n🔐 Creating admin user...')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        name,
        email,
        role: 'ADMIN',
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log('\n📋 Admin Details:')
    console.log(`Name: ${adminUser.name}`)
    console.log(`Email: ${adminUser.email}`)
    console.log(`Role: ${adminUser.role}`)
    console.log(`ID: ${adminUser.id}`)
    console.log(`Created: ${adminUser.createdAt}`)

    console.log('\n🎉 Setup completed! You can now login with these credentials.')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

main()