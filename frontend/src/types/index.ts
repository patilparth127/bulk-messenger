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
}

export interface SendWhatsAppPayload {
  message: string;
  contactIds: string[];
  hasReplyButtons?: boolean;
  replyOptions?: string[];
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

// ─── User & Authentication ─────────────────────────────────────────
export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  VIEWER = "viewer",
}

export enum AuthMethod {
  GOOGLE = "google",
  USERNAME_PASSWORD = "username_password",
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  picture?: string;
  googleId?: string;
  role: UserRole;
  authMethod: AuthMethod;
  companyId: string | null;
  companyCode: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface LoginCredentials {
  username?: string;
  password?: string;
  email?: string;
  googleToken?: string;
  companyCode?: string;
  authMethod: AuthMethod;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  email: string;
  name: string;
  role: UserRole;
}

// ─── Settings ───────────────────────────────────────────────────────
export interface DelaySettings {
  id: string;
  type: "whatsapp" | "email" | "sms";
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
  smsDelay: DelaySettings;
  updatedAt: string;
}

// ─── SaaS Multi-Company Architecture ────────────────────────────────────

export enum SubscriptionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  SUSPENDED = "suspended",
  TRIAL = "trial",
  PENDING = "pending",
}

export enum SubscriptionPlan {
  FREE = "free",
  BASIC_MONTHLY = "basic_monthly",
  BASIC_YEARLY = "basic_yearly",
  PRO_MONTHLY = "pro_monthly",
  PRO_YEARLY = "pro_yearly",
  ENTERPRISE_MONTHLY = "enterprise_monthly",
  ENTERPRISE_YEARLY = "enterprise_yearly",
}

export enum ProductType {
  SMS = "sms",
  EMAIL = "email",
  WHATSAPP = "whatsapp",
}

export enum MessageType {
  INTERACTIVE_TEMPLATE = "interactive_template",
  MEDIA_MESSAGE = "media_message",
}

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  DOCUMENT = "document",
  AUDIO = "audio",
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
  contactEmail: string;
  contactPhone: string;
  companyCode: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  companyId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
  products: ProductLicense[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductLicense {
  productType: ProductType;
  isEnabled: boolean;
  usageLimit: number;
  currentUsage: number;
  resetDate: string;
}

export interface Contact {
  id: string;
  companyId?: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  status: ContactStatus;
  createdAt: string;
  emailSentCount: number;
  whatsappSentCount: number;
  smsSentCount: number;
  lastEmailSentAt: string | null;
  lastWhatsappSentAt: string | null;
  lastSmsSentAt: string | null;
}

export interface EmailCampaign {
  id: string;
  companyId?: string;
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

export interface WhatsAppCampaign {
  id: string;
  companyId?: string;
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
  messageType?: MessageType;
  templateName?: string;
  templateVariables?: Record<string, string>;
  media?: {
    type: MediaType;
    url: string;
    mediaId?: string;
    caption?: string;
  };
  buttons?: WhatsAppButton[];
  ctaUrl?: string;
}

export interface WhatsAppButton {
  type: "QUICK_REPLY" | "CTA_URL";
  text: string;
  payload?: string;
  url?: string;
}

export interface SmsCampaign {
  id: string;
  companyId?: string;
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

// ─── WhatsApp Cloud API Types ───────────────────────────────────────────────

export interface WhatsAppMessagePayload {
  to: string;
  messageType: MessageType;
  templateName?: string;
  templateVariables?: Record<string, string>;
  media?: {
    type: MediaType;
    url: string;
    mediaId?: string;
    caption?: string;
  };
  buttons?: WhatsAppButton[];
  ctaUrl?: string;
}

export interface WhatsAppWebhookEvent {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppMessageStatus[];
}

export interface WhatsAppContact {
  wa_id: string;
  input: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    nlm_reply_response?: {
      id: string;
      title: string;
      description?: string;
    };
    button_reply?: {
      title: string;
      payload: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

export interface WhatsAppMessageStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp: number;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    category: string;
    pricing_model: string;
  };
}

export interface SendMessageRequest {
  companyId: string;
  campaignId?: string;
  messageType: MessageType;
  recipients: string[];
  templateName?: string;
  templateVariables?: Record<string, string>;
  media?: {
    type: MediaType;
    file?: any;
    url?: string;
    mediaId?: string;
    caption?: string;
  };
  buttons?: WhatsAppButton[];
  ctaUrl?: string;
}