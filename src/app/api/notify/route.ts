import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    const { email, taskTitle, reason } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('[resend] Missing RESEND_API_KEY env variable. Simulating email send.')
      return NextResponse.json({ success: true, simulated: true })
    }

    const resend = new Resend(apiKey)

    const data = await resend.emails.send({
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
            Sent automatically by Clutch PWA.
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[resend] Failed to send email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
