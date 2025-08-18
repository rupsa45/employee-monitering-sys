# 🖥️ Screen Sharing + Browser Recording Documentation

## Overview

This document describes the screen sharing and browser recording functionality for video meetings. The system supports client-side recording using MediaRecorder API and server-side storage via Cloudinary.

## 🏗️ Architecture

### Client-Side Recording
- **MediaRecorder API**: Browser-native recording capabilities
- **Screen Capture**: `getDisplayMedia()` for screen sharing
- **WebM Format**: Optimized for web streaming and storage
- **Chunked Upload**: Efficient handling of large video files

### Server-Side Storage
- **Cloudinary**: Cloud video storage and CDN
- **Database**: Metadata storage with Prisma ORM
- **File Validation**: Type and size restrictions
- **Permission Control**: Participant-based access

## 📋 API Endpoints

### Upload Recording
```
POST /emp/meetings/:id/recordings
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

Fields:
- file: Video file (required)
- startedAt: ISO timestamp (required)
- endedAt: ISO timestamp (required)
```

**Response:**
```json
{
  "success": true,
  "message": "Recording uploaded successfully",
  "data": {
    "id": "recording123",
    "startedAt": "2024-01-01T10:00:00Z",
    "endedAt": "2024-01-01T11:00:00Z",
    "durationSec": 3600,
    "cloudinaryUrl": "https://res.cloudinary.com/...",
    "publicId": "meetings/meeting123/recording_123",
    "bytes": 1024000,
    "format": "video/webm",
    "createdBy": {
      "id": "emp123",
      "empName": "John Doe",
      "empEmail": "john@example.com"
    }
  }
}
```

### Get Recordings
```
GET /emp/meetings/:id/recordings?page=1&limit=10
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordings": [
      {
        "id": "recording123",
        "startedAt": "2024-01-01T10:00:00Z",
        "endedAt": "2024-01-01T11:00:00Z",
        "durationSec": 3600,
        "cloudinaryUrl": "https://res.cloudinary.com/...",
        "publicId": "meetings/meeting123/recording_123",
        "bytes": 1024000,
        "format": "video/webm",
        "createdBy": {
          "id": "emp123",
          "empName": "John Doe",
          "empEmail": "john@example.com"
        },
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalCount": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### Delete Recording
```
DELETE /emp/meetings/:id/recordings/:recordingId
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Recording deleted successfully"
}
```

### Get Recording Statistics
```
GET /emp/meetings/:id/recordings/stats
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRecordings": 5,
    "totalBytes": 5120000,
    "creators": [
      {
        "creator": {
          "id": "emp123",
          "empName": "John Doe",
          "empEmail": "john@example.com"
        },
        "recordingCount": 3,
        "totalBytes": 3072000
      }
    ]
  }
}
```

## 💻 Client Implementation

### Basic Screen Recording

```javascript
class MeetingRecorder {
  constructor(meetingId, jwtToken) {
    this.meetingId = meetingId;
    this.jwtToken = jwtToken;
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.startTime = null;
  }

