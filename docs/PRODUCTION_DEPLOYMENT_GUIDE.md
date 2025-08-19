# Production Deployment Guide for Render

## Overview
This guide will help you deploy your Employee Monitoring System API to Render and resolve CORS issues.

## 1. Environment Variables for Render

Set these environment variables in your Render dashboard:

### Required Environment Variables

```env
# Environment
NODE_ENV=production
PORT=8000

# Database (Render will provide this automatically if you use Render PostgreSQL)
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"

# JWT Secrets (Generate strong random strings)
SECRET_KEY="your-very-long-secret-key-here-minimum-32-characters"
MEETING_JWT_SECRET="your-meeting-secret-key-here-minimum-32-characters"

# Email Configuration
EMAIL="your-gmail@gmail.com"
PASS="your-16-character-app-password"

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Frontend URL (for CORS)
FRONTEND_URL="https://monitering-system-client.vercel.app"

# Logging
LOG_LEVEL="info"
```

### Optional Environment Variables

```env
# Redis (if using rate limiting)
REDIS_URL="redis://username:password@host:port"
REDIS_PASSWORD="your-redis-password"
REDIS_TLS=false

# SMTP Configuration (if not using Gmail)
SMTP_HOST="smtp.yourcompany.com"
SMTP_PORT=587
SMTP_SECURE=false
```

## 2. Render Deployment Steps

### Step 1: Connect Your Repository
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing your API

### Step 2: Configure the Web Service

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

**Alternative Start Command (if you want to explicitly set production):**
```bash
npm run prod
```

**Environment:**
- Select "Node" as the environment

### Step 3: Set Environment Variables
1. In your Render service dashboard, go to "Environment"
2. Add all the environment variables listed above
3. Make sure to set `NODE_ENV=production`

### Step 4: Database Setup
1. Create a PostgreSQL database in Render
2. Copy the `DATABASE_URL` from the database settings
3. Add it to your web service environment variables
4. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

## 3. Package.json Updates

The `package.json` has been updated for production deployment:

- **Start script**: Changed from `nodemon index.js` to `node index.js` for production
- **Added production script**: `npm run prod` for explicit production mode
- **Nodemon**: Only used in development (`npm run dev`)

## 4. CORS Configuration

The updated `index.js` file now includes:

- Environment-based CORS configuration
- Support for multiple frontend domains
- Proper preflight handling
- Production-ready host configuration

### CORS Origins Supported:
- **Development**: `http://localhost:5173`, `http://localhost:3000`, etc.
- **Production**: `https://monitering-system-client.vercel.app` and any URL set in `FRONTEND_URL`

## 5. Common Issues and Solutions

### CORS Error Still Occurring?
1. **Check your frontend URL**: Make sure it exactly matches what's in the CORS configuration
2. **Verify environment variables**: Ensure `NODE_ENV=production` is set
3. **Check for typos**: Verify the frontend URL has no trailing slashes or typos
4. **Clear browser cache**: Sometimes browsers cache CORS preflight responses

### Database Connection Issues?
1. **Check DATABASE_URL**: Ensure it's correctly formatted
2. **Run migrations**: Execute `npx prisma migrate deploy` in Render shell
3. **Check database status**: Verify the database is running in Render

### Email Not Working?
1. **Gmail App Password**: Make sure you're using a 16-character app password, not your regular password
2. **2FA Enabled**: Ensure 2-factor authentication is enabled on your Gmail account
3. **Less secure apps**: If using regular password, enable "Less secure app access" (not recommended)

## 6. Testing Your Deployment

### Test CORS:
```bash
curl -H "Origin: https://monitering-system-client.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-render-app.onrender.com/api/test
```

### Test API Endpoints:
```bash
curl -X GET https://your-render-app.onrender.com/api/health
```

## 7. Monitoring and Logs

### View Logs in Render:
1. Go to your service dashboard
2. Click on "Logs" tab
3. Monitor for any errors or issues

### Health Check Endpoint:
Add this to your API to monitor service health:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});
```

## 8. Security Best Practices

1. **Use strong secrets**: Generate random 32+ character strings for JWT secrets
2. **Environment variables**: Never commit secrets to your repository
3. **HTTPS only**: Render provides HTTPS by default
4. **Rate limiting**: Consider implementing rate limiting for production
5. **Input validation**: Ensure all inputs are properly validated

## 9. Troubleshooting

### If the app won't start:
1. Check the build logs in Render
2. Verify all environment variables are set
3. Ensure `package.json` has the correct start script
4. Check if all dependencies are in `package.json`

### If CORS still fails:
1. Double-check the frontend URL in your CORS configuration
2. Verify the request is coming from the expected origin
3. Check browser developer tools for detailed CORS error messages
4. Test with a simple curl command to isolate the issue

## 10. Final Checklist

- [ ] All environment variables set in Render
- [ ] Database connected and migrations run
- [ ] `NODE_ENV=production` set
- [ ] Frontend URL correctly configured in CORS
- [ ] Email service configured and tested
- [ ] Cloudinary configured for file uploads
- [ ] Health check endpoint working
- [ ] All API endpoints responding correctly
- [ ] CORS preflight requests working
- [ ] Logs showing no errors

## Support

If you continue to have issues:
1. Check Render logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test endpoints individually to isolate the problem
4. Ensure your frontend is making requests to the correct Render URL
