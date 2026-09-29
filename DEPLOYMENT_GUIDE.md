# CareerPilot — Simple Deployment Guide (100% Free Hosting)

This guide shows you step-by-step how to host CareerPilot on the internet for **free** using the most popular, reliable platforms:

- **Database**: **MongoDB Atlas** (Free cloud database)
- **Backend API**: **Render.com** (Free Node.js web service)
- **Frontend UI**: **Vercel.com** (Free React web hosting)

---

## 🛠️ What Was Done for You (Already Complete)

Everything on the code and configuration side is already set up and pushed to your GitHub repository ([`https://github.com/01sathu/CareerPilot`](https://github.com/01sathu/CareerPilot)):
1. ✅ **`render.yaml` created**: Pre-configures the backend on Render automatically.
2. ✅ **`frontend/vercel.json` created**: Sets up SPA routing and security headers so page refreshes don't give 404 errors.
3. ✅ **CORS & Cookies configured**: Backend accepts requests and credentials from your Vercel URL.
4. ✅ **Security hardening verified**: 124 automated tests passing.
5. ✅ **All code pushed to GitHub**.

---

## 📋 What You Need to Do (3 Simple Steps)

You only need to do 3 simple steps in your browser:

```
[ Step 1: MongoDB Atlas ] ───> Get Database URL
         │
[ Step 2: Render.com ]    ───> Deploy Backend (gives you backend URL)
         │
[ Step 3: Vercel.com ]    ───> Deploy Frontend (gives you your live website!)
```

---

### Step 1: Get Free Database URL from MongoDB Atlas (5 minutes)

If you already have a MongoDB Atlas connection string, skip to Step 2!

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up or log in.
2. Click **Create Deployment** and choose the **M0 Free** cluster tier (Free forever).
3. Click **Database Access** on the left menu:
   - Click **Add New Database User**.
   - Create a username (e.g. `careerpilot_user`) and password (save this password!).
   - Set role to **Read and write to any database**.
4. Click **Network Access** on the left menu:
   - Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) so Render can connect.
   - Click **Confirm**.
5. Click **Database** on the left menu:
   - Click the **Connect** button next to your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the connection string. It looks like this:
     ```text
     mongodb+srv://careerpilot_user:<password>@cluster0.xxxxxx.mongodb.net/careerpilot?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual database user password.

---

### Step 2: Deploy Backend on Render.com (5 minutes)

1. Go to [https://render.com](https://render.com) and log in using your **GitHub account**.
2. Click **New +** at the top right, then select **Web Service**.
3. Choose **Build and deploy from a Git repository**.
4. Select your **`CareerPilot`** repository (or click "Configure account" if it's not listed).
5. Fill in these settings:
   - **Name**: `careerpilot-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: **Free**
6. Scroll down to **Environment Variables** and click **Add Environment Variable** for each:
   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `5000` | Port for the backend |
   | `MONGODB_URI` | *(Your connection string from Step 1)* | Database URL |
   | `JWT_ACCESS_SECRET` | *(Any long random text, 32+ letters)* | For access tokens |
   | `JWT_REFRESH_SECRET` | *(Another long random text, 32+ letters)* | For refresh tokens |
   | `GEMINI_API_KEY` | *(Your Google Gemini API key)* | For AI features |
   | `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Default Gemini model |
   | `STORAGE_DRIVER` | `local` | Upload storage mode |
   | `CLIENT_URL` | *(Leave temporary value for now, e.g. `http://localhost:5173`)* | We will update this in Step 4 |
   | `CORS_ORIGIN` | *(Leave temporary value for now, e.g. `http://localhost:5173`)* | We will update this in Step 4 |
7. Click **Create Web Service**.
8. Wait 2–3 minutes until the logs say `[Server] CareerPilot backend running`.
9. Copy your backend URL from the top of the page. It will look like:
   ```text
   https://careerpilot-api-xxxx.onrender.com
   ```

---

### Step 3: Deploy Frontend on Vercel.com (3 minutes)

1. Go to [https://vercel.com](https://vercel.com) and log in with your **GitHub account**.
2. Click **Add New...** -> **Project**.
3. Find your **`CareerPilot`** repository and click **Import**.
4. In the Project Configuration:
   - **Framework Preset**: Vite (detected automatically).
   - **Root Directory**: Click **Edit** and select **`frontend`**.
5. Open the **Environment Variables** section and add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://careerpilot-api-xxxx.onrender.com/api/v1` |
   *(⚠️ Be sure to replace with your actual Render URL from Step 2, and add `/api/v1` at the end!)*
6. Click **Deploy**.
7. In about 45 seconds, Vercel will give you your live URL! It looks like:
   ```text
   https://career-pilot-xxxx.vercel.app
   ```

---

### Step 4: Link Them (30 seconds)

Now that you have your live Vercel URL, tell Render to allow requests from it:

1. Open your **Render dashboard** -> click your **`careerpilot-api`** service.
2. Go to **Environment** on the left menu.
3. Update these two variables with your Vercel URL (no trailing slash):
   - `CLIENT_URL` = `https://career-pilot-xxxx.vercel.app`
   - `CORS_ORIGIN` = `https://career-pilot-xxxx.vercel.app`
4. Click **Save Changes**. Render will automatically restart in a few seconds.

---

### 🎉 Step 5: You're Live!

Open your Vercel URL (`https://career-pilot-xxxx.vercel.app`):
- Click **Register** to create your personal account.
- Add applications, try the Kanban board, upload resumes, and practice interviews!

---

## 💡 Good to Know (Render Free Tier)

- **Render Cold Starts**: On Render's free tier, the backend goes to sleep after 15 minutes of inactivity. When you open the site after a while, the very first request might take 20–30 seconds to wake up. CareerPilot's frontend is already designed to handle this gracefully with a loading indicator.
- **Future custom domain**: If you want your own domain like `mycareerpilot.com`, both Vercel and Render let you attach custom domains for free in their settings!
