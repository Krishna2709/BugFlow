# 🔧 BugFlow Debugging Guide

## 🚨 **Critical Issues & Solutions**

### **Issue #1: System User Missing (CRITICAL)**
**Symptoms:**
- Inngest background processing fails
- Error: "Foreign key constraint violation" when creating comments
- Reports stuck in processing state

**Diagnosis:**
```bash
# Check if system user exists
npx prisma studio
# Look for user with id 'system' in User table
```

**Solution:**
```bash
# Run database seeding to create system user
npx prisma db seed
```

**Prevention:**
- Always run seeding after database reset
- Add system user check to startup validation

---

### **Issue #2: Missing Dependencies (HIGH)**
**Symptoms:**
- TypeScript errors about missing modules
- Build failures
- Runtime errors

**Diagnosis:**
```bash
# Check package.json for missing dependencies
npm list --depth=0
```

**Solution:**
```bash
# Install missing dependencies
npm install @prisma/client bcryptjs @types/node
npm install @ai-sdk/openai ai zod
npm install inngest next-auth
```

---

### **Issue #3: Environment Variables Not Validated (MEDIUM)**
**Symptoms:**
- Silent failures in AI analysis
- OpenAI API errors
- Database connection issues

**Diagnosis:**
```bash
# Check environment variables
node -e "console.log(process.env.OPENAI_API_KEY ? 'OpenAI ✓' : 'OpenAI ✗')"
node -e "console.log(process.env.DATABASE_URL ? 'Database ✓' : 'Database ✗')"
```

**Solution:**
1. Copy `.env.example` to `.env`
2. Fill in all required values
3. Use health check endpoint: `GET /api/health`

---

### **Issue #4: AI Analysis Fallback Problems (MEDIUM)**
**Symptoms:**
- Poor duplicate detection
- Incorrect bug classifications
- Zero similarity scores

**Diagnosis:**
```typescript
// Add to bug-analysis-agent.ts
console.log('Embedding result:', embedding?.slice(0, 5))
console.log('Embedding magnitude:', embedding ? Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) : 'null')
```

**Solution:**
- Ensure OpenAI API key is valid
- Check API rate limits
- Implement proper null handling for embeddings

---

## 🔍 **Debugging Workflow**

### **Step 1: Environment Check**
```bash
# 1. Verify all environment variables
cat .env | grep -E "(OPENAI|DATABASE|NEXTAUTH)"

# 2. Test database connection
npx prisma db push
npx prisma studio

# 3. Check OpenAI API
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

### **Step 2: Application Startup**
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Seed database
npx prisma db seed

# 4. Start development server
npm run dev
```

### **Step 3: Health Check**
```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": [
    { "success": true, "component": "Environment Variables" },
    { "success": true, "component": "Database Connection" },
    { "success": true, "component": "System User" },
    { "success": true, "component": "OpenAI API" }
  ]
}
```

### **Step 4: Test Core Functionality**
```bash
# 1. Test bug report submission
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test XSS Vulnerability",
    "description": "This is a test report to verify the system is working correctly. The application allows script injection through user input fields.",
    "affectedSystem": "User Profile"
  }'

# 2. Check Inngest processing
# Visit Inngest dashboard or check logs

# 3. Test authentication
# Visit http://localhost:3000/auth/login
# Use demo credentials: admin@bugflow.com / password123
```

---

## 📊 **Monitoring & Logging**

### **Application Logs**
```typescript
// Enable debug logging in development
// Add to .env
NODE_ENV=development

// Check logs for:
// [INFO] [AI_ANALYSIS] AI analysis completed
// [ERROR] [DATABASE] Database operation failed
// [WARN] [DUPLICATE_DETECTION] Potential duplicates found
```

### **Database Monitoring**
```sql
-- Check report processing status
SELECT status, COUNT(*) FROM "Report" GROUP BY status;

-- Check system user exists
SELECT * FROM "User" WHERE id = 'system';

-- Check recent reports
SELECT id, title, status, "createdAt" FROM "Report" 
ORDER BY "createdAt" DESC LIMIT 10;

-- Check AI analysis results
SELECT id, title, "bugType", severity, "aiAnalysis" 
FROM "Report" 
WHERE "aiAnalysis" IS NOT NULL;
```

### **Performance Monitoring**
```typescript
// Add performance logging
import { logger } from '@/lib/logger'

// Time operations
const start = Date.now()
await someOperation()
logger.performance('operation-name', Date.now() - start)
```

---

## 🐛 **Common Issues & Solutions**

### **"Cannot find module" Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Ensure TypeScript config is correct
npx tsc --noEmit
```

### **Database Connection Errors**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database

# Test connection
npx prisma db pull
```

### **OpenAI API Errors**
```bash
# Verify API key format
echo $OPENAI_API_KEY | grep "^sk-"

# Test API access
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models | jq '.data[0].id'
```

