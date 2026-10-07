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
    vite.config.js                dev server + proxy to the backend
    src/main.jsx                  React entry point
    src/App.jsx                   layout and hash routing (#/, #/listing/<id>, #/sell, #/admin ...)
    src/api.js                    backend connection: api(), useApi(), ApiError
    src/constants.js              categories, report reasons, date helper (must match the backend)
    src/context/AppContext.jsx    logged-in user, login/register/logout, toast
    src/components/               Header and small shared pieces (ui.jsx)
    src/pages/                    Browse, Listing, Sell, MyListings, Wishlist, Dashboard,
                                  Seller, MyReports, Admin, Auth

## Connecting to the backend

The frontend talks to the Next.js backend under `/api`. Nothing is stored in the browser:
the backend sets an HttpOnly `cs_session` cookie on login and decides who is logged in.

1. Start the backend first (`npm run dev` in the backend folder). It must be on http://localhost:3000.
   Check it at http://localhost:3000/api/health
2. Start the frontend (`npm run dev` here) and open http://localhost:5173
3. Vite forwards every `/api/...` request to the backend (see `vite.config.js`), so no CORS
   setup is needed. If the backend runs somewhere else, start the frontend with
   `BACKEND_URL=http://host:port npm run dev`.

Always open the app on port 5173 during development, not 3000 (3000 shows the backend placeholder page).

For production, serve the built `dist/` folder from the same origin as the backend
(or put both behind one reverse proxy) so `/api` and the cookie keep working.

Errors from the backend arrive as `{ error: { code, message, fields } }` and are turned into
`ApiError` in `src/api.js`; `fields` drives the per-field messages on forms.
