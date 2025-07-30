import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create teams
  console.log('Creating teams...')
  const teams = await Promise.all([
    prisma.team.upsert({
      where: { name: 'Security' },
      update: {},
      create: {
        name: 'Security',
        description: 'Security vulnerabilities and authentication issues',
        bugTypes: [
          'Authentication Bypass',
          'Authorization',
          'CSRF',
          'Session Management',
          'Cryptography',
          'Information Disclosure'
        ],
      },
    }),
    prisma.team.upsert({
      where: { name: 'Frontend' },
      update: {},
      create: {
        name: 'Frontend',
        description: 'Client-side vulnerabilities and UI issues',
        bugTypes: [
          'XSS',
          'DOM-based XSS',
          'Client-side Injection',
          'CORS',
          'Content Security Policy'
        ],
      },
    }),
    prisma.team.upsert({
      where: { name: 'Backend' },
      update: {},
      create: {
        name: 'Backend',
        description: 'Server-side vulnerabilities and API issues',
        bugTypes: [
          'SQL Injection',
          'API Security',
          'Input Validation',
          'Business Logic',
          'Command Injection',
          'Path Traversal'
        ],
      },
    }),
    prisma.team.upsert({
      where: { name: 'Infrastructure' },
      update: {},
      create: {
        name: 'Infrastructure',
        description: 'Infrastructure and network security',
        bugTypes: [
          'Network Security',
          'Denial of Service',
          'Configuration',
          'Server-Side Request Forgery',
          'Remote Code Execution'
        ],
      },
    }),
  ])

  console.log(`✅ Created ${teams.length} teams`)

  // Create admin user
  console.log('Creating admin user...')
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'admin123',
    12
  )

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@bugflow.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@bugflow.com',
      name: 'System Administrator',
      role: 'ADMIN',
    },
  })

  console.log(`✅ Created admin user: ${adminUser.email}`)

  // Create sample engineers
  console.log('Creating sample engineers...')
  const engineers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'security.engineer@company.com' },
      update: {},
      create: {
        email: 'security.engineer@company.com',
        name: 'Alex Security',
        role: 'ENGINEER',
        team: 'security',
      },
    }),
    prisma.user.upsert({
      where: { email: 'frontend.engineer@company.com' },
      update: {},
      create: {
        email: 'frontend.engineer@company.com',
        name: 'Sarah Frontend',
        role: 'ENGINEER',
        team: 'frontend',
      },
    }),
    prisma.user.upsert({
      where: { email: 'backend.engineer@company.com' },
      update: {},
      create: {
        email: 'backend.engineer@company.com',
        name: 'Mike Backend',
        role: 'ENGINEER',
        team: 'backend',
      },
    }),
    prisma.user.upsert({
      where: { email: 'infra.engineer@company.com' },
      update: {},
      create: {
        email: 'infra.engineer@company.com',
        name: 'Lisa Infrastructure',
        role: 'ENGINEER',
        team: 'infrastructure',
      },
    }),
  ])

  console.log(`✅ Created ${engineers.length} engineers`)

  // Create sample viewer
  console.log('Creating sample viewer...')
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@company.com' },
    update: {},
    create: {
      email: 'viewer@company.com',
      name: 'John Viewer',
      role: 'VIEWER',
    },
  })

  console.log(`✅ Created viewer: ${viewer.email}`)

  // Create sample bug reports
  console.log('Creating sample bug reports...')
  const sampleReports = [
    {
      title: 'Cross-Site Scripting (XSS) in Search Form',
      description: `I discovered a reflected XSS vulnerability in the search functionality of the application. 

**Steps to Reproduce:**
1. Navigate to the search page
2. Enter the following payload in the search field: <script>alert('XSS')</script>
3. Submit the form
4. The script executes in the browser

**Impact:**
This vulnerability allows attackers to execute arbitrary JavaScript code in the context of other users' browsers, potentially leading to session hijacking, credential theft, or other malicious activities.

**Recommendation:**
Implement proper input validation and output encoding for all user-supplied data.`,
      affectedSystem: 'Search Module',
      severity: 'HIGH',
      bugType: 'XSS',
      reporterName: 'John Researcher',
      reporterEmail: 'john@security.com',
      status: 'NEW',
    },
    {
      title: 'SQL Injection in User Profile Update',
      description: `A SQL injection vulnerability exists in the user profile update functionality.

**Steps to Reproduce:**
1. Log in to the application
2. Navigate to profile settings
3. In the "About Me" field, enter: '; DROP TABLE users; --
4. Save the profile

**Impact:**
This vulnerability could allow attackers to:
- Extract sensitive data from the database
- Modify or delete database records
- Potentially gain administrative access

**Proof of Concept:**
The application appears to be using dynamic SQL queries without proper parameterization.`,
      affectedSystem: 'User Management',
      severity: 'CRITICAL',
      bugType: 'SQL Injection',
      reporterName: 'Alice Hacker',
      reporterEmail: 'alice@pentest.com',
      status: 'IN_PROGRESS',
      assignedEngineerId: engineers.find(e => e.team === 'backend')?.id,
    },
    {
      title: 'Authentication Bypass via Parameter Manipulation',
      description: `I found a way to bypass authentication by manipulating request parameters.

**Steps to Reproduce:**
1. Attempt to access a protected resource
2. Intercept the request
3. Add parameter: admin=true
4. Forward the request

**Impact:**
Unauthorized access to administrative functions and sensitive data.

**Additional Notes:**
This appears to be related to insufficient server-side validation of user roles.`,
      affectedSystem: 'Authentication System',
      severity: 'CRITICAL',
      bugType: 'Authentication Bypass',
      reporterName: 'Bob Security',
      reporterEmail: 'bob@bugbounty.com',
      status: 'NEW',
    },
  ]

  const createdReports = []
  for (const reportData of sampleReports) {
    const report = await prisma.report.create({
      data: reportData,
    })
    createdReports.push(report)
  }

  console.log(`✅ Created ${createdReports.length} sample reports`)

  // Create sample assignments
  console.log('Creating sample assignments...')
  const assignments = []
  for (const report of createdReports) {
    if (report.assignedEngineerId) {
      const assignment = await prisma.assignment.create({
        data: {
          reportId: report.id,
          engineerId: report.assignedEngineerId,
          assignedBy: adminUser.id,
          status: 'ACTIVE',
        },
      })
      assignments.push(assignment)
    }
  }

  console.log(`✅ Created ${assignments.length} assignments`)

  // Create sample comments
  console.log('Creating sample comments...')
  const comments = []
  for (const report of createdReports.slice(0, 2)) {
    const comment = await prisma.reportComment.create({
      data: {
        reportId: report.id,
        userId: adminUser.id,
        comment: 'This report has been reviewed and assigned to the appropriate team for investigation.',
      },
    })
    comments.push(comment)
  }

  console.log(`✅ Created ${comments.length} comments`)

  console.log('🎉 Database seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`- Teams: ${teams.length}`)
  console.log(`- Users: ${engineers.length + 2}`) // +2 for admin and viewer
  console.log(`- Reports: ${createdReports.length}`)
  console.log(`- Assignments: ${assignments.length}`)
  console.log(`- Comments: ${comments.length}`)
  console.log('\n🔐 Default Admin Credentials:')
  console.log(`Email: ${adminUser.email}`)
  console.log(`Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })