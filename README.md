# MERN College Notes Sharing - Backend

Backend API for the MERN stack college notes sharing application.

## Features

- ✅ MongoDB database with Mongoose ODM
- ✅ Express.js REST API
- ✅ Session-based authentication (same as original)
- ✅ bcrypt password hashing
- ✅ File upload (PDF notes + audio)
- ✅ Role-based access control
- ✅ CORS enabled for React frontend

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env` file and update MongoDB connection string if needed
   - Default MongoDB URI: `mongodb://localhost:27017/college-notes`

3. **Start MongoDB:**
   - **Local MongoDB**: Make sure MongoDB service is running
   - **MongoDB Atlas**: Update `MONGODB_URI` in `.env` with your connection string

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Departments & Subjects
- `GET /api/departments` - Get all departments
- `GET /api/subjects` - Get subjects (with filters)
- `POST /api/subjects` - Add new subject (teachers only)

### Notes
- `POST /api/notes/upload` - Upload note with PDF and optional audio
- `GET /api/notes` - Get all notes (with filters)
- `GET /api/notes/:id` - Get single note
- `GET /api/notes/:id/preview` - Preview PDF
- `GET /api/notes/:id/download` - Download PDF
- `GET /api/notes/:id/audio` - Stream audio file

## Project Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── models/                # Mongoose schemas
│   ├── User.js
│   ├── Department.js
│   ├── Subject.js
│   ├── Note.js
│   ├── Notification.js
│   ├── Announcement.js
│   ├── NoteDownload.js
│   └── NoteView.js
├── routes/                # API routes
│   ├── auth.js
│   ├── departments.js
│   └── notes.js
├── middleware/            # Express middleware
│   ├── auth.js
│   └── upload.js
├── uploads/               # Uploaded files
│   └── audio/
├── .env                   # Environment variables
├── server.js              # Main server file
└── package.json
```

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/college-notes
SESSION_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

## Default Departments

The system initializes with these departments:
- Computer Science
- Computer Application

## Authentication

The backend uses the **exact same authentication logic** as the original project:
- bcrypt password hashing
- Session-based authentication
- Role-based access control (teacher, student, admin)
- Blocked user checking

## Testing

Test the API health:
```bash
curl http://localhost:5000/api/health
```

## Notes

- Sessions are stored in MongoDB using `connect-mongo`
- File uploads are stored in `uploads/` directory
- Audio files are stored in `uploads/audio/`
- Maximum file size: 25MB
