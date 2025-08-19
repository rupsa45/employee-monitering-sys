## Admin Registration Response

```json
{
  "empName": "John Leader",
  "empEmail": "john.leader@example.com",
  "empPhone": "9123456789",
  "empPassword": "Leader@2025",
  "confirmPassword": "Leader@2025",
  "empTechnology": "Project Management",
  "empGender": "MALE"
}
```

## Admin login

```json
{
  "empEmail": "john.leader@example.com",
  "empPassword": "Leader@2025"
}
```

## Admin: protected (Admin role) create employee

```json
{
  "empName": "Bob Employee",
  "empEmail": "bob.emp@example.com",
  "empPhone": "9123456789",
  "empPassword": "Emp@12345",
  "confirmPassword": "Emp@12345",
  "empTechnology": "Node.js",
  "empGender": "MALE"
}

{
  "empName": "Alice Developer",
  "empEmail": "alice.dev@example.com",
  "empPhone": "9876543210",
  "empPassword": "Dev@2024",
  "confirmPassword": "Dev@2024",
  "empTechnology": "React.js",
  "empGender": "FEMALE"
}

{
  "empName": "Dana Analyst",
  "empEmail": "dana.ana@example.com",
  "empPhone": "9111223344",
  "empPassword": "Ana@4567",
  "confirmPassword": "Ana@4567",
  "empTechnology": "Python",
  "empGender": "FEMALE"
}

{
  "empName": "Ravi DevOps",
  "empEmail": "ravi.dev@example.com",
  "empPhone": "9876543210",
  "empPassword": "Dev@2024",
  "confirmPassword": "Dev@2024",
  "empTechnology": "DevOps",
  "empGender": "MALE"
}

{
  "empName": "Karan Backend",
  "empEmail": "karan.back@example.com",
  "empPhone": "9988776655",
  "empPassword": "Back@2024",
  "confirmPassword": "Back@2024",
  "empTechnology": "Backend",
  "empGender": "MALE"
}
{
  "empName": "Anita Frontend",
  "empEmail": "anita.front@example.com",
  "empPhone": "9123456789",
  "empPassword": "Front@2024",
  "confirmPassword": "Front@2024",
  "empTechnology": "Frontend",
  "empGender": "FEMALE"
}

{
  "empName": "Karan Backend",
  "empEmail": "karan.back@example.com",
  "empPhone": "9988776655",
  "empPassword": "Back@2024",
  "confirmPassword": "Back@2024",
  "empTechnology": "Backend",
  "empGender": "MALE"
}

```
## /employee/login

```json
{
  "empEmail": "alice.dev@example.com",
  "empPassword": "Dev@2024"
}
```
## task

```json
{
  "title": "Prepare Q4 Roadmap",
  "description": "Draft the Q4 product roadmap and share for review.",
  "assignedTo": ["cme41guqw0004s23agwqgetnw", "cme41fu5j0002s23awepd95qy"],
  "dueDate": "2025-09-15T17:00:00.000Z"
}

{
  "title": "Design User Authentication Module",
  "description": "Create and validate the login and token-based authentication system using Python and JWT.",
  "assignedTo": ["cmed6ruc40001vgzwvv481a72", "cmed6syp20002vgzwr7u2r8i5"],
  "dueDate": "2025-09-25T15:30:00.000Z"
}

  {
    "title": "Build API Integration",
    "description": "Develop and test the employee registration API using Python and Postman.",
    "assignedTo": ["cmed6topn0004vgzwqnnk0gl2", "cmed6t6cx0003vgzwv0l8jru3"],
    "dueDate": "2025-09-20T17:00:00.000Z"
  }

```




## /emp-tasks/my-task-stats      NEW: Get task statistics (EMPLOYEE ONLY)

```json

{
    "success": true,
    "message": "Task statistics retrieved successfully",
    "employee": {
        "id": "cme41fu5j0002s23awepd95qy",
        "empName": "Alice Developer",
        "empEmail": "alice.dev@example.com"
    },
    "statistics": {
        "total": 3,
        "pending": 2,
        "inProgress": 1,
        "completed": 0,
        "overdue": 0,
        "dueToday": 0
    }
}

```