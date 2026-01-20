# ClearDay Backend

A Node.js + Express backend API for the ClearDay skincare habit tracking application with proper MVC architecture.

## Features

- **Authentication**: Clerk JWT middleware for protected routes
- **File Upload**: Multer for photo uploads (5MB limit)
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: Frontend AI processing with backend data storage
- **RESTful API**: Clean endpoints with proper error handling
- **Validation**: Joi-based request validation
- **Error Handling**: Comprehensive error middleware

## Tech Stack

- Node.js with ES6 modules
- Express.js framework
- MongoDB + Mongoose
- Multer for file uploads
- Clerk backend SDK
- Joi for validation
- CORS for cross-origin requests

## Architecture

The backend follows MVC pattern with proper separation of concerns:

- **Controllers**: Handle business logic and request/response processing
- **Routes**: Define API endpoints and apply middleware
- **Models**: MongoDB data schemas
- **Middleware**: Error handling, validation, and authentication

## API Endpoints

### User Routes (`/api/user`)
- `POST /profile` - Create/update user profile
- `GET /profile/:clerkId` - Get user profile
- `DELETE /profile/:clerkId` - Delete user profile

### Daily Routes (`/api/daily`) - Protected
- `POST /upload-photo` - Upload daily photo (multipart/form-data)
- `POST /complete-routine` - Mark routine complete
- `GET /status` - Get daily status (streak, warnings)
- `GET /history` - Get last 30 days history
- `PUT /log` - Update daily log with additional data

### AI Routes (`/api/ai`) - Protected
- `POST /progress-analysis` - Store AI progress analysis
- `POST /product-evaluation` - Store AI product evaluation
- `GET /user-data` - Get user data for AI processing
- `GET /progress-metrics` - Get progress metrics
- `GET /product-evaluations` - Get product evaluations
- `DELETE /progress-metrics/:metricId` - Delete progress metric

## Database Models

### User
```javascript
{
  clerkId: String,
  profile: {
    skinGoal: String, // 'acne', 'glow', 'healthy-skin'
    skinType: String  // 'oily', 'dry', 'combination', 'sensitive'
  },
  createdAt: Date
}
```

### DailyLog
```javascript
{
  userId: String,
  date: String, // YYYY-MM-DD
  photoUrl: String,
  routineCompleted: Boolean,
  createdAt: Date
}
```

### Analytics
```javascript
{
  userId: String,
  baselineDate: String,
  totalDaysTracked: Number,
  skippedDays: Number,
  isReset: Boolean,
  progressMetrics: [{
    date: String,
    acneTrend: String,
    rednessTrend: String,
    insightMessage: String
  }],
  productEvaluations: [{
    date: String,
    productName: String,
    fitScore: Number,
    insightMessage: String
  }]
}
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Claude API key
- Clerk application setup

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Update `.env` with your actual values:
```
MONGODB_URI=mongodb://localhost:27017/clearday
CLERK_PEM_PUBLIC_KEY=your_clerk_public_key_here
PORT=5000
CLAUDE_API_KEY=your_claude_api_key_here
```

### Running the Server

1. Start MongoDB server
2. Run the application:
```bash
npm run dev
```

For production:
```bash
npm start
```

## Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `CLERK_PEM_PUBLIC_KEY`: Clerk public key for JWT verification
- `PORT`: Server port (default: 5000)
- `CLAUDE_API_KEY`: Claude API key for AI features

## Dataset Continuity Logic

The system implements a dataset continuity system to maintain AI accuracy:

- **Day 1 missed**: Gentle reminder
- **Day 2 missed**: Warning message
- **Day 3 missed**: Final warning
- **Day 4+ missed**: Analytics reset (photos preserved)

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (when implemented)

## Project Structure

```
├── controllers/        # Business logic controllers
│   ├── userController.js
│   ├── dailyController.js
│   └── aiController.js
├── middleware/         # Custom middleware
│   ├── errorHandler.js
│   └── validation.js
├── models/             # Mongoose models
├── routes/             # Express route handlers
├── server.js           # Main server file
├── .env.example        # Environment variables template
└── package.json        # Dependencies and scripts
```

## Error Handling

The API includes comprehensive error handling:
- **Validation Errors** (400): Invalid input data with detailed messages
- **Authentication Errors** (401): Invalid or expired tokens
- **Not Found Errors** (404): Resources not found
- **Internal Server Errors** (500): Server-side issues
- **File Upload Errors**: Size limits, invalid formats
- **Database Errors**: Validation, duplicates, invalid IDs

## Validation

Request validation using Joi schemas for:
- User profiles (clerkId, skinGoal, skinType)
- Daily logs (date, acneLevel, rednessLevel, notes)
- AI analysis data (progress analysis, product evaluations)
- File uploads (image types, size limits)

## Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": [ ... ] // Only for validation errors
}
```
