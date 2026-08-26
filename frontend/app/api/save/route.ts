import { auth } from "@clerk/nextjs/server";

const RESUME_API_URL = process.env.RESUME_API_URL;

if (!RESUME_API_URL) {
  throw new Error("RESUME_API_URL is not set");
}

export const maxDuration = 120;

export async function POST(request: Request) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const token = await getToken();
  if (!token) {
    return Response.json(
      { error: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const review = formData.get("review");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Expected a resume in the `file` field." },
      { status: 400 },
    );
  }
  if (review == null || (typeof review === "string" && review.length === 0)) {
    return Response.json(
      { error: "Expected review data in the `review` field." },
      { status: 400 },
    );
  }

  const form = new FormData();
  form.append("file", file, file.name);
  if (review instanceof Blob) {
    form.append("review", review, "review.json");
  } else {
    form.append(
      "review",
      new Blob([String(review)], { type: "application/json" }),
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${RESUME_API_URL}/api/resume/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
  } catch (cause) {
    console.error("Could not reach the resume service", cause);
    return Response.json(
      { error: `Could not reach the resume service at ${RESUME_API_URL}.` },
      { status: 502 },
    );
  }

  const payload = (await upstream.json().catch(() => ({}))) as {
    path?: string;
    reviewId?: string;
    error?: string;
  };

  if (!upstream.ok) {
    return Response.json(
      { error: payload.error ?? `Resume service returned ${upstream.status}.` },
      { status: upstream.status === 400 ? 400 : 502 },
    );
  }

  return Response.json(payload);
}
