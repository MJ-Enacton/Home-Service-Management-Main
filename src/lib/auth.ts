import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { config } from "dotenv";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db/db";
import * as schema from "./db/schema";
import { sendMail } from "./email/send";
import { otpTemplate, resetLinkTemplate } from "./email/templates";
config();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
      },
      contact: {
        type: "string",
        required: false,
      },
      address: {
        type: "string",
        required: false,
      },
      latitude: {
        type: "number",
        required: false,
      },
      longitude: {
        type: "number",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Users must verify their email (OTP) before they can sign in.
    requireEmailVerification: true,
    // Forgot-password reset link (Phase 3). Better Auth builds `url`.
    // Awaited (not fire-and-forget): serverless functions freeze after the
    // response, which can drop an in-flight SMTP send.
    async sendResetPassword({ user, url }) {
      await sendMail({ to: user.email, ...resetLinkTemplate(url) });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      // OTP valid for 5 minutes, 3 attempts before invalidation.
      expiresIn: 300,
      allowedAttempts: 3,
      // Auto-send the verification OTP right after email/password sign-up.
      sendVerificationOnSignUp: true,
      // Use OTP instead of the default verification link everywhere.
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        // Only email-verification OTPs are used in this app
        // (sign-in and forget-password go through other flows).
        if (type !== "email-verification") return;
        // Always visible in the Next.js server terminal ([0] under
        // `concurrently`), even when SMTP fails for dummy addresses.
        // Keep the OTP on its own line so it survives noisy dev output.
        console.log(
          `\n[auth] verification code for ${email}: ${otp} (expires in 5 min)\n`,
        );
        // Awaited (not fire-and-forget): serverless functions freeze after
        // the response, which can drop an in-flight SMTP send.
        await sendMail({ to: email, ...otpTemplate(otp) }, otp);
      },
    }),
  ],
});
