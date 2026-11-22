import 'server-only';
import { Resend } from 'resend';

/** Uses Resend when RESEND_API_KEY is set; otherwise logs the email (dev). */
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] to=${to}\n  subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}`);
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Geo3D <onboarding@resend.dev>',
    to,
    subject,
    text,
  });
  if (error) throw new Error(error.message);
}
