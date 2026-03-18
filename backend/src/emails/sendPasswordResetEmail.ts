import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a branded password reset email with a secure one-time link.
 */
export const sendPasswordResetEmail = async (
  toEmail: string,
  resetUrl: string
) => {
  const result = await resend.emails.send({
    from: 'WordSage <onboarding@resend.dev>',
    to: [toEmail],
    subject: 'Reset Your WordSage Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td style="padding: 40px 20px;">
              <!-- Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 14px; line-height: 56px; margin-bottom: 16px;">
                      <span style="color: #ffffff; font-size: 24px; font-weight: bold;">W</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">
                      Password Reset Request
                    </h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 0 40px 20px;">
                    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                      We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong>15 minutes</strong>.
                    </p>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                      If you didn't request this, you can safely ignore this email — your password will remain unchanged.
                    </p>
                  </td>
                </tr>
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 0 40px 30px; text-align: center;">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
                <!-- Fallback URL -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: #6366f1; word-break: break-all;">
                      ${resetUrl}
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 30px; border-top: 1px solid #f3f4f6;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
                      This is an automated email from WordSage. Please do not reply.<br/>
                      &copy; ${new Date().getFullYear()} WordSage. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  return result;
};
