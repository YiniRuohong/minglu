import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";

const ACCESS_COOKIE_NAME = "minglu-access";
const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;
const ACCESS_CONFIG_PATH = path.join(process.cwd(), "config", "access.config.json");

type AccessConfig = {
  accessPassword: string;
};

function buildAccessToken(password: string) {
  return crypto.createHash("sha256").update(`minglu:${password}`).digest("hex");
}

export async function readAccessPassword() {
  const envPassword = process.env.ACCESS_PASSWORD?.trim();
  if (envPassword) {
    return envPassword;
  }

  const raw = await fs.readFile(ACCESS_CONFIG_PATH, "utf8");
  const config = JSON.parse(raw) as AccessConfig;
  const password = config.accessPassword?.trim();

  if (!password) {
    throw new Error("访问密码配置缺失，请检查 config/access.config.json 或 ACCESS_PASSWORD。");
  }

  return password;
}

export async function isAccessUnlocked() {
  const password = await readAccessPassword();
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE_NAME)?.value === buildAccessToken(password);
}

export async function getAccessStatus() {
  try {
    const unlocked = await isAccessUnlocked();
    return { unlocked, passwordConfigured: true };
  } catch {
    return { unlocked: false, passwordConfigured: false };
  }
}

export async function verifyAccessPassword(password: string) {
  const expected = await readAccessPassword();
  return password === expected;
}

export async function createAccessSession() {
  const password = await readAccessPassword();
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_COOKIE_NAME, buildAccessToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
}

export async function clearAccessSession() {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
