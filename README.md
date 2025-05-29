# User Management RBAC Frontend

This project is a Vite + React + TypeScript frontend for the user-management RBAC backend. It includes:
- Authentication (login/logout)
- Protected routes
- User, product, and customer management UIs
- Role-based access control
- Clean UI with Material-UI or Ant Design

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. The app will be available at http://localhost:5173

## Project Structure
- `src/` — Main source code
- `src/pages/` — Page components (Login, Dashboard, Users, Products, Customers, etc.)
- `src/components/` — Reusable UI components
- `src/api/` — API utilities for backend communication

## Customization
- Update API endpoints in `src/api/` to match your backend.
- Replace placeholder assets as needed.

## Deployment to Netlify

### Prerequisites
- Netlify account
- Backend API deployed and accessible (e.g., on Heroku)

### Steps
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Deploy to Netlify:
   - Drag and drop the `dist/` folder in the Netlify UI, or
   - Use the Netlify CLI:
     ```bash
     npm install -g netlify-cli
     netlify deploy --prod --dir=dist
     ```
3. Set the API URL environment variable in Netlify:
   - In the Netlify dashboard, go to Site settings > Environment variables
   - Add `VITE_API_URL` and set it to your backend API URL (e.g., `https://your-backend.herokuapp.com`)

### Netlify Build Settings
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Environment variable:** `VITE_API_URL` (must point to your backend API)

### Required Environment Variables
- `VITE_API_URL` — URL of your backend API (e.g., Heroku app URL)

---

For more details, see `.github/copilot-instructions.md`.
