# BugFlow - Development Plan

## Project Setup and Dependencies

### Required Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "next-auth": "^4.24.0",
    "@next-auth/prisma-adapter": "^1.0.7",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "openai": "^4.20.0",
    "ai": "^2.2.0",
    "inngest": "^3.0.0",
    "react-hook-form": "^7.47.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "uploadthing": "^6.0.0",
    "@uploadthing/react": "^6.0.0",
    "lucide-react": "^0.292.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "date-fns": "^2.30.0",
    "recharts": "^2.8.0",
    "csv-writer": "^1.6.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.1.0",
    "prettier": "^3.0.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

### Environment Variables
```bash
# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/bugflow

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# File Upload
UPLOADTHING_SECRET=sk_live_your-uploadthing-secret
UPLOADTHING_APP_ID=your-uploadthing-app-id

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Database Schema Implementation

### Prisma Schema
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(VIEWER)
  team          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts    Account[]
  sessions    Session[]
  reports     Report[]       @relation("AssignedReports")
  assignments Assignment[]   @relation("AssignedBy")
  comments    ReportComment[]

  @@map("users")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

enum Role {
  ADMIN
  ENGINEER
  VIEWER
}

enum ReportStatus {
  NEW
  IN_PROGRESS
  RESOLVED
  DUPLICATE
  REJECTED
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model Report {
  id              String        @id @default(cuid())
  reporterName    String?
  reporterEmail   String?
  title           String
  description     String        @db.Text
  affectedSystem  String?
  severity        Severity?
  bugType         String?
  status          ReportStatus  @default(NEW)
  assignedEngineerId String?
  duplicateOfId   String?
  aiAnalysis      Json?
  embedding       String?       // Store as JSON string for vector
  fileUrls        String[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  assignedEngineer User?           @relation("AssignedReports", fields: [assignedEngineerId], references: [id])
  duplicateOf      Report?         @relation("DuplicateReports", fields: [duplicateOfId], references: [id])
  duplicates       Report[]        @relation("DuplicateReports")
  assignments      Assignment[]
  comments         ReportComment[]

  @@map("reports")
}

model Team {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  bugTypes    String[]
  createdAt   DateTime @default(now())

  @@map("teams")
}

model Assignment {
  id         String           @id @default(cuid())
  reportId   String
  engineerId String
  assignedBy String
  assignedAt DateTime         @default(now())
  status     AssignmentStatus @default(ACTIVE)

  report     Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
  engineer   User   @relation("AssignedReports", fields: [engineerId], references: [id])
  assignedByUser User @relation("AssignedBy", fields: [assignedBy], references: [id])

  @@map("assignments")
}

enum AssignmentStatus {
  ACTIVE
  COMPLETED
  REASSIGNED
}

model ReportComment {
  id        String   @id @default(cuid())
  reportId  String
  userId    String
  comment   String   @db.Text
  createdAt DateTime @default(now())

  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id])

  @@map("report_comments")
}
```

## AI Integration Specifications

### OpenAI Agent SDK Implementation
```typescript
// lib/ai/bug-analysis-agent.ts
import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

const BugAnalysisSchema = z.object({
  bugType: z.string().describe('The type of bug (e.g., XSS, SQL Injection, CSRF)'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedSystem: z.string().describe('The system or component affected'),
  confidence: z.number().min(0).max(1).describe('Confidence score of the analysis'),
  summary: z.string().describe('Brief summary of the bug'),
  technicalDetails: z.array(z.string()).describe('Key technical details extracted'),
});

export class BugAnalysisAgent {
  private model = openai('gpt-4-turbo');

  async analyzeReport(report: {
    title: string;
    description: string;
    affectedSystem?: string;
  }): Promise<z.infer<typeof BugAnalysisSchema>> {
    const { object } = await generateObject({
      model: this.model,
      schema: BugAnalysisSchema,
      prompt: `
        Analyze this bug report and extract key information:
        
        Title: ${report.title}
        Description: ${report.description}
        Affected System: ${report.affectedSystem || 'Not specified'}
        
        Classify the bug type, assess severity, and provide technical analysis.
        Consider OWASP Top 10 vulnerabilities and common security issues.
        
        Severity Guidelines:
        - CRITICAL: Remote code execution, authentication bypass, data breach
        - HIGH: Privilege escalation, sensitive data exposure, significant business impact
        - MEDIUM: Information disclosure, denial of service, moderate business impact
        - LOW: Minor information leakage, cosmetic issues, low business impact
      `,
    });

    return object;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  async findSimilarReports(
    embedding: number[],
    threshold: number = 0.85
  ): Promise<Array<{ id: string; similarity: number; title: string }>> {
    // This would use a vector database or implement cosine similarity
    // For now, we'll use a simplified approach with Prisma
    const reports = await prisma.report.findMany({
      where: {
        status: { not: 'RESOLVED' },
        embedding: { not: null },
      },
      select: {
        id: true,
        title: true,
        embedding: true,
      },
    });

    const similarities = reports
      .map(report => {
        const reportEmbedding = JSON.parse(report.embedding!);
        const similarity = this.cosineSimilarity(embedding, reportEmbedding);
        return {
          id: report.id,
          title: report.title,
          similarity,
        };
      })
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return similarities;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

### Engineer Assignment Logic
```typescript
// lib/assignment/engineer-assignment.ts
export class EngineerAssignmentService {
  private bugTypeToTeamMapping = {
    'XSS': 'frontend',
    'SQL Injection': 'backend',
    'CSRF': 'security',
    'Authentication Bypass': 'security',
    'Authorization': 'security',
    'API Security': 'backend',
    'Input Validation': 'backend',
    'Session Management': 'security',
    'Cryptography': 'security',
    'Business Logic': 'backend',
    'Information Disclosure': 'security',
    'Denial of Service': 'infrastructure',
    'Configuration': 'devops',
    'Network Security': 'infrastructure',
  };

