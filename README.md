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

The frontend listens on `FRONTEND_HOST` and `FRONTEND_PORT` from the root `.env`.

### Localhost and phone access

The root `.env` uses `VITE_API_URL` as a comma-separated list of backend API URLs. `server/.env` uses `CLIENT_URL` as a comma-separated list of allowed frontend origins. The entries act as OR alternatives; do not put the word `OR` or `||` between them.

Replace `YOUR_IPV4` in both files with your computer's IPv4 address. Keep the localhost entries to continue using either address. The browser selects the API URL matching its hostname, and the backend accepts either configured frontend origin. The first URL is the default when no hostname matches.

`FRONTEND_HOST` in the root `.env` and `HOST` in `server/.env` control the listening interfaces. The provided values listen on all interfaces for LAN access. `FRONTEND_PORT` and backend `PORT` control the ports; update the corresponding URL entries if you change either port.

Restart both development servers after editing the environment files. Connect your phone to the same network and open your computer's IPv4 address with the frontend port. If the page cannot be reached, allow the configured ports through Windows Firewall on your private network.

Google OAuth callback URLs remain in `GOOGLE_REDIRECT_URI` and `GOOGLE_CONNECT_REDIRECT_URI` in `server/.env`. Google does not accept private IPv4 addresses as web OAuth callback hosts, and a localhost callback on a phone points to the phone. Signing in from a phone therefore requires a registered HTTPS domain or tunnel, with matching callback URLs in Google Cloud and matching frontend/API environment settings. See [Google's redirect URI rules](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation).

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

The backend API URLs are configured through `VITE_API_URL` in the root `.env`.

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

The backend listens on `HOST` and `PORT` from `server/.env`.

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
