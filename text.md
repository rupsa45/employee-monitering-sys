## 🔧 Step 1: Initialize Prisma


npm install prisma --save-dev
npm install @prisma/client
npx prisma init
This creates a prisma/schema.prisma file and .env file.


🔄 Step 2: Migrate the Database

npx prisma migrate dev --name init
This will:
Create the database tables
Generate the Prisma Client for querying

## You can also preview data with this command:


## npx prisma studio
This opens a GUI in your browser, where you can:

View tables

Add/edit/delete rows

It's great for development!

npx prisma migrate dev --name add-user-status

npx prisma format
npx prisma generate
npx prisma migrate dev --name add-user-status


 ## Sample Request Body (JSON) after creating new user by admin

{
  "name": "Riya Sharma",
  "email": "riya@example.com",
  "password": "123456",
  "teamName": "UI Developer",
  "role": "EMPLOYEE",
  "status": "ACTIVE"
}