# Community Store - React Frontend

React 18 + Vite. Dark blue and white theme.

## Run it in VS Code
1. Install Node.js (v18 or newer): https://nodejs.org
2. Open this folder in VS Code, then open the terminal (Ctrl + `)
3. Run:

       npm install
       npm run dev

4. Open the address shown (usually http://localhost:5173)

To make a production build: `npm run build` (output goes to `dist/`).

## Project structure

    index.html                    page shell
    src/main.jsx                  React entry point
    src/App.jsx                   layout and page routing (#/, #/bulletin, #/dashboard)
    src/styles.css                all styling (colours are at the top in :root)
    src/utils.js                  price/date/star helpers
    src/api.js                    backend connection point
    src/context/StoreContext.jsx  all app state and actions (cart, auth, orders, posts, reviews)
    src/data/products.js          product list, categories, pickup points
    src/data/seed.js              starting bulletin posts and reviews
    src/components/               Header, ProductCard, ProductModal, CartDrawer,
                                  NotificationsPanel, AuthModal, Modal, Toast
    src/pages/                    Shop, Bulletin, Dashboard

## Connecting the backend (for the backend team)
1. Copy `.env.example` to `.env` and set `VITE_API_BASE`, for example `VITE_API_BASE=http://localhost:3000/api`
2. While it is empty the app runs in the browser only and saves to localStorage (demo only, passwords stored in plain text).
3. When it is set, these actions are also sent as JSON POST requests through `sync()` in `src/api.js`:

| Action   | Endpoint  | Body                                          |
|----------|-----------|-----------------------------------------------|
| Register | /register | { name, email, role }                         |
| Login    | /login    | { email }                                     |
| Checkout | /orders   | { id, items[], total, pickup, date, status }  |
| Bulletin | /posts    | { id, title, cat, text, user, by, date }      |
| Review   | /reviews  | { pid, user, rating, text, date }             |

4. To finish the integration, edit `src/context/StoreContext.jsx`:
   - load products, posts, reviews and orders from the API instead of `data/products.js`, `data/seed.js` and localStorage
   - replace the local checks in `register` and `login` with the real responses (token or session)
   - enable CORS on the server for the frontend origin
