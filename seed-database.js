const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Check if test data already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { empEmail: 'john.doe@company.com' }
    });

    const existingAdmin = await prisma.employee.findUnique({
      where: { empEmail: 'admin@company.com' }
    });

    if (existingEmployee && existingAdmin) {
      console.log('✅ Test data already exists in database');
      console.log('📋 Available test credentials:');
      console.log('Employee: john.doe@company.com / TestPassword123!');
      console.log('Admin: admin@company.com / AdminPassword123!');
      return;
    }

    // Hash passwords
    const saltRounds = 10;
    const employeePassword = await bcrypt.hash('TestPassword123!', saltRounds);
    const adminPassword = await bcrypt.hash('AdminPassword123!', saltRounds);

    // Create test employee
    if (!existingEmployee) {
      const employee = await prisma.employee.create({
        data: {
          empName: 'John Doe',
          empEmail: 'john.doe@company.com',
          empPhone: '+1234567890',
          empPassword: employeePassword,
          confirmPassword: employeePassword,
          empRole: 'employee',
          empTechnology: 'JavaScript, Node.js, React',
          empGender: 'MALE',
          empProfile: '../upload/maleAvatar.png',
          isActive: true
        }
      });
      console.log('✅ Created test employee:', employee.empEmail);
    }

    // Create test admin
    if (!existingAdmin) {
      const admin = await prisma.employee.create({
        data: {
          empName: 'Admin User',
          empEmail: 'admin@company.com',
          empPhone: '+1234567890',
          empPassword: adminPassword,
          confirmPassword: adminPassword,
          empRole: 'admin',
          empTechnology: 'System Administration',
          empGender: 'MALE',
          empProfile: '../upload/maleAvatar.png',
          isActive: true
        }
      });
      console.log('✅ Created test admin:', admin.empEmail);
    }

    // Create additional test employees
    const additionalEmployees = [
      {
        empName: 'Alice Developer',
        empEmail: 'alice.dev@example.com',
        empPhone: '+1234567891',
        empPassword: await bcrypt.hash('TestPassword123!', saltRounds),
        empTechnology: 'React.js',
        empGender: 'FEMALE'
      },
      {
        empName: 'Bob Employee',
        empEmail: 'bob.emp@example.com',
        empPhone: '+1234567892',
        empPassword: await bcrypt.hash('TestPassword123!', saltRounds),
        empTechnology: 'Node.js',
        empGender: 'MALE'
      },
      {
        empName: 'Dana Analyst',
        empEmail: 'dana.ana@example.com',
        empPhone: '+1234567893',
        empPassword: await bcrypt.hash('TestPassword123!', saltRounds),
        empTechnology: 'Python',
        empGender: 'FEMALE'
      }
    ];

    for (const empData of additionalEmployees) {
      const existing = await prisma.employee.findUnique({
        where: { empEmail: empData.empEmail }
      });

      if (!existing) {
        const employee = await prisma.employee.create({
          data: {
            ...empData,
            confirmPassword: empData.empPassword,
            empRole: 'employee',
            empProfile: empData.empGender === 'FEMALE' ? '../upload/femaleAvatar.png' : '../upload/maleAvatar.png',
            isActive: true
          }
        });
        console.log('✅ Created additional employee:', employee.empEmail);
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Available test credentials:');
    console.log('Employee: john.doe@company.com / TestPassword123!');
    console.log('Admin: admin@company.com / AdminPassword123!');
    console.log('Additional employees: alice.dev@example.com, bob.emp@example.com, dana.ana@example.com');
    console.log('All employees use password: TestPassword123!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDatabase();