  async assignEngineer(reportId: string, analysis: BugAnalysis): Promise<string | null> {
    const team = this.bugTypeToTeamMapping[analysis.bugType] || 'general';
    
    // Find available engineers in the appropriate team
    const availableEngineers = await prisma.user.findMany({
      where: {
        role: 'ENGINEER',
        team: team,
      },
      include: {
        reports: {
          where: {
            status: { in: ['NEW', 'IN_PROGRESS'] },
          },
        },
      },
    });

    if (availableEngineers.length === 0) {
      // Fallback to any available engineer
      const fallbackEngineers = await prisma.user.findMany({
        where: { role: 'ENGINEER' },
        include: {
          reports: {
            where: {
              status: { in: ['NEW', 'IN_PROGRESS'] },
            },
          },
        },
      });
      
      if (fallbackEngineers.length === 0) return null;
      availableEngineers.push(...fallbackEngineers);
    }

    // Assign to engineer with least active reports
    const engineerWithLeastLoad = availableEngineers.reduce((prev, current) => 
      prev.reports.length <= current.reports.length ? prev : current
    );

    // Create assignment
    await prisma.assignment.create({
      data: {
        reportId,
        engineerId: engineerWithLeastLoad.id,
        assignedBy: 'system', // Or admin user ID
      },
    });

    // Update report
    await prisma.report.update({
      where: { id: reportId },
      data: {
        assignedEngineerId: engineerWithLeastLoad.id,
        status: 'IN_PROGRESS',
      },
    });

    return engineerWithLeastLoad.id;
  }
}
```

## Component Architecture

### Form Components
```typescript
// components/forms/bug-report-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UploadDropzone } from '@uploadthing/react';

const BugReportSchema = z.object({
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional(),
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  affectedSystem: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export function BugReportForm() {
  const form = useForm<z.infer<typeof BugReportSchema>>({
    resolver: zodResolver(BugReportSchema),
  });

  const onSubmit = async (data: z.infer<typeof BugReportSchema>) => {
    try {
      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Show success message
        form.reset();
      }
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Form fields implementation */}
    </form>
  );
}
```

### Dashboard Components
```typescript
// components/dashboard/reports-table.tsx
'use client';

import { useState, useEffect } from 'react';
import { Report, User } from '@prisma/client';

interface ReportsTableProps {
  userRole: 'ADMIN' | 'ENGINEER' | 'VIEWER';
  userId?: string;
}

export function ReportsTable({ userRole, userId }: ReportsTableProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    assignedTo: 'all',
  });

  useEffect(() => {
    fetchReports();
  }, [filters, userRole, userId]);

  const fetchReports = async () => {
    const params = new URLSearchParams({
      ...filters,
      role: userRole,
      ...(userId && { userId }),
    });

    const response = await fetch(`/api/reports?${params}`);
    const data = await response.json();
    setReports(data.reports);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        {/* Filter components */}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Table implementation */}
        </table>
      </div>
    </div>
  );
}
```

## API Route Specifications

### Report Submission API
```typescript
// app/api/reports/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BugAnalysisAgent } from '@/lib/ai/bug-analysis-agent';
import { inngest } from '@/lib/inngest';

