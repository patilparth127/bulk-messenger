# 📨 BulkSend — Multi-Tenant Bulk Email & WhatsApp Messenger

A full-stack SaaS application for sending bulk emails and WhatsApp messages. Features multi-company support, subscription management, user authentication, and contact management with Excel import.

---

## 🏗 Project Structure

```
bulk-messenger/
├── backend/           ← Node.js + Express API
│   ├── server.js      ← Main API server (port 3200)
│   ├── db.json        ← JSON Server database (auto-managed)
│   └── package.json
├── frontend/          ← React + TypeScript UI
│   ├── src/
│   │   ├── App.tsx
│   │   ├── styles.css
│   │   ├── types/index.ts       ← Enums & Interfaces
│   │   ├── utils/api.ts         ← API calls
│   │   ├── utils/helpers.ts     ← Formatters
│   │   └── components/
│   │       ├── Dashboard.tsx
│   │       ├── ContactList.tsx
│   │       ├── EmailPortal.tsx
│   │       ├── WhatsAppPortal.tsx
│   │       ├── Login.tsx
│   │       ├── UserManagement.tsx
│   │       ├── CompanyManagement.tsx
│   │       ├── AdminDashboard.tsx
│   │       ├── SubscriptionManagement.tsx
│   │       └── Settings.tsx
│   └── package.json
└── README.md
```

---

## 🚀 Setup & Run

### 1. Install dependencies

```bash
# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Start the backend

```bash
cd backend
node server.js
# API runs on http://localhost:3200
```

### 3. Start the frontend

```bash
cd frontend
npm start
# UI runs on http://localhost:3000
```

---

## 🔐 Authentication

The application supports multiple authentication methods:
- **Username/Password** — Traditional login with bcrypt password hashing
- **Google OAuth** — Google sign-in integration

**Default Master Admin:**
- Email: `patilparth127@gmail.com`
- Password: Set during first login or via backend

---

## 🏢 Multi-Company Architecture

- **Company Management** — Create and manage multiple companies
- **Company Codes** — Unique codes for user registration
- **User Roles** — Admin, User, Viewer with different permissions
- **Subscription Plans** — Free, Basic, Pro, Enterprise tiers
- **Product Licensing** — Enable/disable Email and WhatsApp modules per subscription

---

## 📊 Excel File Format

Upload an `.xlsx` or `.xls` file with these columns (case-insensitive):

| Column Name         | Required | Notes                          |
|---------------------|----------|--------------------------------|
| `Name`              | ✅ Yes   | Full name of contact           |
| `Email`             | ✅ Yes   | Email address                  |
| `Phone` / `Number`  | No       | WhatsApp phone number          |
| `Gender`            | No       | male / female / other          |

**Example:**

| Name         | Email               | Phone       | Gender |
|--------------|---------------------|-------------|--------|
| Raj Patel    | raj@example.com     | 9876543210  | male   |
| Priya Shah   | priya@example.com   | 9123456789  | female |

---

## 📧 Email Setup (Gmail)

1. Enable **2-Step Verification** on your Google Account
2. Go to Google Account → Security → **App Passwords**
3. Generate an App Password for "Mail"
4. Use your Gmail address + the App Password in the Email Portal

**SMTP Settings (pre-filled):**
- Host: `smtp.gmail.com`
- Port: `587`

---

## 💬 WhatsApp Integration

The application supports WhatsApp messaging through:
- **WhatsApp Web.js** — For automated messaging via QR code scanning
- **WhatsApp Cloud API** — For production use with official Meta API

Configure WhatsApp Cloud API in backend `.env`:
```env
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WABA_ID=your_waba_id
WHATSAPP_GRAPH_API_VERSION=v20.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_WEBHOOK_URL=your_webhook_url
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| POST   | `/api/auth/login`      | User login               |
| POST   | `/api/auth/google`     | Google OAuth login       |
| GET    | `/api/auth/me`         | Get current user         |
| POST   | `/api/auth/logout`     | Logout                   |

### Contacts
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | `/api/contacts`        | Get all contacts         |
| POST   | `/api/contacts`        | Create contact           |
| DELETE | `/api/contacts/:id`    | Delete contact           |
| DELETE | `/api/contacts`        | Delete all contacts      |
| POST   | `/api/upload-excel`    | Upload Excel file        |
| PATCH  | `/api/contacts/:id/status` | Update contact status |

