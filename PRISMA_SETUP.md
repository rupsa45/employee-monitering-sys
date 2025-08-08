# Prisma PostgreSQL Migration Guide

This guide will help you migrate from MongoDB to PostgreSQL using Prisma.

## Prerequisites

1. **PostgreSQL Database**: Make sure you have PostgreSQL installed and running
2. **Node.js**: Version 16 or higher
3. **npm or yarn**: Package manager

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

#### **Option A: Gmail Configuration (Recommended for Development)**

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/employee_tracking_db?schema=public"

# JWT Configuration
SECRET_KEY="your-secret-key-here"

# Email Configuration (Gmail)
EMAIL="your-gmail@gmail.com"
PASS="your-16-character-app-password"

# Server Configuration
PORT=8000

# Logging Configuration
LOG_LEVEL="info"
```

#### **Option B: Company Email Domain Configuration**

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/employee_tracking_db?schema=public"

# JWT Configuration
SECRET_KEY="your-secret-key-here"

# Email Configuration (Company Domain)
EMAIL="rupsa@tellistechnologies.com"
PASS="your-email-password"
SMTP_HOST="smtp.tellistechnologies.com"  # Your company SMTP server
SMTP_PORT=587                            # SMTP port (usually 587 or 465)
SMTP_SECURE=false                        # true for 465, false for other ports

# Server Configuration
PORT=8000

# Logging Configuration
LOG_LEVEL="info"
```

### 3. Email Setup Instructions

#### **For Gmail:**
1. Create a Gmail account for your application
2. Enable 2-Factor Authentication
3. Generate App Password (Security → App passwords)
4. Use the 16-character app password (not your regular password)

#### **For Company Email Domain:**
1. Get SMTP server details from your IT department
2. Use your company email credentials
3. Configure SMTP settings according to your email provider

### 4. Database Setup

1. **Create PostgreSQL Database**:
   ```sql
   CREATE DATABASE employee_tracking_db;
   ```

2. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

3. **Run Database Migrations**:
   ```bash
   npm run prisma:migrate
   ```

   Or if you want to push the schema directly:
   ```bash
   npm run db:push
   ```

### 5. Start the Application

```bash
npm start
```

## Database Schema Overview

### Models

1. **Employee**: Core employee information
   - Personal details (name, email, phone, gender)
   - Authentication (password, confirmPassword)
   - Professional info (technology, role)
   - Status tracking (isActive)

2. **TimeSheet**: Attendance and time tracking
   - Clock in/out times
   - Break management (start, end, duration)
   - Work hours and status
   - IP tracking and location

3. **EmpLeave**: Leave management
   - Leave types (casual, sick, other)
   - Leave balances and status
   - Date ranges and approval workflow

4. **Notification**: Communication system
   - Title and message content
   - Employee targeting
   - Status tracking

5. **ActivitySnapshot**: Admin monitoring
   - Daily activity summaries
   - Performance metrics
   - Break session tracking
   - Historical data management

6. **Task**: Task management system
   - Task assignment and tracking
   - Many-to-many employee relationships
   - Status workflow (PENDING → IN_PROGRESS → COMPLETED)
   - Due date management

### Enums

- **EmpGender**: MALE, FEMALE, OTHER
- **AttendanceStatus**: PRESENT, ABSENT, HALFDAY, LATE
- **LeaveType**: CASUAL, SICK, OTHER
- **LeaveStatus**: PENDING, APPROVE, REJECT
- **WorkingLocation**: OFFICE, REMOTE, HYBRID
- **TaskStatus**: PENDING, IN_PROGRESS, COMPLETED

## Key Changes from MongoDB

1. **ID Generation**: Using `cuid()` instead of MongoDB ObjectId
2. **Relationships**: Proper foreign key relationships with cascade delete
3. **Data Types**: PostgreSQL-specific data types (Int, String, Boolean, DateTime)
4. **Enums**: Native PostgreSQL enums for better data integrity
5. **Indexes**: Automatic indexing on foreign keys and unique constraints
6. **Email Service**: Support for both Gmail and company email domains

## Migration Commands

```bash
# Generate Prisma client after schema changes
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Push schema changes directly (for development)
npm run db:push

# Open Prisma Studio for database management
npm run prisma:studio
```

## API Endpoints

All existing API endpoints remain the same, but now use Prisma client instead of Mongoose:

- **Employee Management**: `/employee/*`
- **Time Tracking**: `/timeSheet/*`
- **Leave Management**: `/empLeave/*`
- **Admin Dashboard**: `/admin/*`
- **Admin Timesheet**: `/admin-timesheet/*`
- **Bench Management**: `/bench/*`
- **Notifications**: `/notification/*`
- **Task Management**: `/tasks/*` (Admin) and `/emp-tasks/*` (Employee)

## Troubleshooting

1. **Database Connection Issues**:
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure database exists

2. **Migration Issues**:
   - Reset database: `npx prisma migrate reset`
   - Check schema syntax: `npx prisma validate`

3. **Client Generation Issues**:
   - Clear generated files: `rm -rf node_modules/.prisma`
   - Regenerate: `npm run prisma:generate`

4. **Email Issues**:
   - For Gmail: Check app password and 2FA settings
   - For company domain: Verify SMTP settings with IT department
   - Test email configuration: Check logs for SMTP errors

## Next Steps

After successful migration:

1. Update all controller files to use Prisma client
2. Test all API endpoints
3. Migrate existing data if needed
4. Update validation schemas if required
5. Update logging configuration for PostgreSQL
6. Test email functionality with your chosen provider
