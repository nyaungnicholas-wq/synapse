import "server-only";
import { db } from "@/lib/db";
import { invitationCode, normalizeInvitationCode } from "@/lib/crypto";
import { Prisma } from "@/generated/prisma/client";
import type { GenerationSide } from "@/generated/prisma/enums";

export const INVITATION_DAYS = 7;
const MAX_MEMBERS = 2; // ponytail: spaces are pairs; raise with a group-activity design, not just this number

export type InvitationState = "valid" | "expired" | "accepted" | "revoked" | "full";

const opposite = (side: GenerationSide): GenerationSide => (side === "OLDER" ? "YOUNGER" : "OLDER");

/**
 * Creates an invitation. Without `connectionId` a fresh Connection Space is created with the
 * inviter as its first member. With it, the inviter must already be a member of a space that
 * is still waiting for its second person.
 */
export async function createInvitation(input: {
  inviterId: string;
  inviterSide: GenerationSide;
  connectionId?: string;
  email?: string | null;
}) {
  const expiresAt = new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        let connectionId = input.connectionId;
        if (connectionId) {
          const space = await tx.connection.findFirst({
            where: { id: connectionId, status: "ACTIVE", closedAt: null, members: { some: { userId: input.inviterId } } },
            include: { _count: { select: { members: true } } },
          });
          if (!space) throw new InvitationError("not_found");
          if (space._count.members >= MAX_MEMBERS) throw new InvitationError("full");
          // One live invitation per waiting space keeps "which code do I send?" simple.
          await tx.invitation.updateMany({ where: { connectionId, status: "PENDING" }, data: { status: "REVOKED" } });
        } else {
          const created = await tx.connection.create({
            data: { members: { create: { userId: input.inviterId, side: input.inviterSide } } },
          });
          connectionId = created.id;
        }
        return tx.invitation.create({
          data: { connectionId, inviterId: input.inviterId, code: invitationCode(), email: input.email ?? null, expiresAt },
        });
      });
    } catch (err) {
      // Unique-code collision: astronomically rare, retry with a new code.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  throw new Error("Could not generate a unique invitation code");
}

export class InvitationError extends Error {
  constructor(public reason: "not_found" | "full") {
    super(reason);
  }
}

/** Public lookup for the /invite/[code] page. Reveals only the inviter's first name. */
export async function lookupInvitation(rawCode: string) {
  const code = normalizeInvitationCode(rawCode);
  if (!code) return null;
  const invitation = await db.invitation.findUnique({
    where: { code },
    include: {
      inviter: { select: { id: true, profile: { select: { firstName: true } } } },
      connection: { select: { status: true, closedAt: true, _count: { select: { members: true } } } },
    },
  });
  if (!invitation) return null;
  return {
    code: invitation.code,
    inviterId: invitation.inviterId,
    inviterName: invitation.inviter.profile?.firstName ?? "Someone",
    expiresAt: invitation.expiresAt,
    state: invitationState(invitation),
  };
}

export function invitationState(inv: {
  status: string;
  expiresAt: Date;
  connection: { status: string; closedAt: Date | null; _count: { members: number } };
}, now = new Date()): InvitationState {
  if (inv.status === "ACCEPTED") return "accepted";
  if (inv.status === "REVOKED" || inv.connection.status !== "ACTIVE" || inv.connection.closedAt) return "revoked";
  if (inv.expiresAt <= now) return "expired";
  if (inv.connection._count.members >= MAX_MEMBERS) return "full";
  return "valid";
}

export type AcceptResult =
  | { ok: true; connectionId: string; alreadyMember?: boolean }
  | { ok: false; reason: "not_found" | "expired" | "accepted" | "revoked" | "full" | "own" };

/**
 * Accepts an invitation for `userId`. Runs in one transaction; the conditional status update
 * means two people racing for the same code cannot both join.
 */
export async function acceptInvitation(rawCode: string, userId: string): Promise<AcceptResult> {
  const code = normalizeInvitationCode(rawCode);
  if (!code) return { ok: false, reason: "not_found" };

  return db.$transaction(async (tx) => {
    const target = await tx.invitation.findUnique({ where: { code }, select: { connectionId: true } });
    if (!target) return { ok: false, reason: "not_found" } as const;
    // Row lock: concurrent accepts for the same space queue here, so a space never gets a third member.
    await tx.$executeRaw`SELECT id FROM "Connection" WHERE id = ${target.connectionId} FOR UPDATE`;
    const inv = await tx.invitation.findUnique({
      where: { code },
      include: {
        connection: { include: { members: true, _count: { select: { members: true } } } },
      },
    });
    if (!inv) return { ok: false, reason: "not_found" } as const;
    if (inv.connection.members.some((m) => m.userId === userId)) {
      // The inviter opening their own link, or someone re-opening a link they already used.
      return inv.inviterId === userId && inv.connection._count.members < MAX_MEMBERS
        ? ({ ok: false, reason: "own" } as const)
        : ({ ok: true, connectionId: inv.connectionId, alreadyMember: true } as const);
    }
    const state = invitationState(inv);
    if (state !== "valid") return { ok: false, reason: state } as const;

    // The same two people already share an open space: send them there instead of opening a
    // second one (which would also reset the free plan's weekly limits).
    const existing = await tx.connection.findFirst({
      where: {
        id: { not: inv.connectionId },
        status: "ACTIVE",
        closedAt: null,
        AND: [{ members: { some: { userId } } }, { members: { some: { userId: inv.inviterId } } }],
      },
      select: { id: true },
    });
    if (existing) {
      await tx.invitation.update({ where: { id: inv.id }, data: { status: "REVOKED" } });
      if (inv.connection._count.members === 1) {
        await tx.connection.update({ where: { id: inv.connectionId }, data: { status: "ARCHIVED" } });
      }
      return { ok: true, connectionId: existing.id, alreadyMember: true } as const;
    }

    const claimed = await tx.invitation.updateMany({
      where: { id: inv.id, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: userId },
    });
    if (claimed.count !== 1) return { ok: false, reason: "accepted" } as const;

    // A space is a pair across the generational gap, so the joiner takes the other side.
    // (Activities assign steps by side; two "older" members would leave steps without an owner.)
    const inviterMember = inv.connection.members.find((m) => m.userId === inv.inviterId);
    const profile = await tx.profile.findUnique({ where: { userId }, select: { side: true } });
    const side = inviterMember ? opposite(inviterMember.side) : (profile?.side ?? "YOUNGER");

    await tx.connectionMember.create({ data: { connectionId: inv.connectionId, userId, side } });
    const joiner = await tx.profile.findUnique({ where: { userId }, select: { firstName: true } });
    await tx.notification.create({
      data: {
        userId: inv.inviterId,
        type: "INVITE_ACCEPTED",
        title: `${joiner?.firstName ?? "Your person"} joined your Connection Space`,
        link: `/spaces/${inv.connectionId}`,
      },
    });
    return { ok: true, connectionId: inv.connectionId } as const;
  });
}
