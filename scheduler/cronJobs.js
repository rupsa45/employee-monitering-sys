const cron = require('node-cron');
const ScheduledNotificationService = require('../service/scheduledNotificationService');
// Logger removed for cleaner output

/**
 * Initialize all cron jobs for scheduled notifications
 */
function initializeCronJobs() {
    try {
        // Daily task reminder notifications - Run at 9:00 AM every day
        cron.schedule('0 9 * * *', async () => {
            try {
                await ScheduledNotificationService.sendDailyTaskReminders();
            } catch (error) {
                console.error('Daily task reminder cron job failed:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Indian Standard Time
        });

        // Weekly task summary - Run every Sunday at 10:00 AM
        cron.schedule('0 10 * * 0', async () => {
            try {
                await ScheduledNotificationService.sendWeeklyTaskSummary();
            } catch (error) {
                console.error('Weekly task summary cron job failed:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Indian Standard Time
        });

        // Task due date reminders - Run every hour from 9 AM to 6 PM on weekdays
        cron.schedule('0 9-18 * * 1-5', async () => {
            try {
                await ScheduledNotificationService.sendDailyTaskReminders();
            } catch (error) {
                console.error('Hourly task due date reminder cron job failed:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Indian Standard Time
        });
        
    } catch (error) {
        console.error('Failed to initialize cron jobs:', error.message);
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
    } catch (error) {
        console.error('Failed to stop cron jobs:', error.message);
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












