import { deleteSession } from "@/lib/session";

export async function POST() {
  await deleteSession();
  return Response.json({ ok: true });
}

/** Usado quando a sessão aponta para uma conta que não existe mais. */
export async function GET(request: Request) {
  await deleteSession();
  return Response.redirect(new URL("/login", request.url), 303);
}
