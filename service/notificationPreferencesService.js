const { prisma } = require('../config/prismaConfig');

/**
 * Notification Preferences Service
 * Handles user notification preferences and email settings
 */
class NotificationPreferencesService {
  constructor() {
    this.defaultPreferences = {
      emailNotifications: {
        meetingInvites: true,
        meetingReminders: true,
        taskAssignments: true,
        taskReminders: true,
        taskEscalations: true,
        systemAnnouncements: true,
        weeklySummaries: true
      },
      inAppNotifications: {
        meetingUpdates: true,
        taskUpdates: true,
        leaveRequests: true,
        systemAlerts: true
      },
      emailFrequency: 'IMMEDIATE', // IMMEDIATE, DAILY_DIGEST, WEEKLY_DIGEST
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Asia/Kolkata'
      },
      channels: {
        email: true,
        inApp: true,
        sms: false
      }
    };
  }

  /**
   * Get user notification preferences
   * @param {string} empId - Employee ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(empId) {
    try {
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { empId }
      });

      if (!preferences) {
        // Create default preferences if none exist
        return await this.createDefaultPreferences(empId);
      }

      return {
        ...this.defaultPreferences,
        ...preferences.preferences
      };
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return this.defaultPreferences;
    }
  }

  /**
   * Update user notification preferences
   * @param {string} empId - Employee ID
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateUserPreferences(empId, preferences) {
    try {
      const existingPreferences = await this.getUserPreferences(empId);
      const updatedPreferences = {
        ...existingPreferences,
        ...preferences
      };

      const result = await prisma.notificationPreferences.upsert({
        where: { empId },
        update: {
          preferences: updatedPreferences,
          updatedAt: new Date()
        },
        create: {
          empId,
          preferences: updatedPreferences,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return result.preferences;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  /**
   * Create default preferences for a user
   * @param {string} empId - Employee ID
   * @returns {Promise<Object>} Default preferences
   */
  async createDefaultPreferences(empId) {
    try {
      const result = await prisma.notificationPreferences.create({
        data: {
          empId,
          preferences: this.defaultPreferences,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return result.preferences;
    } catch (error) {
      console.error('Failed to create default preferences:', error);
      return this.defaultPreferences;
    }
  }

  /**
   * Get default preferences
   * @returns {Object} Default preferences
   */
  getDefaultPreferences() {
    return this.defaultPreferences;
  }

  /**
   * Get available notification types
   * @returns {Object} Available notification types
   */
  getNotificationTypes() {
    return {
      emailNotifications: {
        meetingInvites: {
          name: 'Meeting Invites',
          description: 'Receive email notifications when invited to meetings',
          category: 'meetings'
        },
        meetingReminders: {
          name: 'Meeting Reminders',
          description: 'Receive email reminders before meetings start',
          category: 'meetings'
        },
        taskAssignments: {
          name: 'Task Assignments',
          description: 'Receive email notifications when assigned new tasks',
          category: 'tasks'
        },
        taskReminders: {
          name: 'Task Reminders',
          description: 'Receive email reminders for upcoming task deadlines',
          category: 'tasks'
        },
        taskEscalations: {
          name: 'Task Escalations',
          description: 'Receive email notifications for overdue tasks',
          category: 'tasks'
        },
        systemAnnouncements: {
          name: 'System Announcements',
          description: 'Receive important system announcements and updates',
          category: 'system'
        },
        weeklySummaries: {
          name: 'Weekly Summaries',
          description: 'Receive weekly summary reports',
          category: 'reports'
        }
      },
      inAppNotifications: {
        meetingUpdates: {
          name: 'Meeting Updates',
          description: 'Receive in-app notifications for meeting changes',
          category: 'meetings'
        },
        taskUpdates: {
          name: 'Task Updates',
          description: 'Receive in-app notifications for task status changes',
          category: 'tasks'
        },
        leaveRequests: {
          name: 'Leave Requests',
          description: 'Receive in-app notifications for leave request updates',
          category: 'leaves'
        },
        systemAlerts: {
          name: 'System Alerts',
          description: 'Receive in-app notifications for system alerts',
          category: 'system'
        }
      }
    };
  }

  /**
   * Update specific notification type preference
   * @param {string} empId - Employee ID
   * @param {string} category - Notification category (emailNotifications, inAppNotifications)
   * @param {string} type - Notification type
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {Promise<Object>} Updated preferences
   */
  async updateNotificationType(empId, category, type, enabled) {
    try {
      const preferences = await this.getUserPreferences(empId);
      
      if (!preferences[category]) {
        preferences[category] = {};
      }
      
      preferences[category][type] = enabled;

      return await this.updateUserPreferences(empId, preferences);
    } catch (error) {
      console.error('Failed to update notification type:', error);
      throw error;
    }
  }

  /**
   * Get email preferences for a user
   * @param {string} empId - Employee ID
   * @returns {Promise<Object>} Email preferences
   */
  async getEmailPreferences(empId) {
    try {
      const preferences = await this.getUserPreferences(empId);
      return {
        emailNotifications: preferences.emailNotifications,
        emailFrequency: preferences.emailFrequency,
        quietHours: preferences.quietHours,
        channels: preferences.channels
      };
    } catch (error) {
      console.error('Failed to get email preferences:', error);
      return {
        emailNotifications: this.defaultPreferences.emailNotifications,
        emailFrequency: this.defaultPreferences.emailFrequency,
        quietHours: this.defaultPreferences.quietHours,
        channels: this.defaultPreferences.channels
      };
    }
  }

  /**
   * Update email preferences for a user
   * @param {string} empId - Employee ID
   * @param {Object} emailPreferences - Email preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateEmailPreferences(empId, emailPreferences) {
    try {
      const preferences = await this.getUserPreferences(empId);
      
      const updatedPreferences = {
        ...preferences,
        emailNotifications: {
          ...preferences.emailNotifications,
          ...emailPreferences.emailNotifications
        },
        emailFrequency: emailPreferences.emailFrequency || preferences.emailFrequency,
        quietHours: {
          ...preferences.quietHours,
          ...emailPreferences.quietHours
        },
        channels: {
          ...preferences.channels,
          ...emailPreferences.channels
        }
      };

      return await this.updateUserPreferences(empId, updatedPreferences);
    } catch (error) {
      console.error('Failed to update email preferences:', error);
      throw error;
    }
  }

  /**
   * Get email frequency for a user
   * @param {string} empId - Employee ID
   * @returns {Promise<string>} Email frequency
   */
  async getEmailFrequency(empId) {
    try {
      const preferences = await this.getUserPreferences(empId);
      return preferences.emailFrequency;
    } catch (error) {
      console.error('Failed to get email frequency:', error);
      return this.defaultPreferences.emailFrequency;
    }
  }

  /**
   * Check if user should receive a specific notification
   * @param {string} empId - Employee ID
   * @param {string} category - Notification category
   * @param {string} type - Notification type
   * @returns {Promise<boolean>} Whether notification should be sent
   */
  async shouldSendNotification(empId, category, type) {
    try {
      const preferences = await this.getUserPreferences(empId);
      
      // Check if notification type is enabled
      if (!preferences[category]?.[type]) {
        return false;
      }

      // Check if channel is enabled
      if (category === 'emailNotifications' && !preferences.channels.email) {
        return false;
      }

      if (category === 'inAppNotifications' && !preferences.channels.inApp) {
        return false;
      }

      // Check quiet hours for email notifications
      if (category === 'emailNotifications' && preferences.quietHours.enabled) {
        if (this.isInQuietHours(preferences.quietHours)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to check notification preference:', error);
      return true; // Default to sending if there's an error
    }
  }

  /**
   * Check if current time is in quiet hours
   * @param {Object} quietHours - Quiet hours configuration
   * @returns {boolean} Whether current time is in quiet hours
   */
  isInQuietHours(quietHours) {
    if (!quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: quietHours.timezone || 'Asia/Kolkata' 
    });

    const startTime = quietHours.startTime;
    const endTime = quietHours.endTime;

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Get users who should receive a specific notification type
   * @param {string} category - Notification category
   * @param {string} type - Notification type
   * @returns {Promise<Array>} Array of employee IDs
   */
  async getUsersForNotification(category, type) {
    try {
      const preferences = await prisma.notificationPreferences.findMany({
        where: {
          preferences: {
            path: `$.${category}.${type}`,
            equals: true
          }
        },
        select: {
          empId: true
        }
      });

      return preferences.map(p => p.empId);
    } catch (error) {
      console.error('Failed to get users for notification:', error);
      return [];
    }
  }

  /**
   * Bulk update notification preferences for multiple users
   * @param {Array} empIds - Array of employee IDs
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdatePreferences(empIds, preferences) {
    try {
      const results = await Promise.allSettled(
        empIds.map(empId => this.updateUserPreferences(empId, preferences))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        totalUsers: empIds.length,
        successful,
        failed
      };
    } catch (error) {
      console.error('Failed to bulk update preferences:', error);
      throw error;
    }
  }

  /**
   * Reset user preferences to default
   * @param {string} empId - Employee ID
   * @returns {Promise<Object>} Default preferences
   */
  async resetToDefault(empId) {
    try {
      return await this.updateUserPreferences(empId, this.defaultPreferences);
    } catch (error) {
      console.error('Failed to reset preferences to default:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences statistics
   * @returns {Promise<Object>} Statistics
   */
  async getPreferencesStatistics() {
    try {
      const totalUsers = await prisma.employee.count({
        where: { isActive: true }
      });

      const usersWithPreferences = await prisma.notificationPreferences.count();

      const emailEnabled = await prisma.notificationPreferences.count({
        where: {
          preferences: {
            path: '$.channels.email',
            equals: true
          }
        }
      });

      const inAppEnabled = await prisma.notificationPreferences.count({
        where: {
          preferences: {
            path: '$.channels.inApp',
            equals: true
          }
        }
      });

      const quietHoursEnabled = await prisma.notificationPreferences.count({
        where: {
          preferences: {
            path: '$.quietHours.enabled',
            equals: true
          }
        }
      });

      return {
        totalUsers,
        usersWithPreferences,
        preferencesPercentage: totalUsers > 0 ? (usersWithPreferences / totalUsers) * 100 : 0,
        emailEnabled,
        inAppEnabled,
        quietHoursEnabled
      };
    } catch (error) {
      console.error('Failed to get preferences statistics:', error);
      return {
        totalUsers: 0,
        usersWithPreferences: 0,
        preferencesPercentage: 0,
        emailEnabled: 0,
        inAppEnabled: 0,
        quietHoursEnabled: 0
      };
    }
  }

  /**
   * Export user preferences for backup
   * @param {string} empId - Employee ID
   * @returns {Promise<Object>} Export data
   */
  async exportPreferences(empId) {
    try {
      const preferences = await this.getUserPreferences(empId);
      const employee = await prisma.employee.findUnique({
        where: { id: empId },
        select: {
          id: true,
          empName: true,
          empEmail: true
        }
      });

      return {
        employee,
        preferences,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export preferences:', error);
      throw error;
    }
  }

  /**
   * Import user preferences from backup
   * @param {string} empId - Employee ID
   * @param {Object} preferences - Preferences to import
   * @returns {Promise<Object>} Import result
   */
  async importPreferences(empId, preferences) {
    try {
      const result = await this.updateUserPreferences(empId, preferences);
      return {
        success: true,
        empId,
        importedAt: new Date().toISOString(),
        preferences: result
      };
    } catch (error) {
      console.error('Failed to import preferences:', error);
      throw error;
    }
  }
}

module.exports = new NotificationPreferencesService();

