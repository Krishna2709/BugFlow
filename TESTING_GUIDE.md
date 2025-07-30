# 🧪 BugFlow Testing & Validation Guide

## 📋 **Testing Overview**

BugFlow includes comprehensive testing infrastructure covering:
- **Unit Tests** - Individual component testing
- **Integration Tests** - API endpoint testing
- **System Validation** - End-to-end functionality verification
- **Manual Testing** - User interface and workflow testing

## 🚀 **Quick Start Testing**

### **1. Run All Tests**
```bash
# Run unit and integration tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### **2. System Validation**
```bash
# Quick validation (requires running server)
npm run validate

# Detailed validation with verbose output
npm run validate:verbose
```

### **3. Manual Testing**
```bash
# Start development server
npm run dev

# In another terminal, run validation
npm run validate
```

## 🔬 **Unit Tests**

### **Test Structure**
```
__tests__/
├── lib/
│   ├── logger.test.ts              # Logging system tests
│   ├── startup-validation.test.ts  # Health check tests
│   └── ai/
│       └── bug-analysis-agent.test.ts  # AI analysis tests
└── api/
    ├── health.test.ts              # Health endpoint tests
    └── reports-submit.test.ts      # Report submission tests
```

### **Running Specific Tests**
```bash
# Run specific test file
npm test logger.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="AI analysis"

# Run tests for specific directory
npm test __tests__/lib/
```

### **Test Coverage**
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

**Coverage Targets:**
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

## 🔗 **Integration Tests**

### **API Endpoint Testing**

#### **Health Check API**
```bash
# Test health endpoint
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

#### **Report Submission API**
```bash
# Test report submission
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test XSS Vulnerability",
    "description": "This is a test report to verify the API is working correctly. The application allows script injection through user input fields which could lead to session hijacking.",
    "affectedSystem": "User Profile Page",
    "severity": "HIGH"
  }'

# Expected response:
{
  "success": true,
  "data": { "reportId": "report-123" },
  "message": "Report submitted successfully"
}
```

## 🎯 **System Validation**

### **Automated Validation Script**

The [`scripts/validate-system.ts`](scripts/validate-system.ts) script performs comprehensive system checks:

#### **Environment Validation**
- ✅ Required environment variables present
- ✅ OpenAI API key format validation
- ✅ NextAuth secret length validation

#### **Database Validation**
- ✅ Database connectivity
- ✅ System user existence
- ✅ Demo users and teams setup
- ✅ Schema integrity

#### **API Validation**
- ✅ Health endpoint accessibility
- ✅ Report submission functionality
- ✅ Error handling

#### **AI Integration Validation**
- ✅ OpenAI API connectivity
- ✅ AI analysis functionality
- ✅ Fallback mechanisms

#### **Background Processing Validation**
- ✅ Inngest client initialization
- ✅ Process functions availability

#### **Security Validation**
- ✅ NextAuth configuration
- ✅ Route protection middleware
- ✅ Security headers (production)

### **Running Validation**
```bash
# Basic validation
npm run validate

# Verbose output with details
npm run validate:verbose

# Example output:
🚀 Starting BugFlow System Validation

🔧 Validating Environment Configuration...
✅ Environment Variables: All required variables present
✅ OpenAI API Key Format: Valid format
✅ NextAuth Secret: Adequate length

🗄️ Validating Database...
✅ Database Connection: Successfully connected
✅ System User: System user exists
✅ Demo Users: 6 users in database
✅ Teams Setup: 4 teams configured

📊 Validation Summary
==================================================
✅ Passed: 12
❌ Failed: 0
⚠️  Warnings: 0
📋 Total: 12

🎯 Overall Status: HEALTHY
🎉 All validations passed! BugFlow is ready for use.
```

## 🖱️ **Manual Testing**

### **Authentication Testing**

#### **1. Login Flow**
```bash
# Visit login page
open http://localhost:3000/auth/login

# Test with demo credentials:
Admin: admin@bugflow.com / password123
Engineer: security.engineer@company.com / password123
Viewer: viewer@company.com / password123
```

