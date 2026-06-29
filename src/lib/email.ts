import { Resend } from 'resend'

// Shared Resend sender used by both the client-triggered /api/notify route and
// the server-side /api/cron job, so the alert email stays identical in both paths.
// Fails soft: with no RESEND_API_KEY it simulates a send (returns true) so local
// dev and demos never error.
export async function sendOverdueAlert(email: string, taskTitle: string, reason: string): Promise<boolean> {
  if (!email) return false
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[resend] Missing RESEND_API_KEY — simulating email send.')
    return true
  }
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: 'Clutch Accountability <onboarding@resend.dev>',
      to: email,
      subject: `⚠️ CLUTCH Alert: ${taskTitle} is overdue!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #08070f; color: #f3f5f4; border-radius: 12px; border: 1px solid #333;">
          <h2 style="color: #5A63E6; margin-top: 0;">Clutch Accountability Nudge</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Your task <strong>"${taskTitle}"</strong> is currently marked as overdue (${reason}).
          </p>
          <p style="font-size: 14px; color: #a0a0a0; line-height: 1.6;">
            Clutch is watching. Don't let your deadlines slip. Open your dashboard to submit proof of work or re-evaluate your strategy.
          </p>
          <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 15px; font-size: 12px; color: #777;">
            Sent automatically by Clutch — server-side proactive monitoring.
          </div>
        </div>
      `,
    })
    return true
  } catch (error) {
    console.error('[resend] Failed to send email:', error)
    return false
  }
}
