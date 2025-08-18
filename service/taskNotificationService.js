const { prisma } = require('../config/prismaConfig');
const mailOptions = require('./emailService');
const notificationLogger = require('../utils/notificationLogger/notificationLogger');

/**
 * Task Notification Service
 * Handles all notifications related to task assignments
 */
class TaskNotificationService {
    
    /**
     * Send notifications to employees when a task is assigned
     * @param {Object} task - The created/updated task object
     * @param {Array} assignedEmployees - Array of employee objects
     * @param {string} action - 'created' or 'updated'
     */
    static async sendTaskAssignmentNotifications(task, assignedEmployees, action = 'created') {
        try {
            if (!task || !assignedEmployees || assignedEmployees.length === 0) {
                notificationLogger.log('warn', 'No employees to notify for task assignment');
                return;
            }

            const actionText = action === 'created' ? 'assigned' : 'reassigned';
            const subject = `New Task ${actionText}: ${task.title}`;
            
            // Create in-app notifications
            const notifications = await this.createInAppNotifications(task, assignedEmployees, action);
            
            // Send email notifications
            await this.sendEmailNotifications(task, assignedEmployees, action);
            
            notificationLogger.log('info', `Task assignment notifications sent successfully for task "${task.title}" to ${assignedEmployees.length} employees`);
            
            return {
                success: true,
                inAppNotifications: notifications.length,
                emailNotifications: assignedEmployees.length,
                totalRecipients: assignedEmployees.length
            };
            
        } catch (error) {
            notificationLogger.log('error', `Error sending task assignment notifications: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create in-app notifications for assigned employees
     */
    static async createInAppNotifications(task, assignedEmployees, action) {
        const actionText = action === 'created' ? 'assigned' : 'reassigned';
        const message = `You have been ${actionText} a new task: "${task.title}". Due date: ${new Date(task.dueDate).toLocaleDateString()}`;
        
        const notifications = await Promise.all(
            assignedEmployees.map(employee =>
                prisma.notification.create({
                    data: {
                        title: `Task ${actionText}: ${task.title}`,
                        message: message,
                        empId: employee.id,
                        isActive: true
                    },
                    include: {
                        employee: {
                            select: {
                                empName: true,
                                empEmail: true
                            }
                        }
                    }
                })
            )
        );

        return notifications;
    }

    /**
     * Send email notifications to assigned employees
     */
    static async sendEmailNotifications(task, assignedEmployees, action) {
        const actionText = action === 'created' ? 'assigned' : 'reassigned';
        const dueDate = new Date(task.dueDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const emailPromises = assignedEmployees.map(async (employee) => {
            try {
                const emailContent = this.generateTaskAssignmentEmail(task, employee, actionText, dueDate);
                
                await mailOptions(
                    employee.empEmail,
                    `New Task ${actionText}: ${task.title}`,
                    null, // status
                    null, // message
                    null, // link
                    emailContent // custom HTML
                );

                notificationLogger.log('info', `Email notification sent to ${employee.empEmail} for task "${task.title}"`);
                
            } catch (error) {
                notificationLogger.log('error', `Failed to send email to ${employee.empEmail}: ${error.message}`);
                // Don't throw error to prevent blocking other emails
            }
        });

        await Promise.allSettled(emailPromises);
    }

    /**
     * Generate email content for task assignment
     */
    static generateTaskAssignmentEmail(task, employee, actionText, dueDate) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Task Assignment Notification</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
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
                        font-size: 24px;
                    }
                    .task-details {
                        background-color: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #007bff;
                    }
                    .task-title {
                        font-size: 18px;
                        font-weight: bold;
                        color: #007bff;
                        margin-bottom: 10px;
                    }
                    .task-description {
                        margin-bottom: 15px;
                        color: #555;
                    }
                    .task-meta {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid #dee2e6;
                    }
                    .meta-item {
                        text-align: center;
                    }
                    .meta-label {
                        font-size: 12px;
                        color: #6c757d;
                        text-transform: uppercase;
                        font-weight: bold;
                    }
                    .meta-value {
                        font-size: 14px;
                        color: #333;
                        margin-top: 5px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                        color: #6c757d;
                        font-size: 14px;
                    }
                    .btn {
                        display: inline-block;
                        background-color: #007bff;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                        font-weight: bold;
                    }
                    .btn:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎯 Task Assignment Notification</h1>
                    </div>
                    
                    <p>Hello <strong>${employee.empName}</strong>,</p>
                    
                    <p>You have been <strong>${actionText}</strong> a new task by the admin. Please review the details below:</p>
                    
                    <div class="task-details">
                        <div class="task-title">📋 ${task.title}</div>
                        <div class="task-description">${task.description}</div>
                        
                        <div class="task-meta">
                            <div class="meta-item">
                                <div class="meta-label">Status</div>
                                <div class="meta-value">${task.status}</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Due Date</div>
                                <div class="meta-value">${dueDate}</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Priority</div>
                                <div class="meta-value">Medium</div>
                            </div>
                        </div>
                    </div>
                    
                    <p>Please log into your employee dashboard to view and update the task status.</p>
                    
                    <div style="text-align: center;">
                        <a href="https://go.tellistechnologies.com" class="btn">View Task Dashboard</a>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated notification from the Employee Tracking System.</p>
                        <p>If you have any questions, please contact your administrator.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Send notification when task status is updated by employee
     */
    static async sendTaskStatusUpdateNotification(task, employee, oldStatus, newStatus) {
        try {
            const subject = `Task Status Updated: ${task.title}`;
            const message = `Task "${task.title}" status has been updated from ${oldStatus} to ${newStatus} by ${employee.empName}`;
            
            // Create in-app notification for admin
            const adminEmployees = await prisma.employee.findMany({
                where: {
                    empRole: 'admin',
                    isActive: true
                },
                select: { id: true, empName: true, empEmail: true }
            });

            if (adminEmployees.length > 0) {
                await Promise.all(
                    adminEmployees.map(admin =>
                        prisma.notification.create({
                            data: {
                                title: `Task Status Update: ${task.title}`,
                                message: message,
                                empId: admin.id,
                                isActive: true
                            }
                        })
                    )
                );

                // Send email to admins
                await Promise.all(
                    adminEmployees.map(admin =>
                        mailOptions(
                            admin.empEmail,
                            subject,
                            null,
                            null,
                            null
                        )
                    )
                );
            }

            notificationLogger.log('info', `Task status update notification sent for task "${task.title}"`);
            
        } catch (error) {
            notificationLogger.log('error', `Error sending task status update notification: ${error.message}`);
        }
    }

    /**
     * Send reminder notifications for tasks approaching due date
     */
    static async sendTaskReminderNotifications() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Find tasks due tomorrow or day after tomorrow
            const upcomingTasks = await prisma.task.findMany({
                where: {
                    dueDate: {
                        gte: tomorrow,
                        lt: dayAfterTomorrow
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

            for (const task of upcomingTasks) {
                const dueDate = new Date(task.dueDate).toLocaleDateString();
                const message = `Reminder: Task "${task.title}" is due on ${dueDate}. Current status: ${task.status}`;
                
                // Create in-app notifications
                await Promise.all(
                    task.assignedEmployees.map(employee =>
                        prisma.notification.create({
                            data: {
                                title: `Task Reminder: ${task.title}`,
                                message: message,
                                empId: employee.id,
                                isActive: true
                            }
                        })
                    )
                );
            }

            notificationLogger.log('info', `Task reminder notifications sent for ${upcomingTasks.length} tasks`);
            
        } catch (error) {
            notificationLogger.log('error', `Error sending task reminder notifications: ${error.message}`);
        }
    }
}

module.exports = TaskNotificationService;