#### **2. Role-Based Access**
- **Admin**: Access to `/admin`, `/engineer`, `/viewer`
- **Engineer**: Access to `/engineer`, `/viewer` (blocked from `/admin`)
- **Viewer**: Access to `/viewer` only (blocked from `/admin`, `/engineer`)

### **Bug Report Submission**

#### **1. Submit Report**
```bash
# Visit submission page
open http://localhost:3000/submit

# Test cases:
- Valid report with all fields
- Minimal report (only required fields)
- Invalid report (missing required fields)
- Report with special characters
- Very long description
```

#### **2. Verify Processing**
```bash
# Check admin dashboard
open http://localhost:3000/admin

# Verify:
- Report appears in list
- AI analysis completed
- Engineer assigned
- Status updated
```

### **Dashboard Testing**

#### **Admin Dashboard**
- ✅ View all reports
- ✅ Filter by status, severity, team
- ✅ Search functionality
- ✅ Export to CSV
- ✅ Manual assignment override
- ✅ Report details view

#### **Engineer Dashboard**
- ✅ View assigned reports
- ✅ Update report status
- ✅ Add comments
- ✅ View AI analysis
- ✅ Filter personal reports

#### **Viewer Dashboard**
- ✅ Read-only access
- ✅ View reports (limited)
- ✅ No edit capabilities
- ✅ Basic filtering

## 🔧 **Test Configuration**

### **Jest Configuration**
[`jest.config.js`](jest.config.js) includes:
- Next.js integration
- TypeScript support
- Module path mapping
- Coverage thresholds
- Test environment setup

### **Test Setup**
[`jest.setup.js`](jest.setup.js) provides:
- Environment variable mocking
- Next.js component mocking
- Prisma client mocking
- NextAuth mocking
- Global fetch mocking

### **Mock Strategy**
```typescript
// Database mocking
jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    report: { create: jest.fn() },
    // ... other methods
  },
}))

// API mocking
global.fetch = jest.fn()

// NextAuth mocking
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}))
```

## 📊 **Performance Testing**

### **Load Testing**
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Submit reports"
    requests:
      - post:
          url: "/api/reports/submit"
          json:
            title: "Load Test Report"
            description: "This is a load test report to verify system performance under concurrent requests."
            affectedSystem: "Load Test System"
EOF

# Run load test
artillery run load-test.yml
```

### **Performance Monitoring**
```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Create curl-format.txt:
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

## 🚨 **Error Testing**

### **Database Errors**
```bash
# Test with invalid DATABASE_URL
DATABASE_URL="invalid-url" npm run validate

# Test with missing system user
# (Delete system user from database and run validation)
```

### **API Errors**
```bash
# Test with invalid OpenAI API key
OPENAI_API_KEY="invalid-key" npm run validate

# Test malformed requests
curl -X POST http://localhost:3000/api/reports/submit \
  -H "Content-Type: application/json" \
  -d '{"invalid": "json"}'
```

### **Authentication Errors**
```bash
# Test unauthorized access
curl http://localhost:3000/admin

# Test with invalid credentials
# (Try login with wrong password)
```

## 📈 **Continuous Integration**

### **GitHub Actions Example**
```yaml
name: Test BugFlow
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - run: npm run validate
```

## 🔍 **Debugging Tests**

### **Test Debugging**
```bash
# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
npm test -- --testNamePattern="should analyze report" --verbose
```

### **Common Issues**
1. **Mock not working**: Check mock setup in `jest.setup.js`
2. **Environment variables**: Ensure test environment variables are set
3. **Database connection**: Use test database for integration tests
4. **Async issues**: Ensure proper `await` usage in tests

## ✅ **Testing Checklist**

### **Before Deployment**
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] System validation passes
- [ ] Manual testing completed
- [ ] Performance testing acceptable
- [ ] Error scenarios tested
- [ ] Security testing completed

### **Regular Testing**
- [ ] Run tests on code changes
- [ ] Weekly full validation
- [ ] Monthly performance review
- [ ] Quarterly security audit

---

*This testing guide ensures BugFlow maintains high quality and reliability through comprehensive testing at all levels.*