// ─── Enums ────────────────────────────────────────────────────────────────────

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

export enum SendStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
}

export enum PortalType {
  EMAIL = "email",
  WHATSAPP = "whatsapp",
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  createdAt: string;
  emailSentCount: number;
  whatsappSentCount: number;
  lastEmailSentAt: string | null;
  lastWhatsappSentAt: string | null;
}

export interface EmailCampaign {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  status: SendStatus;
  createdAt: string;
  completedAt: string | null;
  logs: EmailLog[];
}

export interface EmailLog {
  id: string;
  campaignId: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  status: SendStatus;
  sentAt: string | null;
  error: string | null;
}

export interface WhatsAppCampaign {
  id: string;
  message: string;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  status: SendStatus;
  createdAt: string;
  completedAt: string | null;
  logs: WhatsAppLog[];
}

export interface WhatsAppLog {
  id: string;
  campaignId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  message: string;
  status: SendStatus;
  sentAt: string | null;
  error: string | null;
}

export interface UploadSession {
  id: string;
  fileName: string;
  totalRows: number;
  importedCount: number;
  errorCount: number;
  errors: { row: number; reason: string }[];
  uploadedAt: string;
}

export interface SendEmailPayload {
  subject: string;
  body: string;
  fromEmail: string;
  fromPassword: string;
  smtpHost: string;
  smtpPort: number;
  contactIds: string[];
}

export interface SendWhatsAppPayload {
  message: string;
  contactIds: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SmsCampaign {
  id: string;
  template: string;
  fromNumber: string;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  status: SendStatus;
  createdAt: string;
  completedAt: string | null;
  logs: SmsLog[];
}

export interface SmsLog {
  id: string;
  campaignId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  message: string;
  status: SendStatus;
  sentAt: string | null;
  sid: string | null;
  error: string | null;
}

export interface SendSmsPayload {
  template: string;
  contactIds: string[];
}