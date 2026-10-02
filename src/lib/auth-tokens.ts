import "server-only";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import type { TokenType } from "@/generated/prisma/enums";

const TTL_MS: Record<TokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

/** Issues a single-use token, revoking any earlier unused token of the same type. Returns the raw token. */
export async function issueAuthToken(userId: string, type: TokenType): Promise<string> {
  const token = randomToken();
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    db.authToken.create({
      data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS[type]) },
    }),
  ]);
  return token;
}

/**
 * Marks the token used and returns its userId, or null when it is unknown, expired,
 * already used, or of another type. The conditional update makes it single-use even
 * under concurrent requests.
 */
export async function consumeAuthToken(raw: string, type: TokenType): Promise<string | null> {
  if (!raw || raw.length > 200) return null;
  const tokenHash = sha256(raw);
  const result = await db.authToken.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (result.count !== 1) return null;
  const token = await db.authToken.findUnique({ where: { tokenHash }, select: { userId: true } });
  return token?.userId ?? null;
}
