# Deployment Checklist (Vercel + Atlas + Cloudinary)

## 1) MongoDB Atlas
- [ ] Create M0 cluster
- [ ] Create DB user
- [ ] Network access: allow `0.0.0.0/0` (or specific IPs)
- [ ] Copy connection string into `MONGODB_URI`

## 2) Cloudinary
- [ ] Create account
- [ ] Copy `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## 3) Backend (Vercel)
- [ ] Import GitHub repo → set root to `backend/`
- [ ] Add env vars:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - Optional: `CORS_ORIGIN`
  - `RESEND_API_KEY`
  - `RESEND_FROM` (or `MAIL_FROM`)
  - `FRONTEND_URL`
- [ ] Deploy
- [ ] Test:
  - `GET /api/health`
  - `POST /api/auth/login`
  - Upload attachment → verify Cloudinary URL
  - Delete attachment/log/project → Cloudinary asset removed

## 4) Frontend (Vercel)
- [ ] Import GitHub repo → set root to `frontend/`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist/site-tracker`
- [ ] Deploy
- [ ] Update `frontend/vercel.json` with backend URL (replace `https://YOUR_BACKEND_DOMAIN`)
- [ ] Verify login + CRUD + uploads

## 5) Final Sanity Checks
- [ ] API uses `/api` (no localhost URLs)
- [ ] No `app.listen()` in serverless code
- [ ] No local disk uploads
- [ ] JWT protects routes
- [ ] PDF export works and is fast
- [ ] Password reset emails send successfully
