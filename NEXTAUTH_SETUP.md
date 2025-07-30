# 🔐 NextAuth Setup Guide for BugFlow

## Current Configuration Status
✅ NextAuth is already configured and ready to use! Here's what's set up:

## 1. **Environment Variables** (Already Configured)
Your `.env` file has the required NextAuth variables:
```bash
NEXTAUTH_SECRET=your-nextauth-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

## 2. **Authentication Configuration** (`lib/auth.ts`)
The auth configuration includes:
- **Prisma Adapter** for database integration
- **JWT Strategy** for session management
- **Credentials Provider** for email/password login
- **Role-based authentication** (Admin, Engineer, Viewer)
- **Custom session callbacks** for role management

## 3. **API Route** (`app/api/auth/[...nextauth]/route.ts`)
The NextAuth API handler is properly configured to handle authentication requests.

## 4. **Demo Credentials Available**
```
Admin: admin@bugflow.com / password123
Engineer: security.engineer@company.com / password123
Viewer: viewer@company.com / password123
```

## 🚀 How to Use NextAuth in BugFlow

### **Step 1: Install Dependencies** (if not done)
```bash
npm install next-auth @next-auth/prisma-adapter bcryptjs
npm install @types/bcryptjs --save-dev
```

### **Step 2: Generate NextAuth Secret** (Recommended)
Replace the placeholder secret with a secure one:
```bash
# Generate a secure secret
openssl rand -base64 32
```

Then update your `.env` file:
```bash
NEXTAUTH_SECRET=your-generated-secure-secret-here
```

### **Step 3: Set Up Database** (if not done)
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with demo users
npm run db:seed
```

### **Step 4: Wrap Your App with Session Provider**
Update your `app/layout.tsx` to include the session provider:

```typescript
import { AuthProvider } from '@/components/providers/session-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

### **Step 5: Using NextAuth in Components**
```typescript
import { useSession, signIn, signOut } from 'next-auth/react'

function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <p>Loading...</p>
  
  if (session) {
    return (
      <>
        <p>Signed in as {session.user.email}</p>
        <p>Role: {session.user.role}</p>
        <button onClick={() => signOut()}>Sign out</button>
      </>
    )
  }
  
  return (
    <>
      <p>Not signed in</p>
      <button onClick={() => signIn()}>Sign in</button>
    </>
  )
}
```

### **Step 6: Server-Side Authentication**
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Access user role
  console.log('User role:', session.user.role)
  
  return Response.json({ user: session.user })
}
```

## 🔧 Current Authentication Flow

### **1. Login Process**
- Users visit `/auth/login`
- Enter email and password
- System validates against database
- Creates JWT session with role information
- Redirects based on role:
  - Admin → `/admin`
  - Engineer → `/engineer`
  - Viewer → `/viewer`

### **2. Role-Based Access Control**
The middleware (`middleware.ts`) automatically:
- Protects routes based on user roles
- Redirects unauthorized users
- Handles API route protection

### **3. Session Management**
- JWT tokens include user role and team
- Sessions persist across browser sessions
- Automatic token refresh

## 🛠️ Customization Options

### **Add OAuth Providers** (Optional)
You can extend the configuration to include OAuth providers:

```typescript
// In lib/auth.ts
import GoogleProvider from 'next-auth/providers/google'

providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  // ... existing credentials provider
]
```

### **Password Hashing** (Production Ready)
The current setup uses a demo password. For production, implement proper password hashing:

```typescript
// In the authorize function
const isValidPassword = await bcrypt.compare(password, user.hashedPassword)
```

## 🚨 Security Notes

1. **Change the NextAuth Secret** for production
2. **Implement proper password hashing** 
3. **Use HTTPS** in production (update NEXTAUTH_URL)
4. **Consider rate limiting** for login attempts
5. **Implement password reset** functionality

## ✅ Testing Authentication

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Visit the login page**: `http://localhost:3000/auth/login`

3. **Test with demo credentials**:
   - Admin: `admin@bugflow.com` / `password123`
   - Engineer: `security.engineer@company.com` / `password123`
   - Viewer: `viewer@company.com` / `password123`

4. **Verify role-based redirects** work correctly

## 🔍 Troubleshooting

### Common Issues:

1. **"Invalid credentials" error**
   - Ensure you're using the correct demo credentials
   - Check that the database is seeded with users

2. **Session not persisting**
   - Verify NEXTAUTH_SECRET is set
   - Check that cookies are enabled in browser

3. **Role-based redirects not working**
   - Ensure middleware.ts is properly configured
   - Check that user roles are correctly set in database

4. **Database connection issues**
   - Verify DATABASE_URL is correct
   - Run `npx prisma db push` to ensure schema is up to date

## 📚 Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Adapter Documentation](https://next-auth.js.org/adapters/prisma)
- [JWT Strategy Guide](https://next-auth.js.org/configuration/options#jwt)

Your NextAuth setup is complete and ready to use! The authentication system is fully integrated with the BugFlow application and supports role-based access control out of the box.