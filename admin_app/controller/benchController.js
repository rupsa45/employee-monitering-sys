const { prisma } = require('../../config/prismaConfig');
const benchLogger = require('../../utils/benchLogger/benchLogger');

module.exports = {
    // Get employee working list
    empWorkingList: async (req, res) => {
        try {
            const empData = await prisma.employee.findMany({
                where: {
                    empRole: 'employee',
                    isActive: true
                },
                select: {
                    id: true,
                    empName: true,
                    empEmail: true,
                    empRole: true,
                    updatedAt: true
                }
            });

            benchLogger.log('info', "Current employee list retrieved");
            res.status(200).json({
                success: true,
                message: "Current employee list retrieved",
                empData: empData
            });
        } catch (error) {
            benchLogger.log('error', `Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: `Error: ${error.message}`
            });
        }
    },

    // Search employee
    // searchEmployee: async (req, res) => {
    //     try {
    //         const { letter } = req.params;

    //         const empData = await prisma.employee.findMany({
    //             where: {
    //                 OR: [
    //                     { empName: { contains: letter, mode: 'insensitive' } },
    //                     { empEmail: { contains: letter, mode: 'insensitive' } }
    //                 ],
    //                 empRole: 'employee',
    //                 isActive: true
    //             },
    //             select: {
    //                 id: true,
    //                 empName: true,
    //                 empEmail: true,
    //                 empRole: true
    //             }
    //         });

    //         benchLogger.log('info', "Searched employees");
    //         res.status(200).json({
    //             success: true,
    //             message: "Searched employees",
    //             empData: empData
    //         });
    //     } catch (error) {
    //         benchLogger.log('error', `Error: ${error.message}`);
    //         res.status(500).json({
    //             success: false,
    //             message: `Error: ${error.message}`
    //         });
    //     }
    // }
};
