const empNotification = require('./notificationVal');

module.exports = {
    createNotification: async (req, res, next) => {
        try {
            const value = await empNotification.registerNotification.validate(req.body, { abortEarly: false })
            if (value.error) {
                return res.status(400).json({
                    success: false,
                    message: value.error.details[0].message
                })
            } else {
                next();
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            })
        }
    }
}
