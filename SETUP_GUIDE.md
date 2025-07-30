# BugFlow - Setup Guide

## Prerequisites

Before setting up BugFlow, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** database (local or cloud)
- **Git** for version control

## Required External Services

### 1. OpenAI API
- Sign up at [OpenAI Platform](https://platform.openai.com/)
- Create an API key with access to GPT-4 and embeddings
- Ensure you have sufficient credits for API usage

### 2. Vercel Account
- Sign up at [Vercel](https://vercel.com/)
- Connect your GitHub repository
- Set up Vercel Postgres database

### 3. Inngest Account
- Sign up at [Inngest](https://www.inngest.com/)
- Create a new app and get your event and signing keys

### 4. UploadThing Account
- Sign up at [UploadThing](https://uploadthing.com/)
- Create an app and get your API keys

### 5. Email Service (Optional)
- Gmail with App Password, or
- SendGrid account, or
- Any SMTP service

## Project Setup Steps

### 1. Clone and Initialize Project

```bash
# Clone the repository
git clone <repository-url>
cd bugflow

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### 2. Environment Configuration

Create a `.env.local` file with the following variables:

```bash
# Authentication
NEXTAUTH_SECRET=your-nextauth-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/bugflow

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# File Upload
UPLOADTHING_SECRET=sk_live_your-uploadthing-secret
UPLOADTHING_APP_ID=your-uploadthing-app-id

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin User (for initial setup)
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=secure-admin-password
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed initial data (optional)
npx prisma db seed
```

### 4. Development Server

```bash
# Start the development server
npm run dev

# In a separate terminal, start Inngest dev server
npx inngest-cli dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
bugflow/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── admin/
│   │   ├── engineer/
│   │   └── viewer/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── reports/
│   │   ├── users/
│   │   ├── ai/
│   │   └── inngest/
│   ├── submit/                   # Public report submission
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # Reusable UI components
│   ├── ui/                       # Base UI components (shadcn/ui)
│   ├── forms/                    # Form components
│   ├── dashboard/                # Dashboard-specific components
│   ├── auth/                     # Authentication components
│   └── layout/                   # Layout components
├── lib/                          # Utility libraries
│   ├── ai/                       # AI processing logic
│   ├── auth/                     # Authentication configuration
│   ├── db/                       # Database utilities
│   ├── email/                    # Email service
│   ├── upload/                   # File upload utilities
│   ├── utils.ts                  # General utilities
│   └── validations.ts            # Zod schemas
├── inngest/                      # Inngest functions
│   ├── functions/
│   └── client.ts
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/                       # Static assets
├── __tests__/                    # Test files
│   ├── components/
│   ├── api/
│   └── lib/
├── .env.example                  # Environment variables template
├── .env.local                    # Local environment variables (gitignored)
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # Project documentation
```

## Initial Data Setup

### 1. Create Admin User

Run the following script to create an initial admin user:

```bash
npm run setup:admin
```

Or manually create via Prisma Studio:

```bash
npx prisma studio
```

### 2. Seed Teams and Bug Types

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create teams
  const teams = await Promise.all([
    prisma.team.create({
      data: {
        name: 'Security',
        description: 'Security vulnerabilities and authentication issues',
        bugTypes: ['Authentication Bypass', 'Authorization', 'CSRF', 'Session Management', 'Cryptography'],
      },
    }),
    prisma.team.create({
      data: {
        name: 'Frontend',
        description: 'Client-side vulnerabilities and UI issues',
        bugTypes: ['XSS', 'DOM-based XSS', 'Client-side Injection'],
      },
    }),
    prisma.team.create({
      data: {
        name: 'Backend',
        description: 'Server-side vulnerabilities and API issues',
        bugTypes: ['SQL Injection', 'API Security', 'Input Validation', 'Business Logic'],
      },
    }),
    prisma.team.create({
      data: {
        name: 'Infrastructure',
        description: 'Infrastructure and network security',
        bugTypes: ['Network Security', 'Denial of Service', 'Configuration'],
      },
    }),
  ]);

  // Create admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || 'admin@bugflow.com',
      name: 'System Administrator',
      role: 'ADMIN',
      // Note: You'll need to handle password hashing based on your auth setup
    },
  });

  // Create sample engineers
  const engineers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'security.engineer@company.com',
        name: 'Security Engineer',
        role: 'ENGINEER',
        team: 'security',
      },
    }),
    prisma.user.create({
      data: {
        email: 'frontend.engineer@company.com',
        name: 'Frontend Engineer',
        role: 'ENGINEER',
        team: 'frontend',
      },
    }),
    prisma.user.create({
      data: {
        email: 'backend.engineer@company.com',
        name: 'Backend Engineer',
        role: 'ENGINEER',
        team: 'backend',
      },
    }),
  ]);

  console.log('Database seeded successfully!');
  console.log('Teams created:', teams.length);
  console.log('Engineers created:', engineers.length);
  console.log('Admin user:', adminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
npm run dev
npm run test

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. Database Changes

```bash
# After modifying schema.prisma
npx prisma db push

# Generate new client
npx prisma generate

# Create migration (for production)
npx prisma migrate dev --name migration-name
```

### 3. Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- __tests__/api/reports.test.ts

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Vercel Deployment

1. **Connect Repository**
   - Go to Vercel dashboard
   - Import your GitHub repository
   - Configure build settings

2. **Environment Variables**
   - Add all environment variables from `.env.local`
   - Ensure `NEXTAUTH_URL` points to your production domain

3. **Database Setup**
   - Create Vercel Postgres database
   - Update `DATABASE_URL` in environment variables
   - Run migrations: `npx prisma db push`

4. **Domain Configuration**
   - Add custom domain if needed
   - Update `NEXTAUTH_URL` to match your domain

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Monitoring and Maintenance

### 1. Application Monitoring

- Set up Vercel Analytics
- Monitor API response times
- Track error rates
- Monitor OpenAI API usage and costs

### 2. Database Maintenance

```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Monitor database performance
# Check slow queries and optimize indexes
```

### 3. AI Performance Monitoring

- Track AI analysis accuracy
- Monitor duplicate detection effectiveness
- Optimize prompts based on results
- Monitor API costs and usage patterns

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database connection
   npx prisma db pull
   
   # Reset database (development only)
   npx prisma migrate reset
   ```

2. **OpenAI API Errors**
   - Check API key validity
   - Verify account credits
   - Monitor rate limits

3. **Inngest Issues**
   ```bash
   # Check Inngest connection
   npx inngest-cli dev
   
   # View function logs in Inngest dashboard
   ```

4. **Authentication Issues**
   - Verify `NEXTAUTH_SECRET` is set
   - Check `NEXTAUTH_URL` matches your domain
   - Clear browser cookies and try again

### Performance Optimization

1. **Database Optimization**
   - Add indexes for frequently queried fields
   - Optimize vector similarity searches
   - Use connection pooling

2. **API Optimization**
   - Cache AI analysis results
   - Implement request rate limiting
   - Optimize database queries

3. **Frontend Optimization**
   - Use Next.js Image optimization
   - Implement proper loading states
   - Use React.memo for expensive components

## Security Checklist

- [ ] All environment variables are properly secured
- [ ] Database access is restricted
- [ ] API routes have proper authentication
- [ ] File uploads are validated and sanitized
- [ ] User inputs are properly validated
- [ ] HTTPS is enforced in production
- [ ] Rate limiting is implemented
- [ ] Error messages don't leak sensitive information

## Support and Documentation

- **API Documentation**: Available at `/api/docs` (when implemented)
- **Component Storybook**: Run `npm run storybook` (when implemented)
- **Database Schema**: View with `npx prisma studio`
- **Logs**: Check Vercel dashboard for production logs

For additional support, refer to the documentation of individual services:
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Inngest Documentation](https://www.inngest.com/docs)