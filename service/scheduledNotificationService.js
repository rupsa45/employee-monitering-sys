const TaskNotificationService = require('./taskNotificationService');
const scheduledLogger = require('../utils/scheduledLogger/scheduledLogger');

/**
 * Scheduled Notification Service
 * Handles automated notifications that run on a schedule
 */
class ScheduledNotificationService {
    
    /**
     * Send daily task reminder notifications
     * This should be called by a cron job or scheduler
     */
    static async sendDailyTaskReminders() {
        try {
            scheduledLogger.log('info', 'Starting daily task reminder notifications');
            
            await TaskNotificationService.sendTaskReminderNotifications();
            
            scheduledLogger.log('info', 'Daily task reminder notifications completed successfully');
            
        } catch (error) {
            scheduledLogger.log('error', `Error in daily task reminders: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send weekly task summary to admins
     */
    static async sendWeeklyTaskSummary() {
        try {
            scheduledLogger.log('info', 'Starting weekly task summary notifications');
            
            const { prisma } = require('../config/prismaConfig');
            const mailOptions = require('./emailService');
            
            // Get date range for this week
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0);
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            
            // Get all tasks created this week
            const weeklyTasks = await prisma.task.findMany({
                where: {
                    createdAt: {
                        gte: startOfWeek,
                        lt: endOfWeek
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
            
            // Get task statistics
            const totalTasks = weeklyTasks.length;
            const completedTasks = weeklyTasks.filter(task => task.status === 'COMPLETED').length;
            const pendingTasks = weeklyTasks.filter(task => task.status === 'PENDING').length;
            const inProgressTasks = weeklyTasks.filter(task => task.status === 'IN_PROGRESS').length;
            
            // Get all admins
            const admins = await prisma.employee.findMany({
                where: {
                    empRole: 'admin',
                    isActive: true
                },
                select: {
                    id: true,
                    empName: true,
                    empEmail: true
                }
            });
            
            // Send summary to each admin
            for (const admin of admins) {
                const summaryHtml = this.generateWeeklyTaskSummaryEmail(
                    admin,
                    {
                        totalTasks,
                        completedTasks,
                        pendingTasks,
                        inProgressTasks,
                        weeklyTasks
                    },
                    startOfWeek,
                    endOfWeek
                );
                
                await mailOptions(
                    admin.empEmail,
                    'Weekly Task Summary Report',
                    null,
                    null,
                    null,
                    summaryHtml
                );
            }
            
            scheduledLogger.log('info', `Weekly task summary sent to ${admins.length} admins`);
            
        } catch (error) {
            scheduledLogger.log('error', `Error in weekly task summary: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate weekly task summary email
     */
    static generateWeeklyTaskSummaryEmail(admin, stats, startDate, endDate) {
        const startDateStr = startDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const endDateStr = endDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
        
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Weekly Task Summary</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f4f4f4;
                    }
                    .container {
                        background-color: #ffffff;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #007bff;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        color: #007bff;
                        margin: 0;
                        font-size: 28px;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin: 30px 0;
                    }
                    .stat-card {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                    }
                    .stat-number {
                        font-size: 36px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .stat-label {
                        font-size: 14px;
                        opacity: 0.9;
                    }
                    .task-list {
                        margin-top: 30px;
                    }
                    .task-item {
                        background-color: #f8f9fa;
                        padding: 15px;
                        margin-bottom: 10px;
                        border-radius: 8px;
                        border-left: 4px solid #007bff;
                    }
                    .task-title {
                        font-weight: bold;
                        color: #007bff;
                        margin-bottom: 5px;
                    }
                    .task-meta {
                        font-size: 14px;
                        color: #666;
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .status-completed { background-color: #28a745; color: white; }
                    .status-pending { background-color: #ffc107; color: #212529; }
                    .status-progress { background-color: #17a2b8; color: white; }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                        color: #6c757d;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📊 Weekly Task Summary Report</h1>
                        <p>${startDateStr} - ${endDateStr}</p>
                    </div>
                    
                    <p>Hello <strong>${admin.empName}</strong>,</p>
                    
                    <p>Here's your weekly task summary report for the Employee Tracking System:</p>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">${stats.totalTasks}</div>
                            <div class="stat-label">Total Tasks</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${stats.completedTasks}</div>
                            <div class="stat-label">Completed</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${stats.inProgressTasks}</div>
                            <div class="stat-label">In Progress</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${stats.pendingTasks}</div>
                            <div class="stat-label">Pending</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${completionRate}%</div>
                            <div class="stat-label">Completion Rate</div>
                        </div>
                    </div>
                    
                    <div class="task-list">
                        <h3>📋 Tasks Created This Week</h3>
                        ${stats.weeklyTasks.map(task => `
                            <div class="task-item">
                                <div class="task-title">${task.title}</div>
                                <div class="task-meta">
                                    <span class="status-badge status-${task.status.toLowerCase()}">${task.status}</span>
                                    • Due: ${new Date(task.dueDate).toLocaleDateString()}
                                    • Assigned to: ${task.assignedEmployees.map(emp => emp.empName).join(', ')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated weekly report from the Employee Tracking System.</p>
                        <p>Generated on ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = ScheduledNotificationService;











