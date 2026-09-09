function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f6f4;padding:24px;color:#222"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #eee"><h1 style="font-size:20px;margin:0 0 12px">HandyHub</h1><h2 style="font-size:16px;margin:0 0 12px">${escapeHtml(title)}</h2>${body}<p style="font-size:12px;color:#888;margin-top:24px">© HandyHub · Tech City, CA</p></div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-size:14px">${escapeHtml(label)}</a></p>`;
}

export interface MailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function otpTemplate(otp: string): MailTemplate {
  return {
    subject: `Your HandyHub verification code: ${otp}`,
    html: shell(
      "Verify your email",
      `<p>Your verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${escapeHtml(otp)}</p><p style="font-size:13px;color:#666">It expires in 5 minutes. If you didn't request this, ignore this email.</p>`,
    ),
    text: `Your HandyHub verification code is ${otp}. It expires in 5 minutes.`,
  };
}

export function resetLinkTemplate(url: string): MailTemplate {
  return {
    subject: "Reset your HandyHub password",
    html: shell(
      "Reset your password",
      `<p>Click the link below to set a new password. It expires in 1 hour.</p>${button(url, "Reset password")}<p style="font-size:13px;color:#666">If you didn't request this, ignore this email.</p>`,
    ),
    text: `Reset your HandyHub password: ${url} (expires in 1 hour).`,
  };
}

export function welcomeCustomerTemplate(name: string, appUrl: string): MailTemplate {
  const safe = name || "there";
  return {
    subject: "Thanks for joining HandyHub as a customer",
    html: shell(
      `Welcome, ${escapeHtml(safe)}!`,
      `<p>Thanks for joining HandyHub as a <strong>customer</strong>. Book trusted local pros for plumbing, cleaning, electrical and more — real pros, real reviews, on your schedule.</p>${button(`${appUrl}/services`, "Explore services")}`,
    ),
    text: `Thanks for joining HandyHub as a customer, ${safe}! Explore services at ${appUrl}/services`,
  };
}

export function welcomeProviderTemplate(name: string, appUrl: string): MailTemplate {
  const safe = name || "there";
  return {
    subject: "Welcome to HandyHub — let's get your services live",
    html: shell(
      `Welcome aboard, ${escapeHtml(safe)}!`,
      `<p>Thanks for registering as a <strong>provider</strong> on HandyHub. Complete your profile, add your first service and set your availability to start receiving bookings.</p>${button(`${appUrl}/provider/my-services/new`, "Add your first service")}`,
    ),
    text: `Welcome to HandyHub as a provider, ${safe}! Add your first service at ${appUrl}/provider/my-services/new`,
  };
}

export interface ReceiptDetails {
  customerName: string;
  bookingNumber: string;
  serviceTitle: string;
  providerName: string;
  amount: string;
  schedule: string;
}

export function paymentReceiptTemplate(d: ReceiptDetails): MailTemplate {
  return {
    subject: `Payment received — booking ${d.bookingNumber}`,
    html: shell(
      "Thanks for your payment!",
      `<p>Hi ${escapeHtml(d.customerName)},</p><p>Thanks for taking our services! Your payment of <strong>${escapeHtml(d.amount)}</strong> for <strong>${escapeHtml(d.serviceTitle)}</strong> (booking <strong>${escapeHtml(d.bookingNumber)}</strong>) was received.</p><p style="font-size:13px;color:#555">Provider: ${escapeHtml(d.providerName)} · Scheduled: ${escapeHtml(d.schedule)}</p>`,
    ),
    text: `Thanks for taking our services! Payment of ${d.amount} for "${d.serviceTitle}" (booking ${d.bookingNumber}) received. Provider: ${d.providerName}. Scheduled: ${d.schedule}.`,
  };
}

export interface CompletionDetails {
  customerName: string;
  bookingNumber: string;
  serviceTitle: string;
  providerName: string;
  reviewUrl: string;
}

export function bookingCompletedTemplate(d: CompletionDetails): MailTemplate {
  return {
    subject: `How was your service? Booking ${d.bookingNumber}`,
    html: shell(
      "Thanks for choosing HandyHub!",
      `<p>Hi ${escapeHtml(d.customerName)},</p><p>Your booking <strong>${escapeHtml(d.bookingNumber)}</strong> for <strong>${escapeHtml(d.serviceTitle)}</strong> with ${escapeHtml(d.providerName)} is complete. Thanks for taking our services — we'd love your review.</p>${button(d.reviewUrl, "Leave a review")}`,
    ),
    text: `Booking ${d.bookingNumber} ("${d.serviceTitle}" with ${d.providerName}) is complete. Thanks for taking our services! Leave a review: ${d.reviewUrl}`,
  };
}
