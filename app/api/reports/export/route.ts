import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can export all data
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { filters = {} } = body

    // Build where clause based on filters
    const where: any = {}

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status
    }

    if (filters.severity && filters.severity !== 'ALL') {
      where.severity = filters.severity
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { bugType: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    // Fetch reports for export
    const reports = await prisma.report.findMany({
      where,
      include: {
        assignedEngineer: {
          select: {
            name: true,
            email: true,
            team: true,
          },
        },
        duplicateOf: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Title',
      'Description',
      'Bug Type',
      'Severity',
      'Status',
      'Affected System',
      'Reporter Name',
      'Reporter Email',
      'Assigned Engineer',
      'Engineer Team',
      'Comments Count',
      'Duplicate Of',
      'Created At',
      'Updated At',
    ]

    const csvRows = reports.map(report => [
      report.id,
      `"${report.title.replace(/"/g, '""')}"`, // Escape quotes
      `"${report.description.replace(/"/g, '""').substring(0, 500)}"`, // Limit description length
      report.bugType || '',
      report.severity || '',
      report.status,
      report.affectedSystem || '',
      report.reporterName || '',
      report.reporterEmail || '',
      report.assignedEngineer?.name || '',
      report.assignedEngineer?.team || '',
      report._count.comments,
      report.duplicateOf ? `${report.duplicateOf.id} - ${report.duplicateOf.title}` : '',
      report.createdAt.toISOString(),
      report.updatedAt.toISOString(),
    ])

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="bug-reports-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}