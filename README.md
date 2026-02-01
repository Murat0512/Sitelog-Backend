# Site Tracker MVP

A simple civil engineering site progress tracker with daily logs, evidence uploads, and PDF reporting.

## Features
- JWT authentication (email/password)
- Projects CRUD + archive
- Daily log creation with filters
- Evidence attachments (images/PDFs)
- PDF report export by date range

## Tech Stack
- Frontend: Angular 17 + Angular Material
- Backend: Node.js + Express + MongoDB (Mongoose)
- PDF: PDFKit

## Prerequisites
- Node.js 18+
- MongoDB running locally or a MongoDB connection string
- Cloudinary account (for file uploads)

## Backend Setup
1. Copy environment file:
   - Duplicate `backend/.env.example` to `backend/.env` and set:
     - `JWT_SECRET`
     - `MONGODB_URI`
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
2. Install dependencies (already done if using this workspace):
   - `npm install`
3. Run the API:
   - `npm run dev`

The API runs on `http://localhost:3000` by default.

For production, set `FRONTEND_URL` or `CORS_ORIGIN` to the deployed frontend URL to enable strict CORS.

## Frontend Setup
1. Install dependencies (already done if using this workspace):
   - `npm install`
2. Run the app:
   - `npm start`

The app runs on `http://localhost:4200` and calls the API at `/api`.

## API Endpoints (MVP)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id` (archive)
- `GET /api/projects/:id/reports/daily?from=&to=`
- `GET /api/projects/:projectId/logs?from=&to=&activityType=`
- `POST /api/projects/:projectId/logs`
- `GET /api/logs/:logId`
- `PATCH /api/logs/:logId`
- `DELETE /api/logs/:logId`
- `POST /api/logs/:logId/attachments`
- `GET /api/logs/:logId/attachments`
- `DELETE /api/attachments/:id`

## Vercel Deployment (Free Stack)
### Backend (Serverless)
1. Create a Vercel project pointing to the `backend/` folder.
2. Set environment variables in Vercel:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - Optional: `CORS_ORIGIN`
   - `BREVO_SMTP_HOST` (default: `smtp-relay.brevo.com`)
   - `BREVO_SMTP_PORT` (default: `587`)
   - `BREVO_SMTP_USER`
   - `BREVO_SMTP_PASS`
   - `MAIL_FROM`
   - `FRONTEND_URL`
3. Deploy and verify:
   - `GET /api/health`
   - `POST /api/auth/login`

### Frontend (Angular)
1. Create a Vercel project pointing to the `frontend/` folder.
2. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist/site-tracker`
3. Deploy and verify login + API calls.
4. Update `frontend/vercel.json` with your backend URL:
   - Replace `https://YOUR_BACKEND_DOMAIN` with the deployed backend domain.

## Notes
- Uploads go directly to Cloudinary (no local disk).
- Vercel uses serverless functions; do not run `app.listen()` in API handlers.
