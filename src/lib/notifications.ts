// Stubbed notification sending functions
// TODO: Replace with actual implementations using Resend/SendGrid for email and Twilio for SMS

export interface EmailParams {
  to: string;
  subject: string;
  body: string;
}

export interface SMSParams {
  to: string;
  message: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email notification
 * TODO: Implement with Resend or SendGrid
 */
export async function sendEmail(params: EmailParams): Promise<NotificationResult> {
  // Stubbed implementation
  console.log("[STUB] Sending email:", {
    to: params.to,
    subject: params.subject,
    body: params.body.substring(0, 100) + "...",
  });

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return success for testing
  return {
    success: true,
    messageId: `email_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  };
}

/**
 * Send an SMS notification
 * TODO: Implement with Twilio
 */
export async function sendSMS(params: SMSParams): Promise<NotificationResult> {
  // Stubbed implementation
  console.log("[STUB] Sending SMS:", {
    to: params.to,
    message: params.message.substring(0, 100) + "...",
  });

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return success for testing
  return {
    success: true,
    messageId: `sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  };
}

/**
 * Send a notification blast to a list of recipients
 * Handles both email and SMS based on channel and user preferences
 */
export async function sendNotificationBlast(params: {
  recipients: Array<{
    email?: string | null;
    phone?: string | null;
    emailEnabled: boolean;
    smsEnabled: boolean;
  }>;
  title: string;
  body: string;
  channel: "email" | "sms" | "both";
}): Promise<{
  emailsSent: number;
  smsSent: number;
  errors: string[];
}> {
  const { recipients, title, body, channel } = params;
  let emailsSent = 0;
  let smsSent = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    // Send email if channel allows and recipient has email enabled
    if ((channel === "email" || channel === "both") && recipient.emailEnabled && recipient.email) {
      const result = await sendEmail({
        to: recipient.email,
        subject: title,
        body,
      });
      if (result.success) {
        emailsSent++;
      } else if (result.error) {
        errors.push(`Email to ${recipient.email}: ${result.error}`);
      }
    }

    // Send SMS if channel allows and recipient has SMS enabled
    if ((channel === "sms" || channel === "both") && recipient.smsEnabled && recipient.phone) {
      const result = await sendSMS({
        to: recipient.phone,
        message: `${title}\n\n${body}`,
      });
      if (result.success) {
        smsSent++;
      } else if (result.error) {
        errors.push(`SMS to ${recipient.phone}: ${result.error}`);
      }
    }
  }

  return { emailsSent, smsSent, errors };
}

