'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Shield, 
  BarChart3, 
  TrendingUp, 
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react'
import { formatDate, getSeverityColor, getStatusColor } from '@/lib/utils'

interface Report {
  id: string
  title: string
  severity: string
  status: string
  bugType: string
  assignedEngineer?: {
    name: string
    team: string
  }
  createdAt: string
}

interface TeamStats {
  team: string
  totalReports: number
  activeReports: number
  resolvedReports: number
  averageResolutionTime: number
}

export default function ViewerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)
  const [overallStats, setOverallStats] = useState({
    totalReports: 0,
    activeReports: 0,
    resolvedReports: 0,
    criticalReports: 0,
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/login')
    }
  }, [session, status, router])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch reports
      const reportsResponse = await fetch('/api/reports?limit=20')
      const reportsData = await reportsResponse.json()

      if (reportsResponse.ok) {
        setReports(reportsData.data)
        
        // Calculate overall stats
        const total = reportsData.data.length
        const active = reportsData.data.filter((r: Report) => ['NEW', 'IN_PROGRESS'].includes(r.status)).length
        const resolved = reportsData.data.filter((r: Report) => r.status === 'RESOLVED').length
        const critical = reportsData.data.filter((r: Report) => r.severity === 'CRITICAL').length
        
        setOverallStats({
          totalReports: total,
          activeReports: active,
          resolvedReports: resolved,
          criticalReports: critical,
        })

        // Calculate team stats
        const teamData: { [key: string]: TeamStats } = {}
        reportsData.data.forEach((report: Report) => {
          const team = report.assignedEngineer?.team || 'Unassigned'
          if (!teamData[team]) {
            teamData[team] = {
              team,
              totalReports: 0,
              activeReports: 0,
              resolvedReports: 0,
              averageResolutionTime: 0,
            }
          }
          teamData[team].totalReports++
          if (['NEW', 'IN_PROGRESS'].includes(report.status)) {
            teamData[team].activeReports++
          }
          if (report.status === 'RESOLVED') {
            teamData[team].resolvedReports++
          }
        })
        
        setTeamStats(Object.values(teamData))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
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

  if (!session) {
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
                <h1 className="text-2xl font-bold text-gray-900">Security Overview</h1>
                <p className="text-sm text-gray-600">Bug bounty program insights and metrics</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Welcome, {session.user.name}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalReports}</div>
              <p className="text-xs text-muted-foreground">All time submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Reports</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.activeReports}</div>
              <p className="text-xs text-muted-foreground">Currently being worked on</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overallStats.criticalReports}</div>
              <p className="text-xs text-muted-foreground">High priority vulnerabilities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{overallStats.resolvedReports}</div>
              <p className="text-xs text-muted-foreground">Successfully fixed</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Team Performance
              </CardTitle>
              <CardDescription>Performance metrics by security team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamStats.map((team) => (
                  <div key={team.team} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{team.team}</div>
                      <div className="text-sm text-gray-500">
                        {team.totalReports} total reports
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {team.resolvedReports} resolved
                      </div>
                      <div className="text-sm text-gray-500">
                        {team.activeReports} active
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Recent Reports
              </CardTitle>
              <CardDescription>Latest bug reports submitted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.slice(0, 8).map((report) => (
                  <div key={report.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {report.title}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(report.severity)}`}>
                          {report.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {report.bugType}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(report.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Severity Distribution */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Severity Distribution
            </CardTitle>
            <CardDescription>Breakdown of reports by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => {
                const count = reports.filter(r => r.severity === severity).length
                const percentage = reports.length > 0 ? Math.round((count / reports.length) * 100) : 0
                
                return (
                  <div key={severity} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-2xl font-bold ${
                      severity === 'CRITICAL' ? 'text-red-600' :
                      severity === 'HIGH' ? 'text-orange-600' :
                      severity === 'MEDIUM' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {count}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{severity}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}