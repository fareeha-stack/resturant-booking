# GatherTable

GatherTable is an AI-assisted, multi-restaurant table booking platform built for a MERN hackathon project. Customers can discover restaurants, find tables, and manage bookings. Restaurant owners can maintain listings, seating, and reservation requests. Gemini recommends restaurants from the approved MongoDB listings; it does not create or confirm bookings.

## Tech stack

- **MongoDB and Mongoose** for users, restaurants, tables, bookings, and booking slots
- **Express and Node.js** for the REST API
- **React and Vite** for the web client
- **JWT and bcryptjs** for authentication and password hashing
- **Cloudinary and Multer** for optional restaurant image uploads
- **Google Gemini** (`gemini-2.0-flash`) for restaurant recommendations
- **Axios and React Router** for client API calls and page navigation

## Features

### Customer

- Register and sign in as a customer
- Browse restaurants and filter by cuisine or location
- Get AI restaurant recommendations using cuisine, location, party size, and preferences
- Check table availability and request a booking
- View and cancel their own bookings

### Owner

- Register and sign in as a restaurant owner
- Create and update restaurant listings, with optional images
- Add tables and manage their capacity and active status
- Review bookings for their own restaurants and confirm or reject pending requests

## Double-booking prevention

Booking requests are checked for an existing pending or confirmed booking on the same table and date. The overlap rule is `existing.startTime < newEndTime` and `existing.endTime > newStartTime`.

To protect concurrent requests, each booking claims one `BookingSlot` document for every 30-minute interval. A unique compound index on `tableId`, `date`, and `slot` allows only one claim for a table in a slot. If a claim conflicts, the request's claims are released and the API responds with **409 Conflict** and `{ "message": "Table already booked for this time slot" }`. Booking times must be on 30-minute boundaries. Rejected and cancelled bookings release their slot claims.

## Setup

### 1. Configure MongoDB and server environment

Create a MongoDB database, then copy `server/.env.example` to `server/.env` and fill in the values. Do not commit the real `.env` file.

From the `server` folder, install dependencies on a fresh checkout and seed the demo data:

```bash
cd server
npm install
npm run seed
```

Start the API:

```bash
npm run dev
```

The server listens on `http://localhost:5000` by default. Check `http://localhost:5000/api/health` for the health response. Use `npm start` for a regular start without Nodemon.

### 2. Start the client

From another terminal:

```bash
cd client
npm install axios react-router-dom
npm run dev
```

Vite prints the local client URL, usually `http://localhost:5173`. The client uses `http://localhost:5000/api` by default. To change this, set `VITE_API_URL` in the client environment, for example `http://localhost:5000/api`.

## Environment variables

These are the server variables listed in `server/.env.example`:

| Variable | Purpose |
| --- | --- |
| `PORT` | API port; defaults to `5000` |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify authentication tokens |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for image uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GEMINI_API_KEY` | Google Gemini API key for recommendations |

## API endpoints

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API health check |
| `POST` | `/auth/register` | Public | Create a customer or owner account |
| `POST` | `/auth/login` | Public | Sign in and receive a JWT |
| `GET` | `/auth/me` | Signed in | Get the current profile |
| `GET` | `/restaurants` | Public | List restaurants; optional `cuisine` and `location` filters |
| `GET` | `/restaurants/:id` | Public | Restaurant details and active tables |
| `GET` | `/restaurants/mine/list` | Owner | List the signed-in owner's restaurants |
| `POST` | `/restaurants` | Owner | Create restaurant; multipart image field is `image` |
| `PUT` | `/restaurants/:id` | Owning owner | Update restaurant details or image |
| `POST` | `/restaurants/:restaurantId/tables` | Owning owner | Add a table |
| `GET` | `/restaurants/:restaurantId/tables` | Owning owner | List restaurant tables |
| `PUT` | `/tables/:id` | Owning owner | Update table number, capacity, or active status |
| `GET` | `/bookings/availability` | Public | Find available tables with `restaurantId`, `date`, `startTime`, `endTime`, and `partySize` query values |
| `POST` | `/bookings` | Customer | Create a pending booking |
| `GET` | `/bookings/my` | Customer | List the signed-in customer's bookings |
| `GET` | `/bookings/restaurant/:restaurantId` | Owning owner | List bookings for a restaurant |
| `PATCH` | `/bookings/:id/status` | Owning owner | Confirm or reject a pending booking |
| `PATCH` | `/bookings/:id/cancel` | Booking's customer | Cancel a pending or confirmed booking |
| `POST` | `/ai/recommend` | Signed in | Recommend restaurants from approved listings |

API errors use the JSON shape `{ "message": "..." }`.

## Demo flow

1. Run `npm run seed` in `server` to add sample users, restaurants, and tables. The demo passwords are `secret123`.
2. Sign in as `customer.demo@example.com` to browse restaurants, request recommendations, check table availability, and make a booking.
3. Sign out and sign in as `owner.demo@example.com` to manage restaurants and tables, then confirm or reject a pending booking.
4. Try two overlapping booking requests for the same table and date. The second request should receive `409 Conflict`.

The seed script skips demo users, restaurants, and tables that already exist, so it can be run again without duplicating them.

## Future work

- Socket.io live availability and reservation updates
- Email notifications for booking confirmations, rejections, and reminders
- Admin approval workflow for restaurant listings
