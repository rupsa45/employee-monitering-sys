const cron = require('node-cron');
const ScheduledNotificationService = require('../service/scheduledNotificationService');
const EmailReminderService = require('../service/emailReminderService');
const TaskNotificationService = require('../service/taskNotificationService');

/**
 * Enhanced Cron Job System
 * Handles all scheduled notifications, reminders, and system maintenance
 */
class CronJobManager {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize all cron jobs for scheduled notifications
   */
  initializeCronJobs() {
    try {
      if (this.isInitialized) {
        console.log('Cron jobs already initialized');
        return;
      }

      console.log('🚀 Initializing enhanced cron job system...');

      // Meeting Reminders
      this.initializeMeetingReminders();
      
      // Task Reminders
      this.initializeTaskReminders();
      
      // System Maintenance
      this.initializeSystemMaintenance();
      
      // Analytics and Reports
      this.initializeAnalyticsJobs();

      this.isInitialized = true;
      console.log('✅ Enhanced cron job system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize cron jobs:', error.message);
      throw error;
    }
  }

  /**
   * Initialize meeting reminder cron jobs
   */
  initializeMeetingReminders() {
    // 15 minutes before meeting - High priority reminder
    this.addJob('meeting-reminder-15min', '*/15 * * * *', async () => {
      try {
        console.log('📧 Sending 15-minute meeting reminders...');
        const result = await EmailReminderService.sendMeetingReminders({ minutesAhead: 15 });
        console.log(`✅ 15-minute reminders sent: ${result.successfulReminders}/${result.totalReminders}`);
      } catch (error) {
        console.error('❌ 15-minute meeting reminder cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // 1 hour before meeting - Medium priority reminder
    this.addJob('meeting-reminder-1hour', '0 * * * *', async () => {
      try {
        console.log('📧 Sending 1-hour meeting reminders...');
        const result = await EmailReminderService.sendMeetingReminders({ minutesAhead: 60 });
        console.log(`✅ 1-hour reminders sent: ${result.successfulReminders}/${result.totalReminders}`);
      } catch (error) {
        console.error('❌ 1-hour meeting reminder cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // 1 day before meeting - Early reminder
    this.addJob('meeting-reminder-1day', '0 9 * * *', async () => {
      try {
        console.log('📧 Sending 1-day meeting reminders...');
        const result = await EmailReminderService.sendMeetingReminders({ minutesAhead: 1440 });
        console.log(`✅ 1-day reminders sent: ${result.successfulReminders}/${result.totalReminders}`);
      } catch (error) {
        console.error('❌ 1-day meeting reminder cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Meeting cleanup - Clean up old meetings
    this.addJob('meeting-cleanup', '0 2 * * *', async () => {
      try {
        console.log('🧹 Cleaning up old meetings...');
        await this.cleanupOldMeetings();
        console.log('✅ Meeting cleanup completed');
      } catch (error) {
        console.error('❌ Meeting cleanup cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
  }

  /**
   * Initialize task reminder cron jobs
   */
  initializeTaskReminders() {
    // Daily task reminders at 9 AM
    this.addJob('task-reminder-daily', '0 9 * * *', async () => {
      try {
        console.log('📋 Sending daily task reminders...');
        const result = await EmailReminderService.sendTaskReminders({ daysAhead: 1 });
        console.log(`✅ Daily task reminders sent: ${result.successfulReminders}/${result.totalReminders}`);
      } catch (error) {
        console.error('❌ Daily task reminder cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Task due date reminders - Run every hour from 9 AM to 6 PM on weekdays
    this.addJob('task-reminder-hourly', '0 9-18 * * 1-5', async () => {
      try {
        console.log('📋 Sending hourly task reminders...');
        await ScheduledNotificationService.sendDailyTaskReminders();
        console.log('✅ Hourly task reminders sent');
      } catch (error) {
        console.error('❌ Hourly task reminder cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Weekly task summary on Sundays at 10 AM
    this.addJob('task-summary-weekly', '0 10 * * 0', async () => {
      try {
        console.log('📊 Sending weekly task summary...');
        await ScheduledNotificationService.sendWeeklyTaskSummary();
        console.log('✅ Weekly task summary sent');
      } catch (error) {
        console.error('❌ Weekly task summary cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Task escalation - Check for overdue tasks
    this.addJob('task-escalation', '0 11 * * 1-5', async () => {
      try {
        console.log('⚠️ Checking for overdue tasks...');
        await this.escalateOverdueTasks();
        console.log('✅ Task escalation completed');
      } catch (error) {
        console.error('❌ Task escalation cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
  }

  /**
   * Initialize system maintenance cron jobs
   */
  initializeSystemMaintenance() {
    // Email retry - Resend failed emails every 2 hours
    this.addJob('email-retry', '0 */2 * * *', async () => {
      try {
        console.log('📧 Retrying failed emails...');
        const result = await EmailReminderService.resendFailedEmails({ maxRetries: 3 });
        console.log(`✅ Email retry completed: ${result.successfulResends} successful, ${result.failedResends} failed`);
      } catch (error) {
        console.error('❌ Email retry cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // System health check - Every 6 hours
    this.addJob('system-health-check', '0 */6 * * *', async () => {
      try {
        console.log('🏥 Running system health check...');
        await this.performSystemHealthCheck();
        console.log('✅ System health check completed');
      } catch (error) {
        console.error('❌ System health check cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Database cleanup - Daily at 3 AM
    this.addJob('database-cleanup', '0 3 * * *', async () => {
      try {
        console.log('🗄️ Running database cleanup...');
        await this.performDatabaseCleanup();
        console.log('✅ Database cleanup completed');
      } catch (error) {
        console.error('❌ Database cleanup cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
  }

  /**
   * Initialize analytics and reporting cron jobs
   */
  initializeAnalyticsJobs() {
    // Daily analytics - Generate daily reports at 8 AM
    this.addJob('daily-analytics', '0 8 * * *', async () => {
      try {
        console.log('📈 Generating daily analytics...');
        await this.generateDailyAnalytics();
        console.log('✅ Daily analytics generated');
      } catch (error) {
        console.error('❌ Daily analytics cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Weekly analytics - Generate weekly reports on Sundays at 9 AM
    this.addJob('weekly-analytics', '0 9 * * 0', async () => {
      try {
        console.log('📊 Generating weekly analytics...');
        await this.generateWeeklyAnalytics();
        console.log('✅ Weekly analytics generated');
      } catch (error) {
        console.error('❌ Weekly analytics cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Monthly analytics - Generate monthly reports on 1st of month at 7 AM
    this.addJob('monthly-analytics', '0 7 1 * *', async () => {
      try {
        console.log('📊 Generating monthly analytics...');
        await this.generateMonthlyAnalytics();
        console.log('✅ Monthly analytics generated');
      } catch (error) {
        console.error('❌ Monthly analytics cron job failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
  }

  /**
   * Add a new cron job
   * @param {string} name - Job name
   * @param {string} schedule - Cron schedule
   * @param {Function} task - Task function
   * @param {Object} options - Job options
   */
  addJob(name, schedule, task, options = {}) {
    try {
      const job = cron.schedule(schedule, task, {
        scheduled: true,
        timezone: "Asia/Kolkata",
        ...options
      });

      this.jobs.set(name, {
        job,
        schedule,
        task: task.toString(),
        options,
        status: 'RUNNING',
        lastRun: null,
        nextRun: null, // node-cron doesn't have nextDate method
        errorCount: 0
      });

      console.log(`✅ Added cron job: ${name} (${schedule})`);
    } catch (error) {
      console.error(`❌ Failed to add cron job ${name}:`, error.message);
    }
  }

  /**
   * Stop all cron jobs
   */
  stopCronJobs() {
    try {
      console.log('🛑 Stopping all cron jobs...');
      
      this.jobs.forEach((jobInfo, name) => {
        try {
          jobInfo.job.stop();
          jobInfo.status = 'STOPPED';
          console.log(`✅ Stopped cron job: ${name}`);
        } catch (error) {
          console.error(`❌ Failed to stop cron job ${name}:`, error.message);
        }
      });

      this.isInitialized = false;
      console.log('✅ All cron jobs stopped');
    } catch (error) {
      console.error('❌ Failed to stop cron jobs:', error.message);
    }
  }

  /**
   * Get status of all cron jobs
   */
  getCronJobStatus() {
    const status = {};
    
    this.jobs.forEach((jobInfo, name) => {
      status[name] = {
        name,
        schedule: jobInfo.schedule,
        status: jobInfo.status,
        running: jobInfo.job.running,
        nextRun: jobInfo.job.nextDate(),
        lastRun: jobInfo.lastRun,
        errorCount: jobInfo.errorCount
      };
    });
    
    return status;
  }

  /**
   * Restart a specific cron job
   * @param {string} name - Job name
   */
  restartJob(name) {
    const jobInfo = this.jobs.get(name);
    if (!jobInfo) {
      throw new Error(`Job ${name} not found`);
    }

    try {
      jobInfo.job.stop();
      jobInfo.job.start();
      jobInfo.status = 'RUNNING';
      jobInfo.nextRun = jobInfo.job.nextDate();
      console.log(`✅ Restarted cron job: ${name}`);
    } catch (error) {
      console.error(`❌ Failed to restart cron job ${name}:`, error.message);
    }
  }

  /**
   * Clean up old meetings
   */
  async cleanupOldMeetings() {
    try {
      const { prisma } = require('../config/prismaConfig');
      
      // Delete meetings older than 30 days that are ended or canceled
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedMeetings = await prisma.meeting.deleteMany({
        where: {
          status: {
            in: ['ENDED', 'CANCELED']
          },
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      console.log(`🗑️ Cleaned up ${deletedMeetings.count} old meetings`);
    } catch (error) {
      console.error('Failed to cleanup old meetings:', error);
    }
  }

  /**
   * Escalate overdue tasks
   */
  async escalateOverdueTasks() {
    try {
      const { prisma } = require('../config/prismaConfig');
      
      // Find overdue tasks
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: {
            lt: new Date()
          },
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          },
          isActive: true
        },
        include: {
          assignedEmployees: {
            select: {
              id: true,
              empName: true,
              empEmail: true
            }
          }
        }
      });

      // Send escalation emails
      for (const task of overdueTasks) {
        await TaskNotificationService.sendTaskEscalationNotification(task);
      }

      console.log(`⚠️ Escalated ${overdueTasks.length} overdue tasks`);
    } catch (error) {
      console.error('Failed to escalate overdue tasks:', error);
    }
  }

  /**
   * Perform system health check
   */
  async performSystemHealthCheck() {
    try {
      const { prisma } = require('../config/prismaConfig');
      
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Check email service
      // Add email service health check here
      
      // Check cron job status
      const jobStatus = this.getCronJobStatus();
      const stoppedJobs = Object.values(jobStatus).filter(job => !job.running);
      
      if (stoppedJobs.length > 0) {
        console.warn(`⚠️ Found ${stoppedJobs.length} stopped cron jobs`);
      }

      console.log('🏥 System health check passed');
    } catch (error) {
      console.error('❌ System health check failed:', error);
    }
  }

  /**
   * Perform database cleanup
   */
  async performDatabaseCleanup() {
    try {
      const { prisma } = require('../config/prismaConfig');
      
      // Clean up old email delivery logs (older than 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deletedEmailLogs = await prisma.emailDeliveryLog.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo
          }
        }
      });

      // Clean up old notifications (older than 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const deletedNotifications = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: sixtyDaysAgo
          },
          isRead: true
        }
      });

      console.log(`🗑️ Database cleanup: ${deletedEmailLogs.count} email logs, ${deletedNotifications.count} notifications`);
    } catch (error) {
      console.error('Failed to perform database cleanup:', error);
    }
  }

  /**
   * Generate daily analytics
   */
  async generateDailyAnalytics() {
    try {
      const { prisma } = require('../config/prismaConfig');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get daily statistics
      const [meetingStats, taskStats, emailStats] = await Promise.all([
        prisma.meeting.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: yesterday,
              lt: today
            }
          },
          _count: {
            status: true
          }
        }),
        prisma.task.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: yesterday,
              lt: today
            }
          },
          _count: {
            status: true
          }
        }),
        prisma.emailDelivery.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: yesterday,
              lt: today
            }
          },
          _count: {
            status: true
          }
        })
      ]);

      console.log('📈 Daily analytics generated:', {
        meetings: meetingStats,
        tasks: taskStats,
        emails: emailStats
      });
    } catch (error) {
      console.error('Failed to generate daily analytics:', error);
    }
  }

  /**
   * Generate weekly analytics
   */
  async generateWeeklyAnalytics() {
    try {
      const { prisma } = require('../config/prismaConfig');
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get weekly statistics
      const [meetingStats, taskStats, emailStats] = await Promise.all([
        prisma.meeting.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: weekAgo
            }
          },
          _count: {
            status: true
          }
        }),
        prisma.task.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: weekAgo
            }
          },
          _count: {
            status: true
          }
        }),
        prisma.emailDelivery.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: weekAgo
            }
          },
          _count: {
            status: true
          }
        })
      ]);

      console.log('📊 Weekly analytics generated:', {
        meetings: meetingStats,
        tasks: taskStats,
        emails: emailStats
      });
    } catch (error) {
      console.error('Failed to generate weekly analytics:', error);
    }
  }

  /**
   * Generate monthly analytics
   */
  async generateMonthlyAnalytics() {
    try {
      const { prisma } = require('../config/prismaConfig');
      
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Get monthly statistics
      const [meetingStats, taskStats, emailStats] = await Promise.all([
        prisma.meeting.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: monthAgo
            }
          },
          _count: {
            status: true
          }
        }),
        prisma.task.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: monthAgo
            }
          },
          _count: {
            status: true
          }
        }),
        prisma.emailDelivery.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: monthAgo
            }
          },
          _count: {
            status: true
          }
        })
      ]);

      console.log('📊 Monthly analytics generated:', {
        meetings: meetingStats,
        tasks: taskStats,
        emails: emailStats
      });
    } catch (error) {
      console.error('Failed to generate monthly analytics:', error);
    }
  }
}

// Create singleton instance
const cronJobManager = new CronJobManager();

// Export functions for backward compatibility
function initializeCronJobs() {
  return cronJobManager.initializeCronJobs();
}

function stopCronJobs() {
  return cronJobManager.stopCronJobs();
}

function getCronJobStatus() {
  return cronJobManager.getCronJobStatus();
}

module.exports = {
  initializeCronJobs,
  stopCronJobs,
  getCronJobStatus,
  cronJobManager
};












