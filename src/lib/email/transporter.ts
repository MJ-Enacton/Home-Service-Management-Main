import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cached: Transporter | null = null;

/** Gmail SMTP transporter (server-only — never import from client components). */
export function getTransporter(): Transporter {
  if (cached) return cached;
  const user = process.env.GMAIL_USER;
  // Google displays app passwords as "xxxx xxxx xxxx xxxx" — SMTP auth
  // wants them without spaces, so strip all whitespace defensively.
  const pass = (process.env.GMAIL_APP_PASSWORD ?? process.env.GMAIL_PASSWORD ?? "").replace(
    /\s+/g,
    "",
  );
  if (!user || !pass) {
    throw new Error(
      "Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD (or GMAIL_PASSWORD) in .env.",
    );
  }
  cached = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return cached;
}

export function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ??
    (process.env.GMAIL_USER
      ? `HandyHub <${process.env.GMAIL_USER}>`
      : "HandyHub <no-reply@handyhub.local>")
  );
}
