import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { updateSession } from "@/utils/supabase/middleware";

const isProtectedRoute = createRouteMatcher([
  "/roast(.*)",
  "/saved(.*)",
  "/tailor(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  return updateSession(request);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
