# Hospital Web Frontend

This Vite + React (TS) app is wired to the Capstone gateway running at `http://localhost:8080`. Once the backend stack is online (`npm run start:ci` from the repository root), you only need to keep the environment variables below in place and provide a JWT for authorised calls.

## 1. Environment

Create a `.env.local` (already scaffolded for you) in this folder with:

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_JWT_SECRET=super_secret_dev
```

`VITE_API_BASE_URL` controls the Axios client base URL (`src/lib/api.ts`). `VITE_JWT_SECRET` is optional, but it matches the backend default so you can mint dev tokens locally.

## 2. Generate a dev token (optional helper)

Run this from the repository root whenever you need a fresh token:

```
node -e "console.log(require('jsonwebtoken').sign({ sub: 'student1', roles: ['ADMIN','MANAGER','STAFF'] }, 'super_secret_dev'))"
```

Store the resulting token in `localStorage` (key `token`) or paste it into `VITE_DEV_BEARER` inside `.env.local` and read it in your auth bootstrap.

## 3. Start the stack

1. From the repo root: `npm run start:ci` (keeps the gateway + services alive).
2. In this folder: `npm install` (once) then `npm run dev`.
3. The app will proxy API requests to `http://localhost:8080/api/*` with the bearer header automatically injected by `src/lib/api.ts`.

You should now be able to hit health routes like `/api/plt/health` or work with inventory/procurement flows directly from the UI.

## 4. Notes

- The Axios client automatically sends the bearer token stored in `localStorage` under the `token` key.
- Adjust roles in the generated token to simulate manager/staff access as required by the backlog scenarios.
- If you change backend ports, update `VITE_API_BASE_URL` accordingly.
- Seeded accounts from `auth-svc`: `admin@hospital.local` / `ChangeMe123!`, `manager@hospital.local` / `ManageMe123!`, `staff@hospital.local` / `StaffMe123!`.
