-- CreateEnum
CREATE TYPE "public"."EmpGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALFDAY', 'LATE');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('CASUAL', 'SICK', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "public"."WorkingLocation" AS ENUM ('OFFICE', 'REMOTE', 'HYBRID');

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empEmail" TEXT NOT NULL,
    "empPhone" INTEGER NOT NULL,
    "empPassword" TEXT NOT NULL,
    "confirmPassword" TEXT NOT NULL,
    "empRole" TEXT NOT NULL DEFAULT 'employee',
    "empTechnology" TEXT NOT NULL,
    "empProfile" TEXT NOT NULL DEFAULT '',
    "empGender" "public"."EmpGender" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timesheets" (
    "id" TEXT NOT NULL,
    "clockIn" TEXT NOT NULL DEFAULT '',
    "clockOut" TEXT NOT NULL DEFAULT '',
    "clockinIP" TEXT NOT NULL DEFAULT '',
    "hoursLoggedIn" INTEGER NOT NULL DEFAULT 0,
    "workingFrom" TEXT NOT NULL DEFAULT 'office',
    "breakStart" TEXT NOT NULL DEFAULT '',
    "breakEnd" TEXT NOT NULL DEFAULT '',
    "totalBreakTime" INTEGER NOT NULL DEFAULT 0,
    "totalWorkingDays" INTEGER NOT NULL DEFAULT 0,
    "dayPresent" TEXT NOT NULL DEFAULT '0',
    "halfDay" INTEGER NOT NULL DEFAULT 0,
    "dayAbsent" TEXT NOT NULL DEFAULT '0',
    "holidays" TEXT NOT NULL DEFAULT '0',
    "dayLate" TEXT NOT NULL DEFAULT '',
    "status" "public"."AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emp_leaves" (
    "id" TEXT NOT NULL,
    "casualLeaves" INTEGER NOT NULL DEFAULT 10,
    "sickLeave" INTEGER NOT NULL DEFAULT 10,
    "otherLeaves" INTEGER NOT NULL DEFAULT 10,
    "totalLeave" INTEGER NOT NULL DEFAULT 0,
    "leaveType" "public"."LeaveType" NOT NULL DEFAULT 'CASUAL',
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "emp_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_snapshots" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalWorkHours" INTEGER NOT NULL DEFAULT 0,
    "totalBreakTime" INTEGER NOT NULL DEFAULT 0,
    "netWorkHours" INTEGER NOT NULL DEFAULT 0,
    "clockInTime" TEXT NOT NULL DEFAULT '',
    "clockOutTime" TEXT NOT NULL DEFAULT '',
    "isCurrentlyWorking" BOOLEAN NOT NULL DEFAULT false,
    "isOnBreak" BOOLEAN NOT NULL DEFAULT false,
    "breakSessions" JSONB[],
    "attendanceStatus" "public"."AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "workingFrom" "public"."WorkingLocation" NOT NULL DEFAULT 'OFFICE',
    "lastActivity" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "activity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_empEmail_key" ON "public"."employees"("empEmail");

-- CreateIndex
CREATE UNIQUE INDEX "activity_snapshots_empId_date_key" ON "public"."activity_snapshots"("empId", "date");

-- AddForeignKey
ALTER TABLE "public"."timesheets" ADD CONSTRAINT "timesheets_empId_fkey" FOREIGN KEY ("empId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emp_leaves" ADD CONSTRAINT "emp_leaves_empId_fkey" FOREIGN KEY ("empId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_empId_fkey" FOREIGN KEY ("empId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_snapshots" ADD CONSTRAINT "activity_snapshots_empId_fkey" FOREIGN KEY ("empId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
