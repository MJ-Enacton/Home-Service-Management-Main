// Razorpay orders with Route split + payment verification (server-only).
// Amounts are integer paise — numerically identical to the app's cents.

import { createHmac } from "node:crypto";

import { rzpFetch, type RazorpayResult } from "./client";

export interface OrderTransfer {
  /** provider linked account id, e.g. acc_... */
  account: string;
  /** provider share in paise */
  amount: number;
  currency: "INR";
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CreateOrderInput {
  /** charged total in paise */
  amountPaise: number;
  /** our booking id — reconciliation key */
  receipt: string;
  /** route split; omit entirely when the provider isn't transfer-ready */
  transfers?: OrderTransfer[];
  notes?: Record<string, string>;
}

/** POST /v1/orders. Transfers (when present) auto-settle on capture. */
export function createRazorpayOrder(
  input: CreateOrderInput,
): Promise<RazorpayResult<RazorpayOrder>> {
  return rzpFetch<RazorpayOrder>("POST", "/v1/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    partial_payment: false,
    ...(input.transfers?.length ? { transfers: input.transfers } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  });
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  status: string;
  method: string;
  amount: number;
}

/** GET /v1/payments/:id — confirm captured state before trusting webhooks/UI. */
export function fetchRazorpayPayment(
  paymentId: string,
): Promise<RazorpayResult<RazorpayPayment>> {
  return rzpFetch<RazorpayPayment>("GET", `/v1/payments/${paymentId}`);
}

/**
 * Verify Razorpay Checkout signature:
 * HMAC-SHA256(order_id + "|" + payment_id, key_secret) === signature.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return (
    expected.length === signature.length &&
    Buffer.from(expected).equals(Buffer.from(signature))
  );
}

export function razorpayKeySecret(): string {
  const value = process.env.RAZORPAY_KEY_SECRET;
  if (!value) throw new Error("Missing RAZORPAY_KEY_SECRET in .env.");
  return value;
}
