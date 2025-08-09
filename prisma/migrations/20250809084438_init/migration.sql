-- CreateEnum
CREATE TYPE "EmpGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALFDAY', 'LATE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('CASUAL', 'SICK', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "WorkingLocation" AS ENUM ('OFFICE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    "empEmail" TEXT NOT NULL,
    "empPhone" TEXT NOT NULL,
    "empPassword" TEXT NOT NULL,
    "confirmPassword" TEXT NOT NULL,
    "empRole" TEXT NOT NULL DEFAULT 'employee',
    "empTechnology" TEXT NOT NULL,
    "empProfile" TEXT NOT NULL DEFAULT '',
    "empGender" "EmpGender" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheets" (
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
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emp_leaves" (
    "id" TEXT NOT NULL,
    "casualLeaves" INTEGER NOT NULL DEFAULT 10,
    "sickLeave" INTEGER NOT NULL DEFAULT 10,
    "otherLeaves" INTEGER NOT NULL DEFAULT 10,
    "totalLeave" INTEGER NOT NULL DEFAULT 0,
    "leaveType" "LeaveType" NOT NULL DEFAULT 'CASUAL',
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
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
CREATE TABLE "notifications" (
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
CREATE TABLE "activity_snapshots" (
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
    "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "workingFrom" "WorkingLocation" NOT NULL DEFAULT 'OFFICE',
    "lastActivity" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "activity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TaskAssignments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_empEmail_key" ON "employees"("empEmail");

-- CreateIndex
CREATE UNIQUE INDEX "activity_snapshots_empId_date_key" ON "activity_snapshots"("empId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "_TaskAssignments_AB_unique" ON "_TaskAssignments"("A", "B");

-- CreateIndex
CREATE INDEX "_TaskAssignments_B_index" ON "_TaskAssignments"("B");

-- AddForeignKey
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_empId_fkey" FOREIGN KEY ("empId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emp_leaves" ADD CONSTRAINT "emp_leaves_empId_fkey" FOREIGN KEY ("empId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_empId_fkey" FOREIGN KEY ("empId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_snapshots" ADD CONSTRAINT "activity_snapshots_empId_fkey" FOREIGN KEY ("empId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskAssignments" ADD CONSTRAINT "_TaskAssignments_A_fkey" FOREIGN KEY ("A") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskAssignments" ADD CONSTRAINT "_TaskAssignments_B_fkey" FOREIGN KEY ("B") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
