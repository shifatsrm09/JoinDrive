# Deploy JoinDrive on Vercel for free

This branch deploys the frontend and backend together as one Vercel project. Vite builds the frontend into `dist`, and `api/index.js` exposes the Express API as a Node.js function. The standalone backend listener is used only for local development.

Use Vercel **Hobby** for personal, non-commercial use, the included `vercel.app` domain, and MongoDB Atlas **Free / M0**. Do not select Pro, a Pro trial, Flex, a dedicated database, or paid add-ons. Free hosting has usage limits; it does not mean unlimited traffic or compute. Vercel can pause features when the free allowance is exhausted. See the [Hobby plan](https://vercel.com/docs/plans/hobby) and [Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).

## 1. Prepare your database

Keep your existing Atlas database if it is already on the Free / M0 tier. It stores users and connected-account credentials; file bytes stay in Google Drive. There is no database migration for this deployment.

In Atlas, verify that your database user can read and write the JoinDrive database. Under Network Access, allow connections from Vercel. Vercel's standard outbound addresses are dynamic; the free setup commonly uses `0.0.0.0/0` in Atlas's IP access list. This permits network connections from anywhere, so use a strong, unique database password and restrict the database user's permissions to the application database. Authentication remains required. See [Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/) and the [Vercel integration guide](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/).

## 2. Push the serverless branch

Commit these changes and push `serverless` to your GitHub repository. The real `.env` files remain ignored and must not be committed. `.env.vercel.example` is a blank configuration template, not a file containing your credentials.

## 3. Import the project into Vercel

Create or use a Vercel Hobby account, choose **Add New → Project**, and import the JoinDrive repository.

Use the repository root as **Root Directory**, **Vite** as the framework, and **Node.js 24.x**. The checked-in `vercel.json` supplies the install command, build command, `dist` output directory, API routing, frontend page routing, and Fluid compute settings. Do not create a separate backend project or set a start command.

Choose an available project name. Use the actual stable production domain assigned by Vercel in the steps below; `YOUR_PROJECT.vercel.app` is only a placeholder. If the domain is not shown until your first deployment, finish that deployment, then correct the environment variables and redeploy before attempting login.

Make sure **Settings → Environments → Production → Branch Tracking** points to `serverless`. Vercel may initially choose `main` when importing a repository. If that happens, change the production branch and deploy the latest `serverless` commit. See [Vercel's production branch guide](https://vercel.com/kb/guide/can-i-use-a-non-default-branch-for-production).

## 4. Add Vercel environment variables

Use **Settings → Environment Variables**, or the environment section of the import screen, and add these values to **Production**:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `/api` |
| `CLIENT_URL` | `https://YOUR_PROJECT.vercel.app` |
| `MONGODB_URI` | Your existing Atlas connection string, including the database name |
| `GOOGLE_CLIENT_ID` | Your existing Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your existing Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_PROJECT.vercel.app/api/auth/google/callback` |
| `GOOGLE_CONNECT_REDIRECT_URI` | `https://YOUR_PROJECT.vercel.app/api/auth/google/connect/callback` |
| `JWT_SECRET` | Your existing strong random signing secret, or a new strong random secret |

Use `.env.vercel.example` as a checklist. Enter values without surrounding quotes. The only browser-visible variable is `VITE_API_URL`; never add `VITE_` to a secret. Keep the same `JWT_SECRET` between deployments so existing logins remain valid.

`HOST`, `PORT`, `FRONTEND_HOST`, and `FRONTEND_PORT` are local development settings and are not needed on Vercel. Leave the existing local `.env` files in place so desktop/LAN development continues to work.

## 5. Configure Google login

In Google Cloud / Google Auth Platform, open the existing **Web application** OAuth client. Keep the local development entries and add the production origin under **Authorized JavaScript origins**:

```text
https://YOUR_PROJECT.vercel.app
```

Add both of these exact **Authorized redirect URIs**:

```text
https://YOUR_PROJECT.vercel.app/api/auth/google/callback
https://YOUR_PROJECT.vercel.app/api/auth/google/connect/callback
```

Keep the Google Drive API enabled. If the OAuth app is in Testing, add every Google account you will sign in with or connect as a test user. Google can expire refresh tokens after seven days for external apps in Testing with Drive scopes, requiring those accounts to reconnect. Public release with restricted Drive scopes is a separate Google verification process; hosting on Vercel does not complete that process. See [Google OAuth setup](https://developers.google.com/identity/protocols/oauth2/web-server) and [refresh-token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).

Use the stable production domain to sign in. Random preview deployment domains are not configured for OAuth. Testing previews needs a separately configured stable preview origin, matching preview environment variables, and registered callbacks; pointing a preview at the production callback will not share its OAuth state cookie.

## 6. Deploy and verify

Deploy the latest `serverless` commit after saving the settings. Environment changes require a new deployment. Open the stable HTTPS production URL on your computer or phone.

1. Open `/api/health`; it should return JSON with `success: true`. This confirms routing and the function are online, not database connectivity.
2. Sign in, connect a second test account, and verify both Drive listings and storage information.
3. Refresh a nested explorer page directly; it should load the app rather than a Vercel 404.
4. Upload a small file, multiple files, and a folder; check that bytes upload directly to Google's resumable-upload URL. Measure a large upload using actual elapsed time.
5. Download a normal file and a Google document. Try rename, favourites, trash, restore, and logout using disposable test files.

If the API returns 503, check Atlas network access and `MONGODB_URI`. If Google reports `redirect_uri_mismatch`, compare both callback environment variables with the Google client settings. If login returns `invalid_state`, use the same stable production hostname throughout the flow. For a Vercel function error, inspect the deployment's Runtime Logs and verify all required environment variables are present.

## Free-tier behavior

Uploads go directly from the browser to Google Drive; the function only creates the upload session and returns its URL. Single-file uninterrupted uploads, controlled multi-file concurrency, cancellation, recovery, pagination, and frontend caching are retained.

Downloads continue to stream through the API so private files from connected accounts work without exposing Google access tokens. Streaming avoids buffering the whole response, but downloads still use Vercel transfer and compute allowances and must finish within the configured 300-second function duration. Large or slow downloads can hit that limit. This setup does not promise unlimited multi-gigabyte downloads on a free function. See [Vercel streaming guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) and [function limits](https://vercel.com/docs/functions/limitations).

MongoDB connections are reused within each warm function instance with a small pool. The 60-second backend storage cache is also per instance and can reset on a cold start; correctness does not depend on it being shared. Refreshed Google credentials are saved before their client is returned, and production authentication cookies use HTTPS.

Run `npm test`, `npm run build`, and `npm run lint` before pushing changes. The automated tests use mocked Google and MongoDB services and do not upload files or change your real accounts. A live deployment and authenticated end-to-end checks are still required to verify the actual Vercel, Atlas, and Google settings.

---

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
