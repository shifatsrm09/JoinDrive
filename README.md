# JoinDrive Frontend

Frontend for JoinDrive built with React, TypeScript, Vite and Tailwind CSS.

---

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React

---

## Installation

```bash
npm install
```

---

## Installed Packages

```bash
npm install react-router-dom
```

Routing

```bash
npm install lucide-react
```

Icons

```bash
npm install tailwindcss @tailwindcss/vite
```

Tailwind CSS

---

## Run Development Server

```bash
npm run dev
```

Default URL

```
http://localhost:5173
```

---

## Current Features

- Landing Page
- Authentication
- Protected Routes
- Connected Drive Dashboard
- Google Drive Storage Information
- Live Backend Integration

---

## Backend Requirements

The backend server must be running before starting the frontend.

Backend URL

```
http://localhost:5000
```

---

## Project Structure

```
src/
│
├── api/
├── assets/
├── components/
├── context/
├── hooks/
├── pages/
├── styles/
├── types/
└── data/
```

# JoinDrive Backend

Backend API for JoinDrive built with Express.js, MongoDB and Google Drive API.

---

## Tech Stack

- Node.js
- Express
- MongoDB Atlas
- Mongoose
- Google Drive API
- JWT Authentication

---

## Installation

```bash
npm install
```

---

## Installed Packages

### Express

```bash
npm install express
```

### MongoDB

```bash
npm install mongoose
```

### Google APIs

```bash
npm install googleapis google-auth-library
```

### JWT

```bash
npm install jsonwebtoken
```

### Cookies

```bash
npm install cookie-parser
```

### Environment Variables

```bash
npm install dotenv
```

### CORS

```bash
npm install cors
```

---

## Run Development Server

```bash
npm run dev
```

Default URL

```
http://localhost:5000
```

---

# API Endpoints

---

## Health Check

### GET

```
/api/health
```

Purpose

Verify that the backend is running.

---

## Authentication

### Google Login

```
GET /api/auth/google
```

Starts Google OAuth.

---

### Google Callback

```
GET /api/auth/google/callback
```

Google redirects here after authentication.

---

### Current User

```
GET /api/auth/me
```

Returns the authenticated user.

---

## Drive APIs

### Drive Summary

```
GET /api/drive/info
```

Returns

- Google Account
- Email
- Profile Picture
- Storage Information

---

### Storage Usage

```
GET /api/drive/storage
```

Returns

- Total Storage
- Used Storage
- Drive Usage
- Trash Usage

---

### List Files

```
GET /api/drive/files
```

Root folder

```
/api/drive/files
```

Specific Folder

```
/api/drive/files?folderId=<folderId>
```

Returns

- File ID
- Name
- MIME Type
- Modified Time
- Thumbnail
- Icon

---

## Current Features

- Google OAuth Login
- JWT Authentication
- HTTP-only Cookies
- Protected Routes
- Token Refresh
- Drive Information
- Storage Information
- File Listing

---

## Folder Structure

```
server/
│
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
│
├── app.js
├── server.js
└── .env
```