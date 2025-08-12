const Joi = require('joi');

const empNotificationSchema = {
    registerNotification: Joi.object({
        title: Joi.string()
            .max(100)
            .min(3)
            .required()
            .messages({
                'string.min': 'Title should be at least {#limit} characters',
                'string.max': 'Title should not exceed {#limit} characters',
                'any.required': 'Title is required'
            }),
        message: Joi.string()
            .max(500)
            .min(5)
            .required()
            .messages({
                'string.min': 'Message should be at least {#limit} characters',
                'string.max': 'Message should not exceed {#limit} characters',
                'any.required': 'Message is required'
            }),
        empIds: Joi.array()
            .items(Joi.string().required())
            .min(1)
            .optional()
            .messages({
                'array.min': 'At least one employee ID is required if not sending to all employees'
            }),
        sendToAll: Joi.boolean()
            .default(false)
            .messages({
                'boolean.base': 'sendToAll must be a boolean value'
            })
    }).custom((value, helpers) => {
        // Either empIds must be provided OR sendToAll must be true
        if (!value.sendToAll && (!value.empIds || value.empIds.length === 0)) {
            return helpers.error('any.invalid', { 
                message: 'Either empIds array or sendToAll=true must be provided' 
            });
        }
        return value;
    })
};

module.exports = empNotificationSchema;

