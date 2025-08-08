const Joi = require('joi');

// Employee registration validation schema
const employeeRegistrationSchema = Joi.object({
    empName: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 50 characters',
            'any.required': 'Name is required'
        }),

    empEmail: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    empPhone: Joi.number()
        .integer()
        .min(1000000000)
        .max(9999999999)
        .required()
        .messages({
            'number.base': 'Phone number must be a number',
            'number.integer': 'Phone number must be an integer',
            'number.min': 'Phone number must be at least 10 digits',
            'number.max': 'Phone number cannot exceed 10 digits',
            'any.required': 'Phone number is required'
        }),

    empPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.required': 'Password is required'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('empPassword'))
        .required()
        .messages({
            'any.only': 'Password and confirm password must match',
            'any.required': 'Confirm password is required'
        }),

    empTechnology: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'Technology must be at least 2 characters long',
            'string.max': 'Technology cannot exceed 50 characters',
            'any.required': 'Technology is required'
        }),

    empGender: Joi.string()
        .valid('MALE', 'FEMALE', 'OTHER')
        .required()
        .messages({
            'any.only': 'Gender must be MALE, FEMALE, or OTHER',
            'any.required': 'Gender is required'
        })
});

// Admin registration validation schema (same as employee but for admin role)
const adminRegistrationSchema = Joi.object({
    empName: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 50 characters',
            'any.required': 'Name is required'
        }),

    empEmail: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    empPhone: Joi.number()
        .integer()
        .min(1000000000)
        .max(9999999999)
        .required()
        .messages({
            'number.base': 'Phone number must be a number',
            'number.integer': 'Phone number must be an integer',
            'number.min': 'Phone number must be at least 10 digits',
            'number.max': 'Phone number cannot exceed 10 digits',
            'any.required': 'Phone number is required'
        }),

    empPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.required': 'Password is required'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('empPassword'))
        .required()
        .messages({
            'any.only': 'Password and confirm password must match',
            'any.required': 'Confirm password is required'
        }),

    empTechnology: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'Technology must be at least 2 characters long',
            'string.max': 'Technology cannot exceed 50 characters',
            'any.required': 'Technology is required'
        }),

    empGender: Joi.string()
        .valid('MALE', 'FEMALE', 'OTHER')
        .required()
        .messages({
            'any.only': 'Gender must be MALE, FEMALE, or OTHER',
            'any.required': 'Gender is required'
        })
});

// Employee login validation schema
const employeeLoginSchema = Joi.object({
    empEmail: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    empPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

// Admin login validation schema
const adminLoginSchema = Joi.object({
    empEmail: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    empPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

// Employee profile update validation schema
const employeeProfileUpdateSchema = Joi.object({
    empTechnology: Joi.string()
        .min(2)
        .max(50)
        .optional()
        .messages({
            'string.min': 'Technology must be at least 2 characters long',
            'string.max': 'Technology cannot exceed 50 characters'
        }),

    empPhone: Joi.number()
        .integer()
        .min(1000000000)
        .max(9999999999)
        .optional()
        .messages({
            'number.base': 'Phone number must be a number',
            'number.integer': 'Phone number must be an integer',
            'number.min': 'Phone number must be at least 10 digits',
            'number.max': 'Phone number cannot exceed 10 digits'
        })
});

// Password reset validation schema
const passwordResetSchema = Joi.object({
    empPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.required': 'Password is required'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('empPassword'))
        .required()
        .messages({
            'any.only': 'Password and confirm password must match',
            'any.required': 'Confirm password is required'
        })
});

// Forgot password validation schema
const forgotPasswordSchema = Joi.object({
    empEmail: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        })
});

// Task creation validation schema
const taskCreationSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'Task title must be at least 3 characters long',
            'string.max': 'Task title cannot exceed 100 characters',
            'any.required': 'Task title is required'
        }),

    description: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'string.min': 'Task description must be at least 10 characters long',
            'string.max': 'Task description cannot exceed 1000 characters',
            'any.required': 'Task description is required'
        }),

    assignedTo: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one employee must be assigned to the task',
            'any.required': 'Assigned employees are required'
        }),

    dueDate: Joi.date()
        .greater('now')
        .required()
        .messages({
            'date.greater': 'Due date must be in the future',
            'any.required': 'Due date is required'
        })
});

// Task update validation schema
const taskUpdateSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Task title must be at least 3 characters long',
            'string.max': 'Task title cannot exceed 100 characters'
        }),

    description: Joi.string()
        .min(10)
        .max(1000)
        .optional()
        .messages({
            'string.min': 'Task description must be at least 10 characters long',
            'string.max': 'Task description cannot exceed 1000 characters'
        }),

    assignedTo: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .optional()
        .messages({
            'array.min': 'At least one employee must be assigned to the task'
        }),

    status: Joi.string()
        .valid('PENDING', 'IN_PROGRESS', 'COMPLETED')
        .optional()
        .messages({
            'any.only': 'Status must be PENDING, IN_PROGRESS, or COMPLETED'
        }),

    dueDate: Joi.date()
        .greater('now')
        .optional()
        .messages({
            'date.greater': 'Due date must be in the future'
        })
});

// Task status update validation schema
const taskStatusUpdateSchema = Joi.object({
    status: Joi.string()
        .valid('PENDING', 'IN_PROGRESS', 'COMPLETED')
        .required()
        .messages({
            'any.only': 'Status must be PENDING, IN_PROGRESS, or COMPLETED',
            'any.required': 'Status is required'
        })
});

module.exports = {
    employeeRegistrationSchema,
    adminRegistrationSchema,
    employeeLoginSchema,
    adminLoginSchema,
    employeeProfileUpdateSchema,
    passwordResetSchema,
    forgotPasswordSchema,
    taskCreationSchema,
    taskUpdateSchema,
    taskStatusUpdateSchema
};
