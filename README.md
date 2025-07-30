# BugFlow - Automated Bug Bounty Report Management

BugFlow is a comprehensive web application that automates the management of bug bounty reports for companies with VIP or responsible disclosure programs. Built with NextJS, OpenAI Agent SDK, Inngest, and deployed on Vercel.

## 🚀 Features

- **AI-Powered Analysis**: Automatically classify bug types, assess severity, and extract key technical details
- **Semantic Duplicate Detection**: Advanced similarity matching to prevent duplicate reports
- **Smart Assignment**: Automatically route reports to appropriate engineers based on bug type and team expertise
- **Role-Based Access Control**: Admin, Engineer, and Viewer roles with appropriate permissions
- **Real-time Dashboard**: Track metrics, monitor team performance, and manage reports
- **Background Processing**: Asynchronous task handling with Inngest
- **File Upload Support**: Screenshots, videos, and documentation attachments

## 🛠️ Tech Stack

### Frontend
- **NextJS 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hook Form** for form validation
- **Shadcn/ui** for UI components

### Backend
- **NextJS API Routes** for server-side logic
- **Prisma** with PostgreSQL for data management
- **NextAuth.js** for authentication
- **OpenAI Agent SDK** for AI processing
- **Inngest** for background tasks

### Deployment
- **Vercel** for hosting and deployment
- **Vercel Postgres** for database
- **UploadThing** for file uploads

## 📋 Prerequisites

Before setting up BugFlow, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** database (local or cloud)
- **OpenAI API** account with API key
- **Inngest** account for background tasks
- **UploadThing** account for file uploads

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bugflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Authentication
   NEXTAUTH_SECRET=your-nextauth-secret-key
   NEXTAUTH_URL=http://localhost:3000

   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/bugflow

   # OpenAI
   OPENAI_API_KEY=sk-your-openai-api-key

   # Inngest
   INNGEST_EVENT_KEY=your-inngest-event-key
   INNGEST_SIGNING_KEY=your-inngest-signing-key

   # File Upload
   UPLOADTHING_SECRET=sk_live_your-uploadthing-secret
   UPLOADTHING_APP_ID=your-uploadthing-app-id

   # Admin Setup
   ADMIN_EMAIL=admin@yourcompany.com
   ADMIN_PASSWORD=secure-admin-password
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Push database schema
   npx prisma db push

   # Seed initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## 🎯 Usage

### For Security Researchers

1. **Submit Bug Reports**
   - Navigate to `/submit`
   - Fill out the detailed bug report form
   - Upload supporting files (screenshots, videos, etc.)
   - Submit for AI analysis and team assignment

### For Security Teams

1. **Admin Dashboard** (`/admin`)
   - View all reports across the organization
   - Manage users and teams
   - Override AI decisions
   - Export reports and analytics

2. **Engineer Dashboard** (`/engineer`)
   - View assigned reports
   - Update report status
   - Add comments and collaborate
   - Track resolution progress

3. **Viewer Dashboard** (`/viewer`)
   - Read-only access to reports
   - View team statistics
   - Monitor program metrics

## 🔐 Authentication

### Demo Credentials

For testing purposes, use these demo credentials:

- **Admin**: `admin@bugflow.com` / `password123`
- **Engineer**: `security.engineer@company.com` / `password123`
- **Viewer**: `viewer@company.com` / `password123`

### Creating New Users

Admins can create new users through the admin dashboard or use the setup script:

```bash
npm run setup:admin
```

## 🤖 AI Features

### Bug Classification
- Automatically identifies bug types (XSS, SQL Injection, CSRF, etc.)
- Assesses severity based on impact and exploitability
- Extracts key technical details from descriptions

### Duplicate Detection
- Uses OpenAI embeddings for semantic similarity
- Compares against existing reports
- Flags potential duplicates for review

### Smart Assignment
- Routes reports to appropriate teams based on bug type
- Considers team workload and expertise
- Sends automatic notifications to assigned engineers

## 📊 Database Schema

The application uses the following main entities:

- **Users**: Admin, Engineer, and Viewer roles
- **Reports**: Bug reports with AI analysis
- **Teams**: Engineering teams with specializations
- **Assignments**: Report-to-engineer assignments
- **Comments**: Collaboration and updates

## 🔄 Background Tasks

Inngest handles asynchronous processing:

- **Report Analysis**: AI processing and classification
- **Duplicate Detection**: Similarity checking
- **Notifications**: Email alerts to engineers
- **Data Cleanup**: Periodic maintenance tasks

## 📈 Monitoring

### Application Metrics
- Report processing times
- AI accuracy rates
- Team performance statistics
- User activity tracking

### Error Handling
- Comprehensive logging
- Graceful fallbacks for AI failures
- User-friendly error messages
- Automatic retry mechanisms

## 🚀 Deployment

### Vercel Deployment

1. **Connect your repository to Vercel**
2. **Configure environment variables** in Vercel dashboard
3. **Set up Vercel Postgres** database
4. **Deploy** - Vercel will handle the build and deployment

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 📚 API Documentation

### Public Endpoints
- `POST /api/reports/submit` - Submit new bug report

### Protected Endpoints
- `GET /api/reports` - List reports (role-based filtering)
- `GET /api/reports/[id]` - Get specific report
- `PUT /api/reports/[id]` - Update report
- `POST /api/reports/[id]/assign` - Assign engineer
- `GET /api/users` - List users (admin only)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Check the [documentation](./docs/)
- Open an [issue](https://github.com/your-repo/bugflow/issues)
- Contact the development team

## 🔮 Roadmap

### Phase 2 Features
- Email ingestion for report submissions
- Advanced analytics dashboard
- Integration with external tools (Jira, Slack)
- Mobile-responsive design improvements

### Phase 3 Features
- Machine learning model fine-tuning
- Advanced reporting and metrics
- API for third-party integrations
- Multi-tenant support

---

**Built with ❤️ by the BugFlow Team**
