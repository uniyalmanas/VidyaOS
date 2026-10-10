/**
 * G3 — automated message templates (WhatsApp / SMS / email).
 *
 * Pure module: template registry + compose helpers, no Firebase imports, so the
 * node test-runner can exercise every template directly. Body builders receive
 * variables + org context and return plain text with WhatsApp-style markup;
 * `stripWhatsappMarkup` converts that to plain text for SMS/email.
 */
import { MessageChannel, MessageTemplateId, OutboundMessage } from '../types';

export interface MessageTemplateVariables {
  studentName?: string;
  parentName?: string;
  className?: string;
  subject?: string;
  amount?: string;
  dueDate?: string;
  date?: string;
  marks?: string;
  link?: string;
  message?: string;
}

export interface MessageTemplateContext {
  orgName: string;
  upiId?: string;
}

export interface MessageTemplate {
  id: MessageTemplateId;
  label: string;
  description: string;
  channels: MessageChannel[];
  /** WhatsApp pricing category — utility ≈ ₹0.115, marketing ≈ ₹0.86/msg (2026 India). */
  whatsappCategory?: 'utility' | 'marketing';
  emailSubject?: (v: MessageTemplateVariables, ctx: MessageTemplateContext) => string;
  build: (v: MessageTemplateVariables, ctx: MessageTemplateContext) => string;
}

function todayHuman(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'absent',
    label: 'Absent / Late alert',
    description: 'Notify a parent that their ward missed class',
    channels: ['whatsapp', 'sms'],
    whatsappCategory: 'utility',
    build: ({ studentName, className, date }, { orgName }) =>
      `Namaste Ji,\n\nThis is to notify you that ${studentName || 'your ward'} was marked *ABSENT*${
        className ? ` in ${className}` : ''
      } on ${date || todayHuman()} at *${orgName}*.\n\n` +
      `Regular attendance is critical for academic consistency. Please ensure they attend upcoming lectures.\n— Office Desk, ${orgName}`
  },
  {
    id: 'feeDue',
    label: 'Fee due reminder',
    description: 'Gentle reminder about a pending installment',
    channels: ['whatsapp', 'sms', 'email'],
    whatsappCategory: 'utility',
    emailSubject: () => 'Fee installment due — please pay',
    build: ({ parentName, amount, dueDate }, { orgName, upiId }) =>
      `Namaste Ji${parentName ? `, ${parentName}` : ''},\n\n` +
      `This is a gentle reminder from *${orgName}*: fee installment${amount ? ` of *₹${amount}*` : ''} is due${
        dueDate ? ` by *${dueDate}*` : ''
      }.\n\n` +
      `${upiId ? `• Pay via UPI: ${upiId}\n` : ''}Kindly settle the due amount or reply here with a payment screenshot.\n— Accounts Desk, ${orgName}`
  },
  {
    id: 'receipt',
    label: 'Payment receipt',
    description: 'Confirm a fee payment was received',
    channels: ['whatsapp', 'sms', 'email'],
    whatsappCategory: 'utility',
    emailSubject: ({ studentName }) => `Payment receipt${studentName ? ` — ${studentName}` : ''}`,
    build: ({ parentName, studentName, amount }, { orgName }) =>
      `Namaste Ji${parentName ? `, ${parentName}` : ''},\n\n` +
      `Payment received. Thank you!\n\n• Center: ${orgName}\n• Student: ${studentName || '—'}\n• Amount: ₹${amount || '—'}\n\n` +
      `This serves as your payment receipt.\n— Accounts Desk, ${orgName}`
  },
  {
    id: 'results',
    label: 'Results & rank',
    description: 'Share an exam/test result with the parent',
    channels: ['whatsapp', 'sms', 'email'],
    whatsappCategory: 'utility',
    emailSubject: ({ studentName }) => `Test results${studentName ? ` — ${studentName}` : ''}`,
    build: ({ studentName, className, subject, marks, link }, { orgName }) =>
      `Namaste Ji,\n\nAcademic test result${subject ? ` for *${subject}*` : ''}${
        studentName ? ` of *${studentName}*` : ''
      }${className ? ` (${className})` : ''} is now available.\n\n` +
      `${marks ? `• Marks: ${marks}\n` : ''}Please log in to your Parent Portal for the detailed marks analysis and rank.` +
      `${link ? `\n${link}` : ''}\n— Academic Director, ${orgName}`
  },
  {
    id: 'ptm',
    label: 'Parent-Teacher Meet',
    description: 'Invite a parent to a scheduled PTM',
    channels: ['whatsapp', 'sms'],
    whatsappCategory: 'utility',
    build: ({ parentName, studentName, date }, { orgName }) =>
      `Namaste Ji${parentName ? `, ${parentName}` : ''},\n\n` +
      `Parent-Teacher Meeting at *${orgName}*${date ? ` on ${date}` : ''}${
        studentName ? ` regarding *${studentName}*` : ''
      }. Please plan to attend.\n\n— Office Desk, ${orgName}`
  },
  {
    id: 'announcement',
    label: 'General announcement',
    description: 'A center-wide notice to parents',
    channels: ['whatsapp', 'sms', 'email'],
    whatsappCategory: 'marketing',
    emailSubject: (_v, { orgName }) => `Announcement — ${orgName}`,
    build: ({ message }, { orgName }) =>
      `Dear Parent,\n\n${message || ''}\n\n— ${orgName}`
  }
];

export function getMessageTemplate(id: MessageTemplateId): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find(t => t.id === id);
}

/**
 * Channel metadata: label, cloud provider, base credit cost.
 *
 * Credit weighting reflects real COGS (2026 India): 1 credit ≈ ₹0.70 sell
 * (Cloud Messaging ₹699 for 1,000 credits).
 *  - email  : marginal cost ~₹0.02 → 1 credit (big margin)
 *  - sms    : MSG91 bulk ₹0.18–0.25 → 1 credit (healthy margin)
 *  - whatsapp: Meta utility ₹0.115 / marketing ₹0.86. Base 2 credits covers
 *    utility + amortised platform fee; marketing templates cost 4 credits via
 *    `estimateCreditCost` when the template declares `whatsappCategory`.
 */
export const CHANNEL_META: Record<
  MessageChannel,
  { label: string; provider: OutboundMessage['provider']; creditCost: number }
> = {
  whatsapp: { label: 'WhatsApp', provider: 'meta-whatsapp', creditCost: 2 },
  sms: { label: 'SMS', provider: 'msg91', creditCost: 1 },
  email: { label: 'Email', provider: 'email', creditCost: 1 }
};

/** Convert WhatsApp-style *bold* / _italics_ markup to plain text (SMS / email). */
export function stripWhatsappMarkup(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1');
}

export interface ComposedMessage {
  template: MessageTemplate;
  subject?: string;
  body: string;
}

/**
 * Compose a template for a specific channel. SMS/email get plain text; email
 * gets a subject when the template defines one.
 */
export function composeMessage(
  templateId: MessageTemplateId,
  vars: MessageTemplateVariables,
  ctx: MessageTemplateContext,
  channel: MessageChannel
): ComposedMessage {
  const template = getMessageTemplate(templateId) || MESSAGE_TEMPLATES[0];
  const raw = template.build(vars, ctx);
  const body = channel === 'whatsapp' ? raw : stripWhatsappMarkup(raw);
  const subject = channel === 'email' && template.emailSubject
    ? template.emailSubject(vars, ctx)
    : undefined;
  return { template, subject, body };
}