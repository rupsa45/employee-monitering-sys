## Admin Registration Response

```json
{
    "success": true,
    "message": "Admin Registered Successfully",
    "admin": {
        "id": "cme3wmqto0000es5ta3ib6e69",
        "empName": "Alice Admin",
        "empEmail": "alice.admin@example.com",
        "empTechnology": "Management",
        "empGender": "FEMALE",
        "empRole": "admin"
    }
}
```

## Admin login

```json
{
    "empEmail": "alice.admin@example.com",
    "empPassword": "Admin@123"
} 
```
##  Admin: protected (Admin role) create employee

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

```

