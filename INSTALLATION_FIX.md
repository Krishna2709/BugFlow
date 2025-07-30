# 🔧 BugFlow Installation Fix Guide

## 🚨 **Critical Dependency Issue Resolved**

The original package.json contained a non-existent dependency `@radix-ui/react-badge` which caused npm installation to fail. This has been fixed.

## 📦 **Fixed Dependencies**

### **Removed:**
- `@radix-ui/react-badge` (doesn't exist)

### **Updated:**
- `openai` → `@ai-sdk/openai` (for AI SDK v3 compatibility)
- `ai` → `^3.0.0` (latest version)

### **Added Custom Component:**
- [`components/ui/badge.tsx`](components/ui/badge.tsx) - Custom badge component to replace missing Radix UI badge

## 🛠 **Installation Steps**

### **Step 1: Clean Installation**
```bash
# Remove existing node_modules and lock file
rm -rf node_modules package-lock.json

# Install dependencies
npm install
```

### **Step 2: Install Additional Required Dependencies**
```bash
# Install missing dependencies for our debugging improvements
npm install @types/node

# Install development dependencies for seeding
npm install -D ts-node

# Install Prisma CLI globally (optional but recommended)
npm install -g prisma
```

### **Step 3: Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your values:
# - DATABASE_URL (PostgreSQL connection string)
# - OPENAI_API_KEY (your OpenAI API key)
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - NEXTAUTH_URL (http://localhost:3000 for development)
# - INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY (from Inngest dashboard)
```

### **Step 4: Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database with demo data and system user
# Note: The package.json now includes proper prisma.seed configuration
npx prisma db seed
```

### **Step 5: Verify Installation**
```bash
# Start development server
npm run dev

# In another terminal, check health
curl http://localhost:3000/api/health
```

## 🔍 **Troubleshooting Common Issues**

### **Issue: TypeScript Errors**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# If errors persist, ensure all dependencies are installed
npm install
```

### **Issue: Prisma Client Not Generated**
```bash
# Regenerate Prisma client
npx prisma generate

# If database schema changes, push them
npx prisma db push
```

### **Issue: Environment Variables**
```bash
# Validate environment variables
node -e "
const required = ['DATABASE_URL', 'OPENAI_API_KEY', 'NEXTAUTH_SECRET'];
const missing = required.filter(key => !process.env[key]);
console.log(missing.length ? 'Missing: ' + missing.join(', ') : 'All required env vars present');
"
```

### **Issue: Database Connection**
```bash
# Test database connection
npx prisma db pull

# If connection fails, check DATABASE_URL format:
# postgresql://username:password@localhost:5432/database_name
```

### **Issue: OpenAI API**
```bash
# Test OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

## 📋 **Verification Checklist**

After installation, verify these work:

- [ ] `npm run dev` starts without errors
- [ ] `curl http://localhost:3000/api/health` returns healthy status
- [ ] Can access login page at `http://localhost:3000/auth/login`
- [ ] Can submit bug report at `http://localhost:3000/submit`
- [ ] Prisma Studio works: `npx prisma studio`
- [ ] Database contains demo users and system user

## 🎯 **Demo Credentials**

After running `npx prisma db seed`, use these credentials:

```
Admin: admin@bugflow.com / password123
Security Engineer: security.engineer@company.com / password123
Frontend Engineer: frontend.engineer@company.com / password123
Backend Engineer: backend.engineer@company.com / password123
Infrastructure Engineer: infra.engineer@company.com / password123
Viewer: viewer@company.com / password123
```

## 🚀 **Next Steps**

1. **Test Core Functionality:**
   - Submit a bug report
   - Check AI analysis in admin dashboard
   - Verify engineer assignment

2. **Monitor Background Processing:**
   - Check Inngest dashboard
   - Monitor application logs
   - Use health check endpoint

3. **Development:**
   - Add file upload functionality
   - Implement manual overrides
   - Write tests

## 📊 **Package.json Summary**

The fixed package.json now includes:
- ✅ All valid dependencies
- ✅ Proper AI SDK packages
- ✅ Complete UI component library
- ✅ Database and authentication packages
- ✅ Development and testing tools
- ✅ Prisma seeding configuration
- ✅ Required TypeScript dependencies

## 🔧 **Custom Components Added**

Since `@radix-ui/react-badge` doesn't exist, we created:
- [`components/ui/badge.tsx`](components/ui/badge.tsx) - Custom badge component with variants

This component provides the same functionality as the expected Radix UI badge with:
- Multiple variants (default, secondary, destructive, outline)
- Proper TypeScript support
- Tailwind CSS styling
- Class variance authority integration

---

*The BugFlow application should now install and run without dependency errors.*