import { auth } from "@clerk/nextjs/server";

const RESUME_API_URL = process.env.RESUME_API_URL ?? "http://localhost:8080";

export const maxDuration = 120;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Expected a resume in the `file` field." },
      { status: 400 },
    );
  }

  const form = new FormData();
  form.append("file", file, file.name);

  let upstream: Response;
  try {
    upstream = await fetch(`${RESUME_API_URL}/api/resume/review`, {
      method: "POST",
      body: form,
    });
  } catch (cause) {
    console.error("Could not reach the resume service", cause);
    return Response.json(
      { error: `Could not reach the resume service at ${RESUME_API_URL}.` },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return Response.json(
      { error: `Resume service returned ${upstream.status}.` },
      { status: 502 },
    );
  }

  const review = await upstream.json();
  return Response.json({ review });
}
