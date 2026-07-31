# SalesDialer - Mini Sales Dialer Application

A production-quality sales dialer web application for managing contacts, making calls, and tracking sales activities.

## Features

- **Authentication**: Secure JWT-based login system
- **Contact Management**: Add, edit, delete, search, and filter contacts
- **Sales Dialer**: Make calls with automatic state transitions (idle → calling → connected → ended)
- **Call Logging**: Track all calls with duration, status, and notes
- **AI Call Summaries**: Mock AI-generated summaries based on note content
- **Dashboard**: Real-time statistics on contacts, calls, and lead status
- **CSV Import**: Bulk import contacts from CSV files
- **Dark Mode**: Full dark mode support with persistence
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- React 18 with Vite
- Tailwind CSS v3
- React Router v6
- TanStack Query v5 (React Query)
- Axios
- React Hook Form + Zod
- Lucide React Icons

### Backend
- Node.js + Express.js
- Sequelize ORM
- SQLite (file-based)
- JWT Authentication
- bcryptjs for password hashing

## Prerequisites

- Node.js 18+ and npm
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone<repository-url>
cd sales-dialer
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create environment file (already included):
```bash
cp .env.example .env
```

Seed the database with demo data:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### 4. Access the Application

Open your browser and navigate to `http://localhost:5173`

## Default Credentials

- **Email**: demo@dialer.com
- **Password**: password123

## API Documentation

### Authentication

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "demo@dialer.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Demo Agent",
    "email": "demo@dialer.com",
    "role": "agent"
  }
}
```

#### GET /api/auth/me
Get current user info (requires authentication).

#### POST /api/auth/logout
Logout (requires authentication).

### Contacts

#### GET /api/contacts
Get paginated contacts list.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `search` (string)
- `status` (new|contacted|interested|not_interested)

#### POST /api/contacts
Create a new contact.

**Request:**
```json
{
  "name": "John Smith",
  "phone": "+1-555-0101",
  "email": "john@example.com",
  "company": "Acme Inc",
  "status": "new",
  "notes": "Initial contact"
}
```

#### GET /api/contacts/:id
Get a specific contact.

#### PUT /api/contacts/:id
Update a contact.

#### DELETE /api/contacts/:id
Delete a contact.

#### POST /api/contacts/import
Import contacts from CSV file (multipart/form-data).

**Expected CSV columns:** name, phone, email, company, status

### Calls

#### POST /api/calls/start
Start a new call.

**Request:**
```json
{
  "contactId": "uuid"
}
```

#### POST /api/calls/end
End an active call.

**Request:**
```json
{
  "callId": "uuid"
}
```

#### GET /api/calls
Get paginated call logs.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `contactId` (filter by contact)
- `sortBy` (date|duration)
- `order` (asc|desc)

#### POST /api/calls/:id/notes
Add a note to a call with AI-generated summary.

**Request:**
```json
{
  "content": "Customer showed interest in our product."
}
```

#### GET /api/calls/:id/notes
Get all notes for a call.

### Dashboard

#### GET /api/dashboard
Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalContacts": 15,
    "callsToday": 3,
    "interestedLeads": 5,
    "notInterestedLeads": 2,
    "recentCalls": [...],
    "statusBreakdown": {
      "new": 5,
      "contacted": 3,
      "interested": 5,
      "not_interested": 2
    }
  }
}
```

## Docker Setup

### Build and Run with Docker Compose

```bash
# Build and start containers
docker-compose up --build

# Run in background
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Individual Docker Builds

**Backend:**
```bash
docker build -t sales-dialer-backend -f Dockerfile.backend .
docker run -p 5000:5000 sales-dialer-backend
```

**Frontend:**
```bash
docker build -t sales-dialer-frontend -f Dockerfile.frontend .
docker run -p 3000:80 sales-dialer-frontend
```

## Folder Structure

```
sales-dialer/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── models/
│   │   │   ├── index.js
│   │   │   ├── User.js
│   │   │   ├── Contact.js
│   │   │   ├── Call.js
│   │   │   └── CallNote.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── contacts.js
│   │   │   ├── calls.js
│   │   │   └── dashboard.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── contactController.js
│   │   │   ├── callController.js
│   │   │   └── dashboardController.js
│   │   └── seeders/
│   │       └── seed.js
│   ├── .env
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Spinner.jsx
│   │   │   │   └── Pagination.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Contacts.jsx
│   │   │   ├── Dialer.jsx
│   │   │   └── CallLogs.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useContacts.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── formatters.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

## Screenshots

*Screenshots placeholder - Add screenshots of the application here*

### Login Page
![Login Page](screenshots/login.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Contacts
![Contacts](screenshots/contacts.png)

### Dialer
![Dialer](screenshots/dialer.png)

### Call Logs
![Call Logs](screenshots/call-logs.png)

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
cd frontend
npm run build
```

The build output will be in `frontend/dist/`

## License

MIT License
