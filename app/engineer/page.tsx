'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  MessageSquare,
  Eye
} from 'lucide-react'
import { formatDate, getSeverityColor, getStatusColor } from '@/lib/utils'

interface Report {
  id: string
  title: string
  description: string
  severity: string
  status: string
  bugType: string
  createdAt: string
  commentsCount: number
}

export default function EngineerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
  })

  // Redirect if not engineer or admin
  useEffect(() => {
    if (status === 'loading') return
    if (!session || !['ENGINEER', 'ADMIN'].includes(session.user.role)) {
      router.push('/auth/login')
    }
  }, [session, status, router])

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports?limit=50')
      const data = await response.json()

      if (response.ok) {
        setReports(data.data)
        
        // Calculate stats
        const assigned = data.data.length
        const inProgress = data.data.filter((r: Report) => r.status === 'IN_PROGRESS').length
        const resolved = data.data.filter((r: Report) => r.status === 'RESOLVED').length
        const critical = data.data.filter((r: Report) => r.severity === 'CRITICAL').length
        
        setStats({ assigned, inProgress, resolved, critical })
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchReports() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update report status:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session || !['ENGINEER', 'ADMIN'].includes(session.user.role)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Engineer Dashboard</h1>
                <p className="text-sm text-gray-600">Your assigned bug reports</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Welcome, {session.user.name} ({session.user.team})
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Reports</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assigned}</div>
              <p className="text-xs text-muted-foreground">Total assigned to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">Currently working on</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">Successfully fixed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">High priority items</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Assigned Reports</CardTitle>
            <CardDescription>Bug reports assigned to you for investigation and resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No reports assigned to you yet.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {report.title}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(report.severity)}`}>
                            {report.severity}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">
                          {report.description.substring(0, 150)}...
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{report.bugType}</span>
                          <span>•</span>
                          <span>{formatDate(report.createdAt)}</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {report.commentsCount} comments
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <Link href={`/engineer/reports/${report.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        {report.status === 'NEW' && (
                          <Button
                            size="sm"
                            onClick={() => updateReportStatus(report.id, 'IN_PROGRESS')}
                          >
                            Start Work
                          </Button>
                        )}
                        {report.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReportStatus(report.id, 'RESOLVED')}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}