### **Inngest Processing Stuck**
```bash
# Check Inngest configuration
echo $INNGEST_EVENT_KEY
echo $INNGEST_SIGNING_KEY

# Restart Inngest dev server
npx inngest-cli dev
```

### **Authentication Issues**
```bash
# Verify NextAuth configuration
echo $NEXTAUTH_SECRET | wc -c  # Should be > 32 characters
echo $NEXTAUTH_URL

# Check demo users exist
npx prisma studio
# Look for users with emails: admin@bugflow.com, etc.
```

### **SessionProvider Error**
**Error:** `[next-auth]: useSession must be wrapped in a <SessionProvider />`

**Symptoms:**
- Dashboard pages fail to load
- Authentication hooks throw errors
- Session state is undefined

**Solution:**
The `app/layout.tsx` must include the AuthProvider wrapper:
```typescript
// app/layout.tsx should include:
import { AuthProvider } from '@/components/providers/session-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

**Verification:**
- Restart the development server after making changes
- Check that all dashboard pages load without errors
- Verify authentication state is properly maintained

---

## 🔧 **Development Tools**

### **Useful Commands**
```bash
# Database management
npx prisma studio          # Visual database browser
npx prisma db reset        # Reset database (destructive)
npx prisma db seed         # Seed with demo data
npx prisma generate        # Generate Prisma client

# Development
npm run dev                # Start development server
npm run build              # Build for production
npm run lint               # Run ESLint
npm run type-check         # TypeScript check

# Debugging
npx inngest-cli dev        # Start Inngest dev server
curl /api/health           # Check application health
```

### **Browser DevTools**
```javascript
// Check authentication state
console.log(await fetch('/api/auth/session').then(r => r.json()))

// Check report submission
console.log(await fetch('/api/reports').then(r => r.json()))

// Monitor network requests
// Open DevTools > Network tab
// Filter by "Fetch/XHR"
```

### **Database Queries for Debugging**
```sql
-- Check processing pipeline
SELECT 
  r.id,
  r.title,
  r.status,
  r."bugType",
  r.severity,
  u.name as assigned_engineer,
  r."createdAt"
FROM "Report" r
LEFT JOIN "User" u ON r."assignedEngineerId" = u.id
ORDER BY r."createdAt" DESC;

-- Check duplicate detection
SELECT 
  r1.id as report_id,
  r1.title,
  r2.id as duplicate_of,
  r2.title as duplicate_title
FROM "Report" r1
LEFT JOIN "Report" r2 ON r1."duplicateOfId" = r2.id
WHERE r1.status = 'DUPLICATE';

-- Check assignment history
SELECT 
  a.id,
  a."reportId",
  a."engineerId",
  u.name as engineer_name,
  a.status,
  a."assignedAt"
FROM "Assignment" a
JOIN "User" u ON a."engineerId" = u.id
ORDER BY a."assignedAt" DESC;
```

---

## 🚀 **Production Debugging**

### **Error Tracking**
```typescript
// Add error tracking service (e.g., Sentry)
import * as Sentry from '@sentry/nextjs'

Sentry.captureException(error, {
  tags: {
    component: 'ai-analysis',
    reportId: reportId
  }
})
```

### **Performance Monitoring**
```typescript
// Add performance monitoring
import { logger } from '@/lib/logger'

// Monitor slow operations
if (duration > 5000) {
  logger.warn('Slow operation detected', {
    operation: 'ai-analysis',
    duration,
    reportId
  })
}
```

### **Health Checks**
```bash
# Set up monitoring alerts
curl -f http://your-domain.com/api/health || alert "BugFlow is down"

# Monitor key metrics
# - Response times
# - Error rates
# - Database connection pool
# - OpenAI API usage
```

---

## 📋 **Debugging Checklist**

### **Before Reporting Issues:**
- [ ] Environment variables are set correctly
- [ ] Database is accessible and seeded
- [ ] System user exists in database
- [ ] OpenAI API key is valid and has credits
- [ ] All dependencies are installed
- [ ] Health check endpoint returns "healthy"
- [ ] Browser console shows no errors
- [ ] Network requests are successful

### **When Issues Occur:**
- [ ] Check application logs for errors
- [ ] Verify database state with Prisma Studio
- [ ] Test individual components (auth, AI, database)
- [ ] Check external service status (OpenAI, database)
- [ ] Review recent code changes
- [ ] Test with minimal reproduction case

### **For Performance Issues:**
- [ ] Monitor response times
- [ ] Check database query performance
- [ ] Review AI API usage and rate limits
- [ ] Analyze memory usage
- [ ] Check for memory leaks
- [ ] Monitor background job processing

---

*This debugging guide covers the most common issues in BugFlow. For additional help, check the logs and use the health check endpoint to identify specific problems.*