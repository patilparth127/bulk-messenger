# 📨 BulkSend — Bulk Email & WhatsApp Messenger

A full-stack application for sending bulk emails and WhatsApp messages. Features contact management with Excel import, campaign tracking, and site-based organization.

---

## 🏗 Project Structure

```
bulk-messenger/
├── backend/           ← Node.js + Express API
│   ├── server.js      ← Main API server (port 3200)
│   ├── db.json        ← JSON database (auto-managed)
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
│   │       ├── Sites.tsx
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

The application uses static admin credentials for authentication:

**Default Admin Credentials:**
- Email: `admin@gmail.com`
- Password: `admin`

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

The application uses **WhatsApp Web.js** for automated messaging via QR code scanning.

**Features:**
- QR code scanning directly in the web interface
- Automatic connection status monitoring
- Logout functionality with QR code regeneration
- Reply button simulation for interactive messaging
- Configurable delays between messages to avoid rate limiting

**WhatsApp Connection:**
1. Navigate to WhatsApp Portal
2. Scan the QR code displayed in the browser
3. Wait for connection confirmation
4. Start sending messages

---

## 🏢 Site Management

Organize contacts by physical locations or branches:

- **Site CRUD** — Create, read, update, delete sites
- **Site Filtering** — Filter contacts by site in campaigns
- **Site Details** — Name, code, address, city, state, country, phone
- **Unique Codes** — Each site has a unique code for identification

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| POST   | `/api/auth/login`      | User login               |
| POST   | `/api/auth/logout`     | Logout                   |

### Contacts
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | `/api/contacts`        | Get all contacts (supports siteId filter) |
| POST   | `/api/contacts`        | Create contact           |
| DELETE | `/api/contacts/:id`    | Delete contact           |
| DELETE | `/api/contacts`        | Delete all contacts      |
| POST   | `/api/upload-excel`    | Upload Excel file        |
| PATCH  | `/api/contacts/:id/status` | Update contact status |

### Sites
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | `/api/sites`           | Get all sites            |
| POST   | `/api/sites`           | Create site              |
| PUT    | `/api/sites/:id`       | Update site              |
| DELETE | `/api/sites/:id`       | Delete site              |

### Email
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/email-campaigns`      | Get email campaigns      |
| POST   | `/api/email-campaigns/send` | Send email campaign      |
| GET    | `/api/email-logs`           | Get email logs           |

### WhatsApp
| Method | Endpoint                       | Description              |
|--------|--------------------------------|--------------------------|
| GET    | `/api/whatsapp-status`         | Get WhatsApp connection status and QR code |
| POST   | `/api/whatsapp-reset`          | Reset WhatsApp client     |
| POST   | `/api/whatsapp-logout`         | Logout and regenerate QR code |
| GET    | `/api/whatsapp-campaigns`      | Get WA campaigns         |
| POST   | `/api/whatsapp-campaigns/send` | Send WA campaign         |
| GET    | `/api/whatsapp-logs`           | Get WA logs              |

### Settings
| Method | Endpoint                       | Description              |
|--------|--------------------------------|--------------------------|
| GET    | `/api/settings`                | Get settings              |
| PUT    | `/api/settings`                | Update settings           |
| PUT    | `/api/settings/delay/:type`    | Update delay settings (whatsapp/email) |

### Other
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | `/api/health`           | Health check             |
| GET    | `/api/upload-sessions`   | Get upload history       |

---

## 🎨 Features

### Core Features
- ✅ **Multi-Portal** — Separate Email and WhatsApp messaging sections
- ✅ **Excel Import** — Drag & drop or click to upload `.xlsx`/`.xls`
- ✅ **Contact Management** — Add, search, delete contacts with full details
- ✅ **Site Organization** — Organize contacts by physical locations
- ✅ **Send Tracking** — Track how many times each contact was emailed/messaged
- ✅ **Campaign History** — Full logs per campaign with status per recipient
- ✅ **Personalization** — Use `{name}` in messages/emails
- ✅ **Reply Buttons** — Simulated reply options for WhatsApp messages
- ✅ **Delay Settings** — Configurable delays between messages to avoid rate limiting

### WhatsApp Features
- ✅ **QR Code Scanning** — Scan QR code directly in web interface
- ✅ **Connection Status** — Real-time WhatsApp connection monitoring
- ✅ **Logout Functionality** — Logout and regenerate QR code for reconnection
- ✅ **Reply Options** — Add interactive reply buttons to messages
- ✅ **Site Filtering** — Filter contacts by site for targeted campaigns

