const cron = require('node-cron');
const ScheduledNotificationService = require('../service/scheduledNotificationService');
const scheduledLogger = require('../utils/scheduledLogger/scheduledLogger');

/**
 * Initialize all cron jobs for scheduled notifications
 */
function initializeCronJobs() {
    try {
        // Daily task reminder notifications - Run at 9:00 AM every day
        cron.schedule('0 9 * * *', async () => {
            scheduledLogger.log('info', 'Starting daily task reminder cron job');
            try {
                await ScheduledNotificationService.sendDailyTaskReminders();
                scheduledLogger.log('info', 'Daily task reminder cron job completed successfully');
            } catch (error) {
                scheduledLogger.log('error', `Daily task reminder cron job failed: ${error.message}`);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Indian Standard Time
        });

        // Weekly task summary - Run every Sunday at 10:00 AM
        cron.schedule('0 10 * * 0', async () => {
            scheduledLogger.log('info', 'Starting weekly task summary cron job');
            try {
                await ScheduledNotificationService.sendWeeklyTaskSummary();
                scheduledLogger.log('info', 'Weekly task summary cron job completed successfully');
            } catch (error) {
                scheduledLogger.log('error', `Weekly task summary cron job failed: ${error.message}`);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Indian Standard Time
        });

        // Task due date reminders - Run every hour from 9 AM to 6 PM on weekdays
        cron.schedule('0 9-18 * * 1-5', async () => {
            scheduledLogger.log('info', 'Starting hourly task due date reminder cron job');
            try {
                await ScheduledNotificationService.sendDailyTaskReminders();
                scheduledLogger.log('info', 'Hourly task due date reminder cron job completed successfully');
            } catch (error) {
                scheduledLogger.log('error', `Hourly task due date reminder cron job failed: ${error.message}`);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Indian Standard Time
        });

        scheduledLogger.log('info', 'All cron jobs initialized successfully');
        
    } catch (error) {
        scheduledLogger.log('error', `Failed to initialize cron jobs: ${error.message}`);
        throw error;
    }
}

/**
 * Stop all cron jobs
 */
function stopCronJobs() {
    try {
        cron.getTasks().forEach(task => {
            task.stop();
        });
        scheduledLogger.log('info', 'All cron jobs stopped successfully');
    } catch (error) {
        scheduledLogger.log('error', `Failed to stop cron jobs: ${error.message}`);
    }
}

/**
 * Get status of all cron jobs
 */
function getCronJobStatus() {
    const tasks = cron.getTasks();
    const status = {};
    
    tasks.forEach((task, name) => {
        status[name] = {
            running: task.running,
            nextDate: task.nextDate(),
            lastDate: task.lastDate()
        };
    });
    
    return status;
}

module.exports = {
    initializeCronJobs,
    stopCronJobs,
    getCronJobStatus
};


