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

export enum ContactStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DUMP = "dump",
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  status: ContactStatus;
  siteId: string | null;
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
  hasReplyButtons?: boolean;
  replyOptions?: string[];
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
  siteId?: string;
}

export interface SendWhatsAppPayload {
  message: string;
  contactIds: string[];
  hasReplyButtons?: boolean;
  replyOptions?: string[];
  siteId?: string;
}

export interface Site {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}


// ─── User & Authentication ─────────────────────────────────────────
export interface User {
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// ─── Settings ───────────────────────────────────────────────────────
export interface DelaySettings {
  id: string;
  type: "whatsapp" | "email";
  delayMs: number;
  randomDelayMin: number;
  randomDelayMax: number;
  batchSize: number;
  enabled: boolean;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  userId?: string;
  whatsappDelay: DelaySettings;
  emailDelay: DelaySettings;
  updatedAt: string;
}

// ─── WhatsApp Interactive Templates ────────────────────────────────
export type TemplateType = "poll" | "list" | "cta";

export interface PollOption {
  id: string;
  text: string;
}

export interface ListSection {
  title: string;
  rows: {
    id: string;
    title: string;
    description?: string;
  }[];
}

export interface CTA {
  text: string;
  url: string;
}

export interface WhatsAppTemplate {
  id: string;
  type: TemplateType;
  name: string;
  header?: string;
  body: string;
  footer?: string;
  pollOptions?: PollOption[];
  listSections?: ListSection[];
  buttonText?: string;
  cta?: CTA;
  createdAt: string;
  updatedAt?: string;
}

export interface SendInteractivePayload {
  templateId: string;
  contactIds: string[];
  siteId?: string;
}

export interface InteractiveLog {
  id: string;
  campaignId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  status: SendStatus;
  sentAt: string | null;
  error: string | null;
}

export interface InteractiveResponse {
  id: string;
  campaignId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  selectedOption: string;
  responseAt: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  totalSent: number;
  delivered: number;
  failed: number;
  responseCount: number;
  engagementRate: number;
}
