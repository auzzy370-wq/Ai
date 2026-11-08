import bcrypt from "bcryptjs";

/** bcrypt cost — 10 balances security vs serverless latency (bcryptjs is pure JS). */
const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
