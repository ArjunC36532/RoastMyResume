import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type AccessToken = () => Promise<string | null>;

export const createClient = (accessToken?: AccessToken) =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
    accessToken
      ? {
          accessToken,
          isSingleton: false,
        }
      : undefined,
  );
