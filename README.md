# 📨 BulkSend — Bulk Email & WhatsApp Messenger

A full-stack application to send bulk emails and WhatsApp messages to contacts imported from Excel files.

---

## 🏗 Project Structure

```
bulk-messenger/
├── backend/           ← Node.js + Express API
│   ├── server.js      ← Main API server (port 3000)
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
│   │       └── WhatsAppPortal.tsx
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
# API runs on http://localhost:3000
```

### 3. Start the frontend

```bash
cd frontend
npm start
# UI runs on http://localhost:3001 (CRA default after 3000 is taken)
```

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

## 💬 WhatsApp Notes

WhatsApp does **not** allow direct API access without the official WhatsApp Business API. This demo **simulates** sends (95% success rate). For real production use, integrate:

- **Twilio** — https://www.twilio.com/whatsapp
- **Official WhatsApp Business API** — https://business.whatsapp.com/

---

## 🔌 API Endpoints

| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| GET    | `/api/contacts`                 | Get all contacts               |
| POST   | `/api/contacts`                 | Create single contact          |
| DELETE | `/api/contacts/:id`             | Delete contact                 |
| DELETE | `/api/contacts`                 | Delete all contacts            |
| POST   | `/api/upload-excel`             | Upload Excel file              |
| POST   | `/api/email-campaigns/send`     | Send email campaign            |
| GET    | `/api/email-campaigns`          | Get all email campaigns        |
| GET    | `/api/email-logs`               | Get all email send logs        |
| POST   | `/api/whatsapp-campaigns/send`  | Send WhatsApp campaign         |
| GET    | `/api/whatsapp-campaigns`       | Get all WhatsApp campaigns     |
| GET    | `/api/whatsapp-logs`            | Get all WA send logs           |
| GET    | `/api/upload-sessions`          | Get upload history             |
| GET    | `/api/health`                   | Health check                   |

---

## 🎨 Features

- ✅ **Two Portals** — Separate Email and WhatsApp sections
- ✅ **Excel Import** — Drag & drop or click to upload `.xlsx`/`.xls`
- ✅ **Contact Management** — Add, search, delete contacts with full details
- ✅ **Send Tracking** — Track how many times each contact was emailed/messaged
- ✅ **Campaign History** — Full logs per campaign with status per recipient
- ✅ **Personalization** — Use `{name}` in messages/emails
- ✅ **White Theme** — Clean, professional UI
- ✅ **Responsive** — Works on mobile/tablet/desktop
- ✅ **TypeScript** — Full type safety with Enums & Interfaces
- ✅ **JSON Server DB** — All data persisted in `db.json`

---

## 🛠 Tech Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Backend   | Node.js, Express, Multer          |
| Email     | Nodemailer                        |
| Database  | JSON Server (db.json)             |
| Excel     | SheetJS (xlsx)                    |
| Frontend  | React 18, TypeScript              |
| Styling   | Pure CSS (no framework)           |
| Icons     | Lucide React                      |
| Toasts    | React Hot Toast                   |

---

## 📝 License

MIT — Free to use and modify.
