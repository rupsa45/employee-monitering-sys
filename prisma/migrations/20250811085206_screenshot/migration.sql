-- CreateTable
CREATE TABLE "screenshots" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_working_apps" (
    "id" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "appPath" TEXT,
    "appOpenAt" TIMESTAMP(3) NOT NULL,
    "appCloseAt" TIMESTAMP(3) NOT NULL,
    "keysPressed" INTEGER NOT NULL DEFAULT 0,
    "mouseClicks" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "agent_working_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_idle_times" (
    "id" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empId" TEXT NOT NULL,

    CONSTRAINT "agent_idle_times_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_empId_fkey" FOREIGN KEY ("empId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_working_apps" ADD CONSTRAINT "agent_working_apps_empId_fkey" FOREIGN KEY ("empId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_idle_times" ADD CONSTRAINT "agent_idle_times_empId_fkey" FOREIGN KEY ("empId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
