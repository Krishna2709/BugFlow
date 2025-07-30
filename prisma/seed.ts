import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create system user for automated comments
  const systemUser = await prisma.user.upsert({
    where: { id: 'system' },
    update: {},
    create: {
      id: 'system',
      email: 'system@bugflow.internal',
      name: 'System',
      role: 'ADMIN',
      team: null,
    },
  })
  console.log('✅ System user created:', systemUser.id)

  // Create demo admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@bugflow.com' },
    update: {},
    create: {
      email: 'admin@bugflow.com',
      name: 'Admin User',
      role: 'ADMIN',
      team: null,
    },
  })
  console.log('✅ Admin user created:', adminUser.email)

  // Create demo engineer users
  const securityEngineer = await prisma.user.upsert({
    where: { email: 'security.engineer@company.com' },
    update: {},
    create: {
      email: 'security.engineer@company.com',
      name: 'Security Engineer',
      role: 'ENGINEER',
      team: 'security',
    },
  })
  console.log('✅ Security engineer created:', securityEngineer.email)

  const frontendEngineer = await prisma.user.upsert({
    where: { email: 'frontend.engineer@company.com' },
    update: {},
    create: {
      email: 'frontend.engineer@company.com',
      name: 'Frontend Engineer',
      role: 'ENGINEER',
      team: 'frontend',
    },
  })
  console.log('✅ Frontend engineer created:', frontendEngineer.email)

  const backendEngineer = await prisma.user.upsert({
    where: { email: 'backend.engineer@company.com' },
    update: {},
    create: {
      email: 'backend.engineer@company.com',
      name: 'Backend Engineer',
      role: 'ENGINEER',
      team: 'backend',
    },
  })
  console.log('✅ Backend engineer created:', backendEngineer.email)

  const infraEngineer = await prisma.user.upsert({
    where: { email: 'infra.engineer@company.com' },
    update: {},
    create: {
      email: 'infra.engineer@company.com',
      name: 'Infrastructure Engineer',
      role: 'ENGINEER',
      team: 'infrastructure',
    },
  })
  console.log('✅ Infrastructure engineer created:', infraEngineer.email)

  // Create demo viewer user
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@company.com' },
    update: {},
    create: {
      email: 'viewer@company.com',
      name: 'Security Viewer',
      role: 'VIEWER',
      team: 'security',
    },
  })
  console.log('✅ Viewer user created:', viewerUser.email)

  // Create demo teams
  const teams = [
    {
      name: 'Security Team',
      description: 'Handles authentication, authorization, and cryptography issues',
      bugTypes: ['Authentication Bypass', 'Authorization', 'CSRF', 'Session Management', 'Cryptography', 'Information Disclosure'],
    },
    {
      name: 'Frontend Team',
      description: 'Handles client-side vulnerabilities and UI security',
      bugTypes: ['XSS', 'DOM-based XSS', 'Client-side Injection', 'CORS', 'Content Security Policy'],
    },
    {
      name: 'Backend Team',
      description: 'Handles server-side logic and API security',
      bugTypes: ['SQL Injection', 'API Security', 'Input Validation', 'Business Logic', 'Command Injection', 'Path Traversal'],
    },
    {
      name: 'Infrastructure Team',
      description: 'Handles network, server, and deployment security',
      bugTypes: ['Network Security', 'Denial of Service', 'Configuration', 'Server-Side Request Forgery', 'Remote Code Execution'],
    },
  ]

  for (const team of teams) {
    const createdTeam = await prisma.team.upsert({
      where: { name: team.name },
      update: {
        description: team.description,
        bugTypes: team.bugTypes,
      },
      create: {
        name: team.name,
        description: team.description,
        bugTypes: team.bugTypes,
      },
    })
    console.log('✅ Team created:', createdTeam.name)
  }

  // Create some demo reports for testing
  const demoReports = [
    {
      title: 'Cross-Site Scripting in User Profile',
      description: 'The user profile page allows injection of malicious JavaScript code through the bio field. When other users view the profile, the script executes in their browser context, potentially stealing session cookies or performing actions on their behalf. Steps to reproduce: 1. Navigate to profile edit page 2. Enter <script>alert("XSS")</script> in bio field 3. Save profile 4. View profile as another user 5. JavaScript alert appears',
      affectedSystem: 'User Profile Page',
      severity: 'HIGH',
      reporterName: 'Security Researcher',
      reporterEmail: 'researcher@security.com',
      status: 'NEW',
    },
    {
      title: 'SQL Injection in Search Functionality',
      description: 'The search endpoint is vulnerable to SQL injection attacks. By manipulating the search parameter, an attacker can extract sensitive data from the database or potentially gain administrative access. Steps to reproduce: 1. Navigate to search page 2. Enter \' OR 1=1-- in search field 3. Submit search 4. All records are returned regardless of search term 5. Further exploitation possible with UNION queries',
      affectedSystem: 'Search API',
      severity: 'CRITICAL',
      reporterName: 'Bug Hunter',
      reporterEmail: 'hunter@bugbounty.com',
      status: 'NEW',
    },
    {
      title: 'Insecure Direct Object Reference in File Download',
      description: 'The file download endpoint does not properly validate user permissions, allowing access to files belonging to other users. By modifying the file ID parameter, users can download sensitive documents they should not have access to. Steps to reproduce: 1. Login as regular user 2. Navigate to file download URL 3. Change file ID to another user\'s file 4. File downloads successfully without permission check',
      affectedSystem: 'File Management System',
      severity: 'HIGH',
      reporterName: 'Ethical Hacker',
      reporterEmail: 'ethical@hacker.com',
      status: 'NEW',
    },
  ]

  for (const report of demoReports) {
    const createdReport = await prisma.report.create({
      data: report,
    })
    console.log('✅ Demo report created:', createdReport.title)
  }

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📋 Demo Credentials:')
  console.log('Admin: admin@bugflow.com / password123')
  console.log('Security Engineer: security.engineer@company.com / password123')
  console.log('Frontend Engineer: frontend.engineer@company.com / password123')
  console.log('Backend Engineer: backend.engineer@company.com / password123')
  console.log('Infrastructure Engineer: infra.engineer@company.com / password123')
  console.log('Viewer: viewer@company.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })