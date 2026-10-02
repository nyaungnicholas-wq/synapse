"use server";

// Conversations, activities and memories inside a Connection Space. Every action re-checks
// membership: ids from the browser are never trusted on their own.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkSpaceAllows } from "@/lib/entitlements";
import { MINUTE, rateLimit } from "@/lib/rate-limit";
import { requireOnboardedUser, safeNextPath } from "@/lib/session";
import { getSpace, memberName, type Space } from "@/lib/spaces";
import { prepareImage } from "@/lib/uploads";
import { type ActionState, cleanText, fieldErrorsOf, formToObject, id, optionalText, text } from "@/lib/validation";
import type { NotificationType } from "@/generated/prisma/enums";

const memberOf = (userId: string) => ({ connection: { status: "ACTIVE" as const, members: { some: { userId } } } });

async function notifyPartner(space: Space, type: NotificationType, title: string, link: string) {
  if (!space.partner) return;
  // One unread note per link is enough; never pile up badges.
  const existing = await db.notification.findFirst({ where: { userId: space.partner.userId, link, readAt: null } });
  if (existing) return;
  await db.notification.create({ data: { userId: space.partner.userId, type, title, link } });
}

// ---------- conversations ----------

export async function startConversationAction(form: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const connectionId = id.parse(form.get("connectionId"));
  const promptId = id.parse(form.get("promptId"));
  const space = await getSpace(connectionId, user.id);
  if (!space) redirect("/dashboard");

  const existing = await db.conversation.findUnique({ where: { connectionId_promptId: { connectionId, promptId } } });
  if (existing) redirect(`/spaces/${connectionId}/talk/${existing.id}`);

  const prompt = await db.prompt.findFirst({ where: { id: promptId, status: "PUBLISHED" } });
  if (!prompt) redirect(`/spaces/${connectionId}/talk`);

  const gate = await checkSpaceAllows(connectionId, "prompt", prompt.isPremium);
  if (!gate.allowed) redirect(`/spaces/${connectionId}/talk?blocked=${gate.reason}`);

  const conversation = await db.conversation.create({ data: { connectionId, promptId, startedById: user.id } });
  redirect(`/spaces/${connectionId}/talk/${conversation.id}`);
}

const responseSchema = z.object({ conversationId: id, body: text(4000) });

export async function addResponseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOnboardedUser();
  const parsed = responseSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (!rateLimit(`respond:${user.id}`, 20, MINUTE)) return { error: "You are writing very quickly. Please wait a moment." };

  const conversation = await db.conversation.findFirst({ where: { id: parsed.data.conversationId, ...memberOf(user.id) } });
  if (!conversation) return { error: "We could not find this conversation." };
  if (conversation.status === "COMPLETED") return { error: "This conversation is finished. Start a new one any time." };

  await db.promptResponse.create({ data: { conversationId: conversation.id, authorId: user.id, body: parsed.data.body } });
  const space = (await getSpace(conversation.connectionId, user.id))!;
  const link = `/spaces/${conversation.connectionId}/talk/${conversation.id}`;
  await notifyPartner(space, "NEW_RESPONSE", `${user.profile.firstName} answered a question`, link);
  revalidatePath(link);
  return { ok: true };
}

function transcript(responses: { body: string; author: { profile: { firstName: string } | null; email: string } }[]) {
  return responses
    .map((r) => `${memberName({ user: r.author })}: ${r.body}`)
    .join("\n\n")
    .slice(0, 8000);
}

export async function completeConversationAction(form: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const conversationId = id.parse(form.get("conversationId"));
  const save = form.get("saveAsMemory") === "on";
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, ...memberOf(user.id) },
    include: {
      prompt: true,
      memory: true,
      responses: { orderBy: { createdAt: "asc" }, include: { author: { select: { email: true, profile: { select: { firstName: true } } } } } },
    },
  });
  if (!conversation) redirect("/dashboard");
  const base = `/spaces/${conversation.connectionId}/talk/${conversation.id}`;

  if (conversation.status !== "COMPLETED") {
    await db.conversation.update({ where: { id: conversation.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    const space = (await getSpace(conversation.connectionId, user.id))!;
    await notifyPartner(space, "CONVERSATION_COMPLETED", `${user.profile.firstName} marked a conversation as complete`, base);
  }

  let notice = "completed";
  if (save && !conversation.memory && conversation.responses.length > 0) {
    const gate = await checkSpaceAllows(conversation.connectionId, "memory");
    if (gate.allowed) {
      await db.memory.create({
        data: {
          connectionId: conversation.connectionId,
          createdById: user.id,
          type: "CONVERSATION",
          title: conversation.prompt.text.slice(0, 120),
          body: transcript(conversation.responses),
          categoryId: conversation.prompt.categoryId,
          conversationId: conversation.id,
        },
      });
      notice = "saved";
    } else {
      notice = "memory-full";
    }
  }
  revalidatePath(base);
  redirect(`${base}?notice=${notice}`);
}

export async function toggleFavoriteAction(form: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const promptId = id.parse(form.get("promptId"));
  const back = safeNextPath(form.get("back"), "");
  const key = { userId_promptId: { userId: user.id, promptId } };
  if (await db.promptFavorite.findUnique({ where: key })) {
    await db.promptFavorite.delete({ where: key });
  } else if (await db.prompt.findFirst({ where: { id: promptId, status: "PUBLISHED" }, select: { id: true } })) {
    await db.promptFavorite.create({ data: { userId: user.id, promptId } });
  }
  if (back.startsWith("/spaces/")) {
    revalidatePath(back.split("?")[0]);
    redirect(back);
  }
}

// ---------- activities ----------

export async function startActivityAction(form: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const connectionId = id.parse(form.get("connectionId"));
  const activityId = id.parse(form.get("activityId"));
  if (!(await getSpace(connectionId, user.id))) redirect("/dashboard");

  const activity = await db.activity.findFirst({ where: { id: activityId, status: "PUBLISHED" }, include: { collection: true } });
  if (!activity) redirect(`/spaces/${connectionId}/activities`);

  const open = await db.activitySession.findFirst({ where: { connectionId, activityId, status: "IN_PROGRESS" } });
  if (open) redirect(`/spaces/${connectionId}/sessions/${open.id}`);

  const gate = await checkSpaceAllows(connectionId, "activity", activity.isPremium || Boolean(activity.collection?.isPremium));
  if (!gate.allowed) redirect(`/spaces/${connectionId}/activities/${activity.slug}?blocked=${gate.reason}`);

  const session = await db.activitySession.create({ data: { connectionId, activityId, startedById: user.id } });
  redirect(`/spaces/${connectionId}/sessions/${session.id}`);
}

const noteSchema = z.object({ sessionId: id, stepOrder: z.coerce.number().int().min(1).max(50), body: text(4000) });

export async function addStepNoteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOnboardedUser();
  const parsed = noteSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (!rateLimit(`note:${user.id}`, 30, MINUTE)) return { error: "You are writing very quickly. Please wait a moment." };
  const session = await db.activitySession.findFirst({ where: { id: parsed.data.sessionId, ...memberOf(user.id) } });
  if (!session) return { error: "We could not find this activity." };
  await db.activityNote.create({
    data: { sessionId: session.id, authorId: user.id, stepOrder: parsed.data.stepOrder, body: parsed.data.body },
  });
  revalidatePath(`/spaces/${session.connectionId}/sessions/${session.id}`);
  return { ok: true };
}

/**
 * Moves the shared "you are here" marker (step steps+1 is the reflection screen). If a note was
 * typed on the current step it is saved first, so pressing Next or Back never loses it.
 */
export async function goToStepAction(form: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const sessionId = id.parse(form.get("sessionId"));
  const note = cleanText(String(form.get("body") ?? "")).slice(0, 4000);
  const noteStep = z.coerce.number().int().min(1).max(50).safeParse(form.get("stepOrder"));
  const step = z.coerce.number().int().min(1).catch(1).parse(form.get("step")); // clamped below
  const session = await db.activitySession.findFirst({
    where: { id: sessionId, ...memberOf(user.id) },
    include: { activity: { select: { _count: { select: { steps: true } } } } },
  });
  if (!session) redirect("/dashboard");
  const max = session.activity._count.steps + 1;
  if (note && noteStep.success && rateLimit(`note:${user.id}`, 30, MINUTE)) {
    await db.activityNote.create({ data: { sessionId: session.id, authorId: user.id, stepOrder: noteStep.data, body: note } });
  }
  await db.activitySession.update({ where: { id: session.id }, data: { currentStep: Math.min(step, max) } });
  redirect(`/spaces/${session.connectionId}/sessions/${session.id}`);
}

const completeActivitySchema = z.object({ sessionId: id, reflection: optionalText(4000), saveAsMemory: z.string().optional() });

export async function completeActivityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOnboardedUser();
  const parsed = completeActivitySchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const session = await db.activitySession.findFirst({
    where: { id: parsed.data.sessionId, ...memberOf(user.id) },
    include: {
      activity: { include: { steps: { orderBy: { order: "asc" } } } },
      memory: true,
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { email: true, profile: { select: { firstName: true } } } } } },
    },
  });
  if (!session) return { error: "We could not find this activity." };
  const base = `/spaces/${session.connectionId}/sessions/${session.id}`;

  if (parsed.data.reflection) {
    await db.activityNote.create({ data: { sessionId: session.id, authorId: user.id, stepOrder: null, body: parsed.data.reflection } });
  }
  if (session.status !== "COMPLETED") {
    await db.activitySession.update({ where: { id: session.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    const space = (await getSpace(session.connectionId, user.id))!;
    await notifyPartner(space, "ACTIVITY_COMPLETED", `${user.profile.firstName} finished "${session.activity.title}"`, base);
  }

  let notice = "completed";
  if (parsed.data.saveAsMemory === "on" && !session.memory) {
    const gate = await checkSpaceAllows(session.connectionId, "memory");
    if (gate.allowed) {
      const notes = [
        ...session.notes,
        ...(parsed.data.reflection
          ? [{ body: parsed.data.reflection, stepOrder: null, author: { email: user.email, profile: { firstName: user.profile.firstName } } }]
          : []),
      ];
      const stepTitle = (order: number | null) =>
        order === null ? "Reflection" : (session.activity.steps.find((s) => s.order === order)?.title ?? `Step ${order}`);
      const body = notes.map((n) => `${stepTitle(n.stepOrder)} — ${memberName({ user: n.author })}: ${n.body}`).join("\n\n");
      await db.memory.create({
        data: {
          connectionId: session.connectionId,
          createdById: user.id,
          type: "ACTIVITY",
          title: session.activity.title,
          body: body.slice(0, 8000),
          categoryId: session.activity.categoryId,
          activityId: session.activityId,
          activitySessionId: session.id,
        },
      });
      notice = "saved";
    } else {
      notice = "memory-full";
    }
  }
  revalidatePath(base);
  redirect(`${base}?notice=${notice}`);
}

// ---------- memories ----------

const memorySchema = z.object({
  connectionId: id,
  type: z.enum(["STORY", "MOMENT", "PHOTO"]),
  title: text(120),
  body: optionalText(8000),
  whenText: optionalText(60),
});

export async function createMemoryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOnboardedUser();
  const parsed = memorySchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: "A few things need another look.", fieldErrors: fieldErrorsOf(parsed.error) };
  const { connectionId, type, title, body, whenText } = parsed.data;
  const space = await getSpace(connectionId, user.id);
  if (!space) return { error: "We could not find this Connection Space." };
  if (!rateLimit(`memory:${user.id}`, 20, 10 * MINUTE)) return { error: "Please wait a moment before adding another memory." };

  const gate = await checkSpaceAllows(connectionId, "memory");
  if (!gate.allowed) return { error: gate.message };

  let photoId: string | undefined;
  const file = form.get("photo");
  if (type === "PHOTO") {
    if (!(file instanceof File) || file.size === 0) return { fieldErrors: { photo: ["Please choose a photo."] } };
    const saved = await prepareImage(file);
    if ("error" in saved) return { fieldErrors: { photo: [saved.error] } };
    photoId = (await db.photo.create({ data: { connectionId, uploaderId: user.id, ...saved } })).id;
  }

  const memory = await db.memory.create({
    data: { connectionId, createdById: user.id, type, title, body: body ?? "", whenText, photoId },
  });
  await notifyPartner(space, "MEMORY_ADDED", `${user.profile.firstName} added "${title}" to your memories`, `/spaces/${connectionId}/memories/${memory.id}`);
  revalidatePath(`/spaces/${connectionId}/memories`);
  redirect(`/spaces/${connectionId}/memories/${memory.id}?notice=created`);
}

export async function toggleMemoryFavoriteAction(form: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const memoryId = id.parse(form.get("memoryId"));
  const memory = await db.memory.findFirst({ where: { id: memoryId, ...memberOf(user.id) } });
  if (!memory) redirect("/dashboard");
  await db.memory.update({ where: { id: memory.id }, data: { favorite: !memory.favorite } });
  revalidatePath(`/spaces/${memory.connectionId}/memories`);
  revalidatePath(`/spaces/${memory.connectionId}/memories/${memory.id}`);
}

/** Only the person who added a memory can delete it; its photo goes with it. */
export async function deleteMemoryAction(form: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const memoryId = id.parse(form.get("memoryId"));
  const memory = await db.memory.findFirst({ where: { id: memoryId, createdById: user.id, ...memberOf(user.id) }, include: { photo: true } });
  if (!memory) redirect("/dashboard");
  await db.$transaction(async (tx) => {
    await tx.memory.delete({ where: { id: memory.id } });
    if (memory.photo) await tx.photo.delete({ where: { id: memory.photo.id } });
  });
  revalidatePath(`/spaces/${memory.connectionId}/memories`);
  redirect(`/spaces/${memory.connectionId}/memories?notice=deleted`);
}

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireOnboardedUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/dashboard");
}
