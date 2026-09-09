"use server";

import { getFromAddress, getTransporter } from "./transporter";
import type { MailTemplate } from "./templates";

export interface SendMailInput extends MailTemplate {
  to: string;
}

/**
 * Best-effort send. Never throws — callers (signup, booking) must not fail
 * just because Gmail hiccuped. Fire-and-forget with `void`.
 */
export async function sendMail(
  input: SendMailInput,
  otp?: string,
): Promise<boolean> {
  try {
    // Concise one-liner: the full HTML template used to be dumped here,
    // burying the OTP in pages of terminal noise.
    if (otp) console.log(`[email] sending OTP to ${input.to}, OTP : ${otp}`);
    await getTransporter().sendMail({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}
