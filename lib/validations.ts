import { z } from 'zod'

// Bug Report Submission Schema
export const BugReportSchema = z.object({
  reporterName: z.string().optional(),
  reporterEmail: z.string().email('Invalid email address').optional(),
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  affectedSystem: z.string()
    .min(1, 'Affected system is required')
    .max(100, 'Affected system must be less than 100 characters'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  fileUrls: z.array(z.string().url()).optional(),
})

export type BugReportInput = z.infer<typeof BugReportSchema>

// User Registration Schema
export const UserRegistrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  role: z.enum(['ADMIN', 'ENGINEER', 'VIEWER']).default('VIEWER'),
  team: z.string().optional(),
})

export type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>

// User Login Schema
export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type UserLoginInput = z.infer<typeof UserLoginSchema>

// Report Update Schema
export const ReportUpdateSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),
  affectedSystem: z.string()
    .max(100, 'Affected system must be less than 100 characters')
    .optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'DUPLICATE', 'REJECTED']).optional(),
  assignedEngineerId: z.string().optional(),
  duplicateOfId: z.string().optional(),
})

export type ReportUpdateInput = z.infer<typeof ReportUpdateSchema>

// Comment Schema
export const CommentSchema = z.object({
  comment: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters'),
})

export type CommentInput = z.infer<typeof CommentSchema>

// Team Schema
export const TeamSchema = z.object({
  name: z.string()
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name must be less than 50 characters'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  bugTypes: z.array(z.string()).optional(),
})

export type TeamInput = z.infer<typeof TeamSchema>

// Assignment Schema
export const AssignmentSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
  engineerId: z.string().min(1, 'Engineer ID is required'),
})

export type AssignmentInput = z.infer<typeof AssignmentSchema>

// Search/Filter Schema
export const ReportFilterSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'DUPLICATE', 'REJECTED', 'ALL']).default('ALL'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'ALL']).default('ALL'),
  assignedTo: z.string().optional(),
  team: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
})

export type ReportFilterInput = z.infer<typeof ReportFilterSchema>

// AI Analysis Schema
export const AIAnalysisSchema = z.object({
  bugType: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedSystem: z.string(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  technicalDetails: z.array(z.string()),
  suggestedAssignment: z.string().optional(),
})

export type AIAnalysisResult = z.infer<typeof AIAnalysisSchema>

// Duplicate Detection Schema
export const DuplicateDetectionSchema = z.object({
  reportId: z.string(),
  similarity: z.number().min(0).max(1),
  title: z.string(),
  status: z.string(),
})

export type DuplicateResult = z.infer<typeof DuplicateDetectionSchema>

// File Upload Schema
export const FileUploadSchema = z.object({
  name: z.string(),
  size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  type: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf'].includes(type),
    'Invalid file type. Only images, videos, and PDFs are allowed.'
  ),
})

export type FileUploadInput = z.infer<typeof FileUploadSchema>

// Environment Variables Schema
export const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  INNGEST_EVENT_KEY: z.string(),
  INNGEST_SIGNING_KEY: z.string(),
  UPLOADTHING_SECRET: z.string(),
  UPLOADTHING_APP_ID: z.string(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
})

// API Response Schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
})

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
})

export type ApiResponse<T = any> = {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export type PaginatedResponse<T = any> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Validation helper functions
export function validateEnv() {
  try {
    EnvSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Invalid environment variables:', error)
    throw new Error('Invalid environment variables')
  }
}

export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> {
  return {
    success,
    ...(data && { data }),
    ...(message && { message }),
    ...(error && { error }),
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}