### Email
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/email-campaigns`      | Get email campaigns      |
| POST   | `/api/email-campaigns/send` | Send email campaign      |
| GET    | `/api/email-logs`           | Get email logs           |

### WhatsApp
| Method | Endpoint                       | Description              |
|--------|--------------------------------|--------------------------|
| GET    | `/api/whatsapp-campaigns`      | Get WA campaigns         |
| POST   | `/api/whatsapp-campaigns/send` | Send WA campaign         |
| GET    | `/api/whatsapp-logs`           | Get WA logs              |
| POST   | `/api/whatsapp-cloud/send-message` | Cloud API send     |

### Companies
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/companies`                      | Get all companies        |
| GET    | `/api/companies/:id`                  | Get company details      |
| POST   | `/api/companies`                      | Create company           |
| PUT    | `/api/companies/:id`                  | Update company           |
| DELETE | `/api/companies/:id`                  | Delete company           |
| PUT    | `/api/companies/:id/toggle-service`   | Toggle service           |
| GET    | `/api/companies/:id/services`         | Get company services     |

### Subscriptions
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/subscriptions`                   | Get all subscriptions    |
| GET    | `/api/subscriptions/:id`              | Get subscription         |
| GET    | `/api/companies/:id/subscription`      | Get company subscription |
| POST   | `/api/subscriptions`                   | Create subscription      |
| PUT    | `/api/subscriptions/:id`              | Update subscription      |
| DELETE | `/api/subscriptions/:id`              | Delete subscription      |

### Users
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | `/api/users`           | Get all users (admin)    |
| POST   | `/api/users`           | Create user (admin)      |
| PUT    | `/api/users/:id`       | Update user (admin)      |
| DELETE | `/api/users/:id`       | Delete user (admin)      |

### Settings
| Method | Endpoint                       | Description              |
|--------|--------------------------------|--------------------------|
| GET    | `/api/settings`                | Get settings              |
| PUT    | `/api/settings`                | Update settings           |
| PUT    | `/api/settings/delay/:type`    | Update delay settings     |

### Other
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | `/api/upload-sessions`   | Get upload history       |
| GET    | `/api/notifications`      | Get notifications (admin) |
| PUT    | `/api/notifications/:id/read` | Mark as read       |
| PUT    | `/api/notifications/read-all` | Mark all read      |
| DELETE | `/api/notifications/:id`    | Delete notification       |

---

## 🎨 Features

### Core Features
- ✅ **Multi-Portal** — Separate Email and WhatsApp messaging sections
- ✅ **Excel Import** — Drag & drop or click to upload `.xlsx`/`.xls`
- ✅ **Contact Management** — Add, search, delete contacts with full details
- ✅ **Send Tracking** — Track how many times each contact was emailed/messaged
- ✅ **Campaign History** — Full logs per campaign with status per recipient
- ✅ **Personalization** — Use `{name}`, `{email}`, `{phone}` in messages/emails

### SaaS Features
- ✅ **Multi-Company** — Support for multiple companies with isolated data
- ✅ **User Management** — Role-based access control (Admin, User, Viewer)
- ✅ **Subscription Plans** — Free, Basic, Pro, Enterprise tiers
- ✅ **Product Licensing** — Enable/disable Email and WhatsApp modules
- ✅ **Usage Tracking** — Monitor message usage per subscription
- ✅ **Admin Dashboard** — Overview of all companies and subscriptions

### UI/UX
- ✅ **Clean Theme** — Professional, modern white theme
- ✅ **Responsive** — Works on mobile/tablet/desktop
- ✅ **TypeScript** — Full type safety with Enums & Interfaces
- ✅ **JSON Server DB** — All data persisted in `db.json`
- ✅ **Delay Settings** — Configurable delays between messages to avoid rate limiting

---

## 🛠 Tech Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Backend   | Node.js, Express, Multer          |
| Auth      | JWT, bcryptjs, Google OAuth       |
| Email     | Nodemailer                        |
| WhatsApp  | WhatsApp Web.js, Cloud API        |
| Database  | JSON Server (db.json)             |
| Excel     | SheetJS (xlsx)                    |
| Frontend  | React 18, TypeScript              |
| Styling   | Pure CSS (no framework)           |
| Icons     | Lucide React                      |
| Toasts    | React Hot Toast                   |

---

## 📝 Environment Variables

Create a `.env` file in the backend directory:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# WhatsApp Cloud API (optional, for production)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WABA_ID=
WHATSAPP_GRAPH_API_VERSION=v20.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_WEBHOOK_URL=
```

---

## 📝 License

MIT — Free to use and modify.

---

## 🔗 Useful Links

- **Google App Passwords**: https://myaccount.google.com/apppasswords
- **WhatsApp Business API**: https://business.whatsapp.com/
- **Twilio WhatsApp**: https://www.twilio.com/whatsapp