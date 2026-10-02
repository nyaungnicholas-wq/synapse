import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  resetDb,
  seedPlans,
  createUser,
  createSpace,
  signIn,
  form,
  expectRedirect,
} from "./helpers";
import {
  createInvitation,
  lookupInvitation,
  acceptInvitation,
  InvitationError,
} from "@/lib/invitations";
import {
  createInviteAction,
  joinWithCodeAction,
  revokeInviteAction,
  leaveSpaceAction,
} from "@/actions/connections";

vi.mock("next/cache", async () => (await import("./helpers")).nextCacheMock);
vi.mock("next/navigation", async () => (await import("./helpers")).nextNavigationMock);
vi.mock("next/headers", async () => (await import("./helpers")).nextHeadersMock);
vi.mock("@/lib/session", async (importOriginal) => (await import("./helpers")).sessionMock(await importOriginal()));

describe("invitations (library)", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("createInvitation without connectionId creates a Connection with inviter only and a PENDING invitation", async () => {
    const inviter = await createUser({ name: "Alice", side: "OLDER" });
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    const connection = await db.connection.findUnique({
      where: { id: invitation.connectionId },
      include: {
        members: { include: { user: { select: { profile: { select: { firstName: true } } } } } },
        invitations: true,
      },
    });

    expect(connection).not.toBeNull();
    expect(connection?.members).toHaveLength(1);
    expect(connection?.members[0].userId).toBe(inviter.id);
    expect(connection?.members[0].side).toBe(inviter.profile!.side);
    expect(connection?.invitations).toHaveLength(1);
    expect(connection?.invitations[0].status).toBe("PENDING");
    expect(connection?.invitations[0].code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(
      Math.abs(connection!.invitations[0].expiresAt.getTime() - (Date.now() + 7 * 24 * 60 * 60 * 1000)),
    ).toBeLessThan(60_000);
  });

  it("lookupInvitation finds valid invitation by code (case-insensitive, dash-optional)", async () => {
    const inviter = await createUser({ name: "Bob", side: "YOUNGER" });
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });
    const rawCode = invitation.code.replace("-", "").toLowerCase();

    const result = await lookupInvitation(rawCode);
    expect(result).not.toBeNull();
    expect(result?.state).toBe("valid");
    expect(result?.inviterName).toBe(inviter.profile!.firstName);
    expect(result?.code).toBe(invitation.code);

    const notFound = await lookupInvitation("NOPE");
    expect(notFound).toBeNull();
  });

  it("acceptInvitation adds joiner, marks invitation ACCEPTED, and creates inviter notification", async () => {
    const inviter = await createUser({ name: "Charlie", side: "OLDER" });
    const joiner = await createUser({ name: "Delta", side: "YOUNGER" });
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    const result = await acceptInvitation(invitation.code, joiner.id);
    expect(result).toEqual({ ok: true, connectionId: invitation.connectionId });

    const connection = await db.connection.findUnique({
      where: { id: invitation.connectionId },
      include: {
        members: { include: { user: { select: { profile: { select: { firstName: true } } } } } },
        invitations: true,
      },
    });
    expect(connection?.members).toHaveLength(2);
    const memberIds = connection?.members.map((m) => m.userId).sort();
    expect(memberIds).toEqual([inviter.id, joiner.id].sort());

    const updatedInvitation = await db.invitation.findUnique({
      where: { id: invitation.id },
    });
    expect(updatedInvitation?.status).toBe("ACCEPTED");
    expect(updatedInvitation?.acceptedById).toBe(joiner.id);
    expect(updatedInvitation?.acceptedAt).not.toBeNull();

    const notification = await db.notification.findFirst({
      where: { userId: inviter.id, type: "INVITE_ACCEPTED" },
    });
    expect(notification).not.toBeNull();
    expect(notification?.title).toContain(joiner.profile!.firstName);
  });

  it("acceptInvitation returns { ok: false, reason: 'own' } when inviter accepts own pending invitation", async () => {
    const inviter = await createUser({ name: "Echo", side: "OLDER" });
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    const result = await acceptInvitation(invitation.code, inviter.id);
    expect(result).toEqual({ ok: false, reason: "own" });

    const connection = await db.connection.findUnique({
      where: { id: invitation.connectionId },
      include: { members: true },
    });
    expect(connection?.members).toHaveLength(1);
    expect(connection?.members[0].userId).toBe(inviter.id);
  });

  it("acceptInvitation returns { ok: false, reason: 'expired' } for expired invitation", async () => {
    const inviter = await createUser({ name: "Foxtrot", side: "OLDER" });
    const joiner = await createUser({ name: "Golf", side: "YOUNGER" });
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    await db.invitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await acceptInvitation(invitation.code, joiner.id);
    expect(result).toEqual({ ok: false, reason: "expired" });

    const connection = await db.connection.findUnique({
      where: { id: invitation.connectionId },
      include: { members: true },
    });
    expect(connection?.members).toHaveLength(1);
  });

  it("acceptInvitation returns { ok: false, reason: 'revoked' } for revoked invitation", async () => {
    const inviter = await createUser({ name: "Hotel", side: "OLDER" });
    const joiner = await createUser({ name: "India", side: "YOUNGER" });
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "REVOKED" },
    });

    const result = await acceptInvitation(invitation.code, joiner.id);
    expect(result).toEqual({ ok: false, reason: "revoked" });

    const connection = await db.connection.findUnique({
      where: { id: invitation.connectionId },
      include: { members: true },
    });
    expect(connection?.members).toHaveLength(1);
  });

  it("acceptInvitation returns { ok: false, reason: 'accepted' } when third user tries to join after two members", async () => {
    const inviter = await createUser({ name: "Juliet", side: "OLDER" });
    const joiner1 = await createUser({ name: "Kilo", side: "YOUNGER" });
    const joiner2 = await createUser({ name: "Lima", side: "OLDER" });
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    await acceptInvitation(invitation.code, joiner1.id);
    const result = await acceptInvitation(invitation.code, joiner2.id);
    expect(result).toEqual({ ok: false, reason: "accepted" });

    const connection = await db.connection.findUnique({
      where: { id: invitation.connectionId },
      include: { members: true },
    });
    expect(connection?.members).toHaveLength(2);
  });

  it("acceptInvitation race: exactly one joiner succeeds when two race for same code", async () => {
    const inviter = await createUser({ name: "Mike", side: "OLDER" });
    const joiner1 = await createUser({ name: "November", side: "YOUNGER" });
    const joiner2 = await createUser({ name: "Oscar", side: "OLDER" });
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    const results = await Promise.all([
      acceptInvitation(invitation.code, joiner1.id),
      acceptInvitation(invitation.code, joiner2.id),
    ]);
    const okResults = results.filter((r) => r.ok);
    expect(okResults).toHaveLength(1);

    const connection = await db.connection.findUnique({
      where: { id: invitation.connectionId },
      include: { members: true },
    });
    expect(connection?.members).toHaveLength(2);
  });

  it("acceptInvitation returns { ok: false, reason: 'not_found' } for unknown or malformed code", async () => {
    const result1 = await acceptInvitation("INVALID", "some-user-id");
    expect(result1).toEqual({ ok: false, reason: "not_found" });

    const result2 = await acceptInvitation("ABCD-EFG", "some-user-id");
    expect(result2).toEqual({ ok: false, reason: "not_found" });

    const result3 = await acceptInvitation("abcd-efgh", "some-user-id");
    expect(result3).toEqual({ ok: false, reason: "not_found" });
  });

  it("createInvitation with connectionId of full space throws InvitationError", async () => {
    const user1 = await createUser({ name: "Papa", side: "OLDER" });
    const user2 = await createUser({ name: "Quebec", side: "YOUNGER" });
    const space = await createSpace(user1, user2);

    await expect(
      createInvitation({
        inviterId: user1.id,
        inviterSide: user1.profile.side,
        connectionId: space.id,
      })
    ).rejects.toThrow(InvitationError);
    await expect(
      createInvitation({
        inviterId: user2.id,
        inviterSide: user2.profile.side,
        connectionId: space.id,
      })
    ).rejects.toThrow(InvitationError);
  });
});

describe("invitations (actions)", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("joinWithCodeAction redirects to space for signed-in onboarded user with valid code", async () => {
    const inviter = await createUser({ name: "Romeo", side: "OLDER" });
    const joiner = await createUser({ name: "Sierra", side: "YOUNGER" });
    signIn(joiner);
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    const url = await expectRedirect(() =>
      joinWithCodeAction({}, form({ code: invitation.code }))
    );
    expect(url).toBe(`/spaces/${invitation.connectionId}`);
  });

  it("createInviteAction returns error and sends no email when email not verified", async () => {
    const user = await createUser({ name: "Tango", side: "OLDER" });
    await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: null } });
    signIn({ ...user, emailVerifiedAt: null });
    const result = await createInviteAction({}, form({ email: "friend@example.com" }));
    expect(result).toEqual({
      error: "Please confirm your own email address before we send invitations by email. You can still share the link or code.",
    });
    const outbox = await db.emailOutbox.findMany();
    expect(outbox).toHaveLength(0);
  });

  it("createInviteAction returns ok, creates EmailOutbox, and creates invitation after email verified", async () => {
    const user = await createUser({ name: "Uniform", side: "OLDER" });
    signIn(user);
    const result = await createInviteAction({}, form({ email: "friend@example.com" }));
    expect(result).toEqual({ ok: true, message: expect.stringContaining("friend@example.com") });

    const outbox = await db.emailOutbox.findMany({
      where: { to: "friend@example.com" },
    });
    expect(outbox).toHaveLength(1);
    expect(outbox[0].text).toContain(user.profile.firstName);

    const invitations = await db.invitation.findMany({
      where: { inviterId: user.id },
    });
    expect(invitations).toHaveLength(1);
  });

  it("revokeInviteAction leaves invitation PENDING when non-inviter calls it", async () => {
    const inviter = await createUser({ name: "Victor", side: "OLDER" });
    const nonInviter = await createUser({ name: "Whiskey", side: "YOUNGER" });
    signIn(nonInviter);
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    await revokeInviteAction(form({ invitationId: invitation.id }));
    const updated = await db.invitation.findUnique({ where: { id: invitation.id } });
    expect(updated?.status).toBe("PENDING");
  });

  it("revokeInviteAction sets invitation REVOKED when inviter calls it", async () => {
    const inviter = await createUser({ name: "Xray", side: "OLDER" });
    signIn(inviter);
    const invitation = await createInvitation({
      inviterId: inviter.id,
      inviterSide: inviter.profile!.side,
    });

    await revokeInviteAction(form({ invitationId: invitation.id }));
    const updated = await db.invitation.findUnique({ where: { id: invitation.id } });
    expect(updated?.status).toBe("REVOKED");
  });

  it("leaveSpaceAction archives connection when last member leaves and redirects with left-space notice", async () => {
    const user = await createUser({ name: "Yankee", side: "OLDER" });
    signIn(user);
    const space = await createSpace(user);

    const url = await expectRedirect(() =>
      leaveSpaceAction(form({ connectionId: space.id }))
    );
    expect(url).toContain("left-space");

    const connection = await db.connection.findUnique({ where: { id: space.id } });
    expect(connection?.status).toBe("ARCHIVED");
  });
});