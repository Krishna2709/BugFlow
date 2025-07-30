'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { BugReportSchema } from '@/lib/validations'

export default function SubmitReportPage() {
  const [formData, setFormData] = useState({
    reporterName: '',
    reporterEmail: '',
    title: '',
    description: '',
    affectedSystem: '',
    severity: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [reportId, setReportId] = useState('')
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      // Validate form data
      const validatedData = BugReportSchema.parse(formData)

      // Submit to API
      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      })

      const result = await response.json()

      if (response.ok) {
        setReportId(result.reportId)
        setIsSubmitted(true)
      } else {
        if (result.errors) {
          // Handle validation errors
          const fieldErrors: Record<string, string> = {}
          result.errors.forEach((error: any) => {
            fieldErrors[error.path[0]] = error.message
          })
          setErrors(fieldErrors)
        } else {
          setErrors({ general: result.message || 'Failed to submit report' })
        }
      }
    } catch (error) {
      console.error('Submit error:', error)
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Report Submitted Successfully!</h1>
            <p className="mt-2 text-gray-600">
              Your bug report has been received and is being processed.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>
                Your report has been assigned ID: <strong>{reportId}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">What happens next?</h3>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• Our AI system will analyze your report for classification and severity</li>
                  <li>• We'll check for duplicate reports to avoid redundancy</li>
                  <li>• If unique, your report will be assigned to the appropriate security team</li>
                  <li>• You'll receive updates on the progress via email (if provided)</li>
                </ul>
              </div>

              <div className="flex space-x-4">
                <Button onClick={() => setIsSubmitted(false)}>
                  Submit Another Report
                </Button>
                <Link href="/">
                  <Button variant="outline">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Submit Bug Report</h1>
              <p className="text-gray-600">Help us improve security by reporting vulnerabilities</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Bug Report Details</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help our security team understand and reproduce the issue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errors.general}</span>
                </div>
              )}

              {/* Reporter Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reporterName">Your Name (Optional)</Label>
                  <Input
                    id="reporterName"
                    value={formData.reporterName}
                    onChange={(e) => handleInputChange('reporterName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporterEmail">Email (Optional)</Label>
                  <Input
                    id="reporterEmail"
                    type="email"
                    value={formData.reporterEmail}
                    onChange={(e) => handleInputChange('reporterEmail', e.target.value)}
                    placeholder="john@example.com"
                  />
                  {errors.reporterEmail && (
                    <p className="text-sm text-red-600">{errors.reporterEmail}</p>
                  )}
                </div>
              </div>

              {/* Bug Details */}
              <div className="space-y-2">
                <Label htmlFor="title">Bug Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Brief description of the vulnerability"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="affectedSystem">Affected System/Component *</Label>
                <Input
                  id="affectedSystem"
                  value={formData.affectedSystem}
                  onChange={(e) => handleInputChange('affectedSystem', e.target.value)}
                  placeholder="e.g., Login page, API endpoint, User profile"
                  className={errors.affectedSystem ? 'border-red-500' : ''}
                />
                {errors.affectedSystem && (
                  <p className="text-sm text-red-600">{errors.affectedSystem}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Suggested Severity (Optional)</Label>
                <select
                  id="severity"
                  value={formData.severity}
                  onChange={(e) => handleInputChange('severity', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select severity level</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Please provide detailed steps to reproduce, impact assessment, and any additional technical details..."
                  rows={8}
                  className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    errors.description ? 'border-red-500' : ''
                  }`}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  Minimum 50 characters. Include steps to reproduce, expected vs actual behavior, and potential impact.
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <Link href="/">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}