// Client-side Razorpay Checkout integration (browser only).
// Loaded on demand so the gateway script never blocks initial render.

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, cb: (response: Record<string, string>) => void): void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window."));
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load the payment gateway. Check your connection."));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface CheckoutSuccess {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface CheckoutPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

/**
 * Open Razorpay Checkout for a server-created order.
 * Resolves with payment credentials on success; calls onDismiss when the
 * customer closes without paying (booking stays pending → Pay now retry).
 */
export async function openRazorpayCheckout(options: {
  keyId: string;
  orderId: string;
  amount: number;
  prefill?: CheckoutPrefill;
  onSuccess: (creds: CheckoutSuccess) => void | Promise<void>;
  onDismiss: () => void;
}): Promise<void> {
  await loadCheckoutScript();
  if (!window.Razorpay) {
    throw new Error("Payment gateway failed to load.");
  }
  const rzp = new window.Razorpay({
    key: options.keyId,
    amount: options.amount,
    currency: "INR",
    order_id: options.orderId,
    prefill: {
      name: options.prefill?.name ?? "",
      email: options.prefill?.email ?? "",
      contact: options.prefill?.contact ?? "",
    },
    theme: { color: "#4f46e5" },
    modal: { ondismiss: options.onDismiss },
    handler: (response: Record<string, string>) => {
      void options.onSuccess({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
    },
  });
  rzp.open();
}
