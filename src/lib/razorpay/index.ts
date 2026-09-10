// Server-side Razorpay facade (orders + verification). Project mode:
// collection only — no Route/transfers. Provider 85% shares are tracked
// as owed amounts in payments.providerPayout and settled off-system.
// Never import from client components.
export { razorpayKeyId } from "./client";
export type { RazorpayResult, RazorpayFailure } from "./client";
export {
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyPaymentSignature,
  razorpayKeySecret,
} from "./orders";
export type {
  CreateOrderInput,
  OrderTransfer,
  RazorpayOrder,
  RazorpayPayment,
} from "./orders";
