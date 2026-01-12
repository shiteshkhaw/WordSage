// backend/src/emails/sendInviteEmail.ts

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendTeamInviteEmail = async (
  toEmail: string,
  invitedBy: string,
  teamName: string,
  acceptUrl: string,
  rejectUrl: string
) => {
  const result = await resend.emails.send({
    from: "WordSage <noreply@yourdomain.com>",
    to: [toEmail],
    subject: `[Action Required] You're invited to join "${teamName}" on WordSage`,
    html: `
      <h2>Team Invitation</h2>
      <p>
        <b>${invitedBy}</b> has invited you to join the team <b>${teamName}</b> on WordSage.<br/>
        <br/>
        <a href="${acceptUrl}" style="color: white; background: #6366f1; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Accept Invitation</a>
        &nbsp;&nbsp;
        <a href="${rejectUrl}" style="color: #fff; background: #ef4444; padding: 12px 18px; border-radius: 6px; text-decoration: none;">Decline</a>
        <br/><br/>
        If you've received this email in error, please ignore it.
      </p>
    `,
  });
  return result;
};
