import 'server-only';
import { sendEmail } from './email';
import { sendSms } from './sms';
import { messages, MessageKey } from './messages';

export interface NotifyTarget {
  locale: 'ka' | 'en' | 'ru';
  preferredContact: 'EMAIL' | 'SMS';
  email: string;
  phone: string;
  orderNumber: string;
  trackingUrl: string;
}

/** The ONLY customer emails/SMS we send: payment approval and hand-over to courier. */
const ENABLED: MessageKey[] = ['paymentApproved', 'shippedToCourier'];

/** Sends a localized notification on the customer's preferred channel. Never throws. */
export async function notifyCustomer(target: NotifyTarget, key: MessageKey, vars: Record<string, string> = {}) {
  if (!ENABLED.includes(key)) return;
  const m = messages[target.locale][key];
  const values: Record<string, string> = { order: target.orderNumber, link: target.trackingUrl, ...vars };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');
  const subject = fill(m.subject);
  const body = fill(m.body);
  try {
    if (target.preferredContact === 'SMS') {
      await sendSms(target.phone, `${subject}. ${body}`);
    } else {
      await sendEmail(target.email, subject, body);
    }
  } catch (err) {
    console.error('[notify] failed to send', key, err);
  }
}

/** Notifies the workshop that a payment screenshot is waiting for review (optional). */
export async function notifyStaffProofSubmitted(orderNumber: string) {
  const to = process.env.STAFF_NOTIFY_EMAIL;
  if (!to) return;
  try {
    await sendEmail(
      to,
      `Payment to review: ${orderNumber}`,
      `A payment screenshot was uploaded for ${orderNumber}. Open the admin panel to review it.`
    );
  } catch (err) {
    console.error('[notify] staff email failed', err);
  }
}
