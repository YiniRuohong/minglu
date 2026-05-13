import {
  clearAccessSession,
  createAccessSession,
  getAccessStatus,
  verifyAccessPassword,
} from "@/lib/access-control";

export const runtime = "nodejs";

export async function GET() {
  const status = await getAccessStatus();
  return Response.json(status);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim();

  if (!password) {
    return Response.json({ error: "请输入访问密码。" }, { status: 400 });
  }

  const matched = await verifyAccessPassword(password).catch(() => false);
  if (!matched) {
    return Response.json({ error: "访问密码错误。" }, { status: 401 });
  }

  await createAccessSession();
  return Response.json({ unlocked: true });
}

export async function DELETE() {
  await clearAccessSession();
  return Response.json({ unlocked: false });
}
