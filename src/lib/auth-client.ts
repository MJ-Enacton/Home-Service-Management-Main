import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  // No hardcoded baseURL: defaults to the current origin, so LAN hosts
  // (e.g. 192.168.x.x) hit the same Next server instead of localhost.
  plugins: [inferAdditionalFields<typeof auth>(), emailOTPClient()],
});

export const { signUp, signIn, useSession } = authClient;