### Email Features
- ✅ **SMTP Configuration** — Custom SMTP settings for email sending
- ✅ **Gmail Support** — Pre-configured Gmail SMTP settings
- ✅ **Site Filtering** — Filter contacts by site for targeted campaigns
- ✅ **Delay Configuration** — Configurable delays between emails

### UI/UX
- ✅ **Clean Theme** — Professional, modern white theme
- ✅ **Responsive** — Works on mobile/tablet/desktop
- ✅ **TypeScript** — Full type safety with Enums & Interfaces
- ✅ **JSON Database** — All data persisted in `db.json`
- ✅ **Toast Notifications** — Real-time feedback for actions
- ✅ **Dashboard** — Overview of contacts and campaigns

---

## 🛠 Tech Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Backend   | Node.js, Express, Multer          |
| Email     | Nodemailer                        |
| WhatsApp  | WhatsApp Web.js, qrcode          |
| Database  | JSON (db.json)                    |
| Excel     | SheetJS (xlsx)                    |
| Frontend  | React 18, TypeScript              |
| Styling   | Pure CSS (no framework)           |
| Icons     | Lucide React                      |
| Toasts    | React Hot Toast                   |
| HTTP      | Axios                             |

---

## 📝 Database Schema

The application uses a JSON database (`db.json`) with the following structure:

```json
{
  "contacts": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "gender": "male",
      "status": "active",
      "siteId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "emailSentCount": 0,
      "whatsappSentCount": 0,
      "lastEmailSentAt": null,
      "lastWhatsappSentAt": null
    }
  ],
  "sites": [
    {
      "id": "uuid",
      "name": "Main Office",
      "code": "MAIN",
      "address": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "phone": "9876543210",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "email_campaigns": [
    {
      "id": "uuid",
      "subject": "Campaign Subject",
      "body": "Email body",
      "fromEmail": "sender@example.com",
      "smtpHost": "smtp.gmail.com",
      "smtpPort": 587,
      "totalTargets": 100,
      "sentCount": 95,
      "failedCount": 5,
      "status": "sent",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T00:05:00.000Z",
      "logs": []
    }
  ],
  "email_logs": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "contactId": "uuid",
      "contactName": "John Doe",
      "contactEmail": "john@example.com",
      "status": "sent",
      "sentAt": "2024-01-01T00:01:00.000Z",
      "error": null
    }
  ],
  "whatsapp_campaigns": [
    {
      "id": "uuid",
      "message": "WhatsApp message",
      "totalTargets": 100,
      "sentCount": 95,
      "failedCount": 5,
      "status": "sent",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T00:10:00.000Z",
      "logs": [],
      "hasReplyButtons": false,
      "replyOptions": []
    }
  ],
  "whatsapp_logs": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "contactId": "uuid",
      "contactName": "John Doe",
      "contactPhone": "9876543210",
      "message": "WhatsApp message",
      "status": "sent",
      "sentAt": "2024-01-01T00:01:00.000Z",
      "error": null
    }
  ],
  "settings": [
    {
      "id": "uuid",
      "whatsappDelay": {
        "id": "uuid",
        "type": "whatsapp",
        "delayMs": 2000,
        "randomDelayMin": 1000,
        "randomDelayMax": 3000,
        "batchSize": 10,
        "enabled": false,
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "emailDelay": {
        "id": "uuid",
        "type": "email",
        "delayMs": 1000,
        "randomDelayMin": 500,
        "randomDelayMax": 2000,
        "batchSize": 50,
        "enabled": false,
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "upload_sessions": [
    {
      "id": "uuid",
      "fileName": "contacts.xlsx",
      "totalRows": 100,
      "importedCount": 95,
      "errorCount": 5,
      "errors": [
        {
          "row": 10,
          "reason": "Missing Name or Email"
        }
      ],
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 📝 License

MIT — Free to use and modify.

---

## 🔗 Useful Links

- **Google App Passwords**: https://myaccount.google.com/apppasswords
- **WhatsApp Web.js**: https://github.com/pedroslopez/whatsapp-web.js
- **Nodemailer**: https://nodemailer.com/
- **SheetJS**: https://sheetjs.com/