  async startRecording() {
    try {
      // Request screen capture
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Create MediaRecorder
      this.recorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      this.startTime = new Date();
      this.chunks = [];

      // Handle data available
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      // Handle recording stop
      this.recorder.onstop = async () => {
        await this.uploadRecording();
      };

      // Start recording
      this.recorder.start(1000); // 1 second chunks
      
      console.log('Recording started');
      return true;

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  stopRecording() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  async uploadRecording() {
    try {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      const formData = new FormData();
      
      formData.append('file', blob, `meeting-${this.meetingId}.webm`);
      formData.append('startedAt', this.startTime.toISOString());
      formData.append('endedAt', new Date().toISOString());

      const response = await fetch(`/emp/meetings/${this.meetingId}/recordings`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${this.jwtToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Recording uploaded:', result.data);
      return result.data;

    } catch (error) {
      console.error('Failed to upload recording:', error);
      throw error;
    }
  }
}
```

### Advanced Multi-Source Recording

```javascript
class CompositeRecorder {
  constructor(meetingId, jwtToken) {
    this.meetingId = meetingId;
    this.jwtToken = jwtToken;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.recorder = null;
    this.streams = [];
    this.startTime = null;
  }

  async addVideoStream(stream, x, y, width, height) {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    
    this.streams.push({
      video,
      x,
      y,
      width,
      height
    });
  }

  async addScreenShare(stream) {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    
    // Position screen share in top-left
    this.streams.push({
      video,
      x: 0,
      y: 0,
      width: 640,
      height: 480
    });
  }

  async startCompositeRecording() {
    // Set canvas size
    this.canvas.width = 1280;
    this.canvas.height = 720;

    // Create composite stream
    const compositeStream = this.canvas.captureStream(30); // 30 FPS

    // Create MediaRecorder
    this.recorder = new MediaRecorder(compositeStream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 4000000 // 4 Mbps for composite
    });

    this.startTime = new Date();
    this.chunks = [];

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.recorder.onstop = async () => {
      await this.uploadRecording();
    };

    // Start recording
    this.recorder.start(1000);

    // Start rendering loop
    this.renderLoop();
  }

  renderLoop() {
    if (this.recorder && this.recorder.state === 'recording') {
      // Clear canvas
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw all video streams
      this.streams.forEach(stream => {
        this.ctx.drawImage(
          stream.video,
          stream.x,
          stream.y,
          stream.width,
          stream.height
        );
      });

      // Continue loop
      requestAnimationFrame(() => this.renderLoop());
    }
  }

  stopRecording() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
      this.streams.forEach(stream => {
        stream.video.srcObject.getTracks().forEach(track => track.stop());
      });
    }
  }

  async uploadRecording() {
    // Same as basic implementation
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    const formData = new FormData();
    
    formData.append('file', blob, `composite-meeting-${this.meetingId}.webm`);
    formData.append('startedAt', this.startTime.toISOString());
    formData.append('endedAt', new Date().toISOString());

    const response = await fetch(`/emp/meetings/${this.meetingId}/recordings`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`
      }
    });

    return await response.json();
  }
}
```

### Usage Examples

#### Basic Recording
```javascript
const recorder = new MeetingRecorder('meeting123', 'jwt_token');

// Start recording
await recorder.startRecording();

// Stop recording (will auto-upload)
recorder.stopRecording();
```

#### Composite Recording
```javascript
const compositeRecorder = new CompositeRecorder('meeting123', 'jwt_token');

// Add screen share
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true
});
await compositeRecorder.addScreenShare(screenStream);

// Add webcam
const webcamStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});
await compositeRecorder.addVideoStream(webcamStream, 640, 0, 320, 240);

// Start composite recording
await compositeRecorder.startCompositeRecording();

// Stop recording
compositeRecorder.stopRecording();
```

## 🔧 Configuration

### File Upload Limits
- **Max File Size**: 500MB
- **Allowed Formats**: webm, mp4, avi, mov, wmv, flv, mkv, ogg
- **Chunk Size**: 1 second intervals
- **Video Quality**: 2.5 Mbps (basic), 4 Mbps (composite)

### Cloudinary Settings
- **Resource Type**: video
- **Folder Structure**: `meetings/{meetingId}/`
- **Public ID Format**: `recording_{timestamp}`
- **Overwrite**: false (prevent conflicts)

### Database Schema
```sql
-- MeetingRecording table
CREATE TABLE "MeetingRecording" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL,
  "endedAt" DATETIME,
  "cloudinaryUrl" TEXT,
  "publicId" TEXT,
  "bytes" INTEGER,
  "format" TEXT,
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY ("id"),
  FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id"),
  FOREIGN KEY ("createdById") REFERENCES "Employee"("id")
);
```

## 🛡️ Security & Permissions

### Access Control
- **Participants Only**: Only meeting participants can upload recordings
- **Creator/Host Delete**: Only recording creator or meeting host can delete
- **Meeting Validation**: Recordings must belong to valid meetings
- **Token Authentication**: JWT required for all operations

### File Validation
- **Type Checking**: Only video files accepted
- **Size Limits**: 500MB maximum file size
- **Content Validation**: Server-side format verification
- **Malware Scanning**: Cloudinary provides additional security

### Privacy Considerations
- **Secure URLs**: Cloudinary provides signed URLs
- **Access Logging**: All operations logged for audit
- **Data Retention**: Configurable retention policies
- **GDPR Compliance**: Right to deletion implemented

## 📊 Monitoring & Analytics

### Recording Statistics
- **Total Recordings**: Count per meeting
- **Storage Usage**: Bytes consumed per meeting
- **Creator Analytics**: Recordings per participant
- **Duration Tracking**: Total recording time

### Performance Metrics
- **Upload Success Rate**: Percentage of successful uploads
- **Average File Size**: Typical recording sizes
- **Processing Time**: Upload and processing duration
- **Error Rates**: Failed uploads and reasons

## 🚀 Best Practices

### Client-Side
1. **Request Permissions Early**: Ask for screen capture before meeting starts
2. **Handle Errors Gracefully**: Provide fallbacks for unsupported browsers
3. **Optimize Quality**: Balance quality vs file size
4. **Chunked Recording**: Use 1-second chunks for better handling
5. **Progress Indicators**: Show upload progress to users

### Server-Side
1. **Validate Everything**: Check file type, size, and content
2. **Handle Large Files**: Implement streaming uploads
3. **Error Recovery**: Graceful handling of Cloudinary failures
4. **Cleanup**: Remove temporary files after upload
5. **Logging**: Comprehensive logging for debugging

### Performance
1. **CDN Usage**: Leverage Cloudinary's global CDN
2. **Compression**: Use efficient video codecs (VP9)
3. **Caching**: Cache recording metadata
4. **Pagination**: Implement for large recording lists
5. **Background Processing**: Handle uploads asynchronously

## 🔍 Troubleshooting

### Common Issues

#### "Permission Denied"
- Check if user is meeting participant
- Verify JWT token is valid
- Ensure meeting exists and is not canceled

#### "File Too Large"
- Reduce video quality settings
- Use shorter recording sessions
- Implement client-side compression

#### "Invalid File Type"
- Ensure browser supports MediaRecorder
- Check MIME type configuration
- Verify file extension matches content

#### "Upload Failed"
- Check network connectivity
- Verify Cloudinary credentials
- Monitor server logs for errors

### Debug Mode
Enable detailed logging by setting `NODE_ENV=development`:
```javascript
// Server logs will include detailed error information
logger.error('Upload failed', {
  empId: req.user?.id,
  meetingId: req.params.id,
  error: error.message,
  stack: error.stack
});
```

## 📈 Future Enhancements

### Planned Features
1. **Live Streaming**: Real-time video streaming
2. **Video Editing**: Basic trimming and cropping
3. **Transcription**: Automatic speech-to-text
4. **Analytics Dashboard**: Advanced reporting
5. **Mobile Support**: Native mobile recording

### Technical Improvements
1. **WebRTC Recording**: Direct stream recording
2. **Multi-Format Support**: Additional video formats
3. **Compression Algorithms**: Better file size optimization
4. **Distributed Storage**: Multi-region storage
5. **AI Processing**: Content analysis and tagging