const SubmitReportSchema = z.object({
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional(),
  title: z.string().min(10),
  description: z.string().min(50),
  affectedSystem: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  fileUrls: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SubmitReportSchema.parse(body);

    // Create report in database
    const report = await prisma.report.create({
      data: {
        ...validatedData,
        status: 'NEW',
      },
    });

    // Trigger background processing
    await inngest.send({
      name: 'report.submitted',
      data: { reportId: report.id },
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: 'Report submitted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Reports List API
```typescript
// app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const where: any = {};

  // Apply role-based filtering
  if (session.user.role === 'ENGINEER') {
    where.assignedEngineerId = session.user.id;
  }

  // Apply filters
  if (status && status !== 'all') {
    where.status = status.toUpperCase();
  }

  if (severity && severity !== 'all') {
    where.severity = severity.toUpperCase();
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        assignedEngineer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
```

## Inngest Background Tasks

### Report Processing Function
```typescript
// inngest/functions/process-report.ts
import { inngest } from '@/lib/inngest';
import { BugAnalysisAgent } from '@/lib/ai/bug-analysis-agent';
import { EngineerAssignmentService } from '@/lib/assignment/engineer-assignment';
import { EmailService } from '@/lib/email/email-service';

export const processReport = inngest.createFunction(
  { id: 'process-report' },
  { event: 'report.submitted' },
  async ({ event, step }) => {
    const { reportId } = event.data;

    // Get report data
    const report = await step.run('fetch-report', async () => {
      return await prisma.report.findUnique({
        where: { id: reportId },
      });
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    // AI Analysis
    const analysis = await step.run('ai-analysis', async () => {
      const agent = new BugAnalysisAgent();
      return await agent.analyzeReport({
        title: report.title,
        description: report.description,
        affectedSystem: report.affectedSystem,
      });
    });

    // Generate embedding for duplicate detection
    const embedding = await step.run('generate-embedding', async () => {
      const agent = new BugAnalysisAgent();
      return await agent.generateEmbedding(
        `${report.title} ${report.description}`
      );
    });

    // Check for duplicates
    const duplicates = await step.run('check-duplicates', async () => {
      const agent = new BugAnalysisAgent();
      return await agent.findSimilarReports(embedding, 0.85);
    });

    // Update report with analysis
    await step.run('update-report', async () => {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          bugType: analysis.bugType,
          severity: analysis.severity,
          aiAnalysis: analysis,
          embedding: JSON.stringify(embedding),
          ...(duplicates.length > 0 && {
            status: 'DUPLICATE',
            duplicateOfId: duplicates[0].id,
          }),
        },
      });
    });

    // Assign engineer if not duplicate
    if (duplicates.length === 0) {
      const assignedEngineerId = await step.run('assign-engineer', async () => {
        const assignmentService = new EngineerAssignmentService();
        return await assignmentService.assignEngineer(reportId, analysis);
      });

      // Send notification
      if (assignedEngineerId) {
        await step.run('send-notification', async () => {
          const emailService = new EmailService();
          await emailService.notifyEngineerAssignment(reportId, assignedEngineerId);
        });
      }
    }

    return { success: true, duplicates: duplicates.length };
  }
);
```

## Testing Strategy

### Unit Tests Example
```typescript
// __tests__/lib/ai/bug-analysis-agent.test.ts
import { BugAnalysisAgent } from '@/lib/ai/bug-analysis-agent';

describe('BugAnalysisAgent', () => {
  let agent: BugAnalysisAgent;

  beforeEach(() => {
    agent = new BugAnalysisAgent();
  });

  describe('analyzeReport', () => {
    it('should classify XSS vulnerability correctly', async () => {
      const report = {
        title: 'XSS vulnerability in search form',
        description: 'The search form allows script injection through the query parameter',
        affectedSystem: 'Search Module',
      };

      const analysis = await agent.analyzeReport(report);

      expect(analysis.bugType).toBe('XSS');
      expect(analysis.severity).toBe('HIGH');
      expect(analysis.confidence).toBeGreaterThan(0.8);
    });

    it('should handle SQL injection reports', async () => {
      const report = {
        title: 'SQL Injection in login endpoint',
        description: 'Union-based SQL injection in the login form allows database access',
      };

      const analysis = await agent.analyzeReport(report);

      expect(analysis.bugType).toBe('SQL Injection');
      expect(analysis.severity).toBe('CRITICAL');
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate similarity correctly', () => {
      const vector1 = [1, 0, 1, 0];
      const vector2 = [1, 0, 1, 0];
      
      const similarity = agent['cosineSimilarity'](vector1, vector2);
      
      expect(similarity).toBe(1);
    });
  });
});
```

### Integration Tests
```typescript
// __tests__/api/reports/submit.test.ts
import { POST } from '@/app/api/reports/submit/route';
import { NextRequest } from 'next/server';

describe('/api/reports/submit', () => {
  it('should create a new report successfully', async () => {
    const requestBody = {
      title: 'Test XSS vulnerability',
      description: 'This is a test description that is long enough to pass validation',
      reporterEmail: 'test@example.com',
      severity: 'HIGH',
    };

    const request = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reportId).toBeDefined();
  });

  it('should validate required fields', async () => {
    const requestBody = {
      title: 'Short', // Too short
      description: 'Also short', // Too short
    };

    const request = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
  });
});
```

## Deployment Configuration

### Vercel Configuration
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/inngest/route.ts": {
      "maxDuration": 300
    }
  },
  "env": {
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "DATABASE_URL": "@database-url",
    "OPENAI_API_KEY": "@openai-api-key",
    "INNGEST_EVENT_KEY": "@inngest-event-key",
    "INNGEST_SIGNING_KEY": "@inngest-signing-key"
  }
}
```

### Docker Configuration (Optional)
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

This development plan provides a comprehensive roadmap for implementing the BugFlow application with all the specified features and requirements. Each section includes detailed code examples and specifications that can be directly implemented.