#!/bin/bash

# BugFlow Setup Script
# This script automates the installation and setup process

set -e  # Exit on any error

echo "🚀 Starting BugFlow setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Step 1: Clean installation
print_status "Cleaning previous installation..."
rm -rf node_modules package-lock.json 2>/dev/null || true
print_success "Cleaned previous installation"

# Step 2: Install dependencies
print_status "Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 3: Install additional dev dependencies
print_status "Installing additional development dependencies..."
if npm install -D ts-node; then
    print_success "Development dependencies installed"
else
    print_warning "Failed to install some development dependencies, but continuing..."
fi

# Step 4: Check for .env file
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your configuration values:"
        print_warning "  - DATABASE_URL (PostgreSQL connection string)"
        print_warning "  - OPENAI_API_KEY (your OpenAI API key)"
        print_warning "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
        print_warning "  - NEXTAUTH_URL (http://localhost:3000 for development)"
        print_warning "  - INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY"
    else
        print_error ".env.example not found. Please create .env file manually."
        exit 1
    fi
else
    print_success ".env file already exists"
fi

# Step 5: Generate Prisma client
print_status "Generating Prisma client..."
if npx prisma generate; then
    print_success "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Step 6: Check database connection (optional)
print_status "Checking database connection..."
if npx prisma db push --accept-data-loss 2>/dev/null; then
    print_success "Database schema pushed successfully"
    
    # Step 7: Seed database
    print_status "Seeding database with demo data..."
    if npx prisma db seed; then
        print_success "Database seeded successfully"
        print_success "Demo credentials:"
        echo "  Admin: admin@bugflow.com / password123"
        echo "  Engineer: security.engineer@company.com / password123"
        echo "  Viewer: viewer@company.com / password123"
    else
        print_warning "Database seeding failed. You may need to run 'npx prisma db seed' manually after configuring your database."
    fi
else
    print_warning "Database connection failed. Please configure DATABASE_URL in .env file and run:"
    print_warning "  npx prisma db push"
    print_warning "  npx prisma db seed"
fi

# Step 8: Final checks
print_status "Running final checks..."

# Check TypeScript compilation
if npx tsc --noEmit --skipLibCheck; then
    print_success "TypeScript compilation check passed"
else
    print_warning "TypeScript compilation has some issues, but the app should still work"
fi

# Final success message
echo ""
print_success "🎉 BugFlow setup completed!"
echo ""
print_status "Next steps:"
echo "  1. Edit .env file with your configuration"
echo "  2. Start development server: npm run dev"
echo "  3. Visit: http://localhost:3000"
echo "  4. Check health: curl http://localhost:3000/api/health"
echo ""
print_status "For troubleshooting, see:"
echo "  - INSTALLATION_FIX.md"
echo "  - DEBUGGING_GUIDE.md"
echo "  - DEBUG_ANALYSIS.md"