import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

const memberSelect = {
  id: true,
  userId: true,
  side: true,
  joinedAt: true,
  user: { select: { email: true, profile: { select: { firstName: true } } } },
} as const;

/**
 * THE authorization boundary for Connection Spaces. Returns the space only when `userId`
 * is a member; otherwise null. Every space-scoped page and action goes through this
 * (or filters its own query by `connection: { members: { some: { userId } } }`).
 */
export async function getSpace(connectionId: string, userId: string) {
  if (!connectionId || connectionId.length > 40) return null;
  const connection = await db.connection.findFirst({
    where: { id: connectionId, status: "ACTIVE", members: { some: { userId } } },
    include: { members: { select: memberSelect, orderBy: { joinedAt: "asc" } } },
  });
  if (!connection) return null;
  const me = connection.members.find((m) => m.userId === userId)!;
  const partner = connection.members.find((m) => m.userId !== userId) ?? null;
  return { ...connection, me, partner };
}

export type Space = NonNullable<Awaited<ReturnType<typeof getSpace>>>;

/** Same as getSpace but renders the 404 page for non-members, so a guessed id reveals nothing. */
export async function requireSpace(connectionId: string, userId: string): Promise<Space> {
  const space = await getSpace(connectionId, userId);
  if (!space) notFound();
  return space;
}

/** All active spaces the user belongs to, oldest first. */
export async function listSpaces(userId: string) {
  const connections = await db.connection.findMany({
    where: { status: "ACTIVE", members: { some: { userId } } },
    include: { members: { select: memberSelect, orderBy: { joinedAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return connections.map((c) => ({
    ...c,
    me: c.members.find((m) => m.userId === userId)!,
    partner: c.members.find((m) => m.userId !== userId) ?? null,
  }));
}

export function memberName(member: { user: { email: string; profile: { firstName: string } | null } } | null): string {
  if (!member) return "your person";
  return member.user.profile?.firstName ?? member.user.email.split("@")[0];
}

/** Display name for a space from the viewer's side: "You & Rose", "Waiting for Leo" or a closed space. */
export function spaceTitle(
  space: { partner: Parameters<typeof memberName>[0]; closedAt?: Date | null },
  waitingLabel?: string,
): string {
  if (space.partner) return `You & ${memberName(space.partner)}`;
  return space.closedAt ? "Your earlier space" : `Waiting for ${waitingLabel || "your person"} to join`;
}
