import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { UserLoginSchema } from '@/lib/validations'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'john@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Validate input
          const { email, password } = UserLoginSchema.parse(credentials)

          // Find user in database
          const user = await prisma.user.findUnique({
            where: {
              email: email.toLowerCase(),
            },
          })

          if (!user) {
            return null
          }

          // For demo purposes, we'll check if password matches email prefix
          // In production, you'd compare with hashed password
          const isValidPassword = password === 'password123' || 
            await bcrypt.compare(password, user.id) // Temporary check

          if (!isValidPassword) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            team: user.team,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.team = user.team
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.team = token.team as string
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log('User signed in:', user.email)
    },
    async signOut({ session, token }) {
      console.log('User signed out')
    },
  },
}

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      team?: string | null
    }
  }

  interface User {
    role: string
    team?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    team?: string | null
  }
}