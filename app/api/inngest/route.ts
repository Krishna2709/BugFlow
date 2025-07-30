import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { 
  processReport, 
  sendEngineerNotification, 
  cleanupOldReports 
} from '@/inngest/functions/process-report'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processReport,
    sendEngineerNotification,
    cleanupOldReports,
  ],
})