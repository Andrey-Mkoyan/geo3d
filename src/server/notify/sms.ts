import 'server-only';

/**
 * SMS provider placeholder. A Georgian provider (e.g. smsoffice.ge) or Twilio will be plugged in here later.
 * For now messages are logged only.
 */
export async function sendSms(to: string, text: string) {
  console.log(`[sms:dev] to=${to} text=${text}`);
}
