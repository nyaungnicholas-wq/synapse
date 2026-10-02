import "server-only";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { DEMO_CONVERSATIONS, DEMO_RECIPE_NOTE, DEMO_STORIES, DEMO_THEN_VS_NOW_NOTES, type Who } from "@/lib/demo-content";

/*
 * One-click demo. Every visitor gets their OWN pair of throwaway accounts (Rose, 78, and her
 * grandson Leo, 16) with ten weeks of shared history, so visitors never see or change each
 * other's demo. Demo accounts have no password and are deleted after a day.
 */

const DAY = 86_400_000;
export const DEMO_TTL_MS = DAY;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY + hours * 3_600_000);

/** Deletes demo accounts older than a day, and the spaces they were in. Runs before each new demo. */
export async function cleanupExpiredDemos(): Promise<number> {
  const old = await db.user.findMany({
    where: { isDemo: true, createdAt: { lt: new Date(Date.now() - DEMO_TTL_MS) } },
    select: { id: true },
  });
  if (old.length === 0) return 0;
  const ids = old.map((u) => u.id);
  await db.$transaction([
    db.connection.deleteMany({ where: { members: { some: { userId: { in: ids } } } } }),
    db.user.deleteMany({ where: { id: { in: ids }, isDemo: true } }),
  ]);
  return ids.length;
}

const profile = (who: Who) =>
  who === "R"
    ? {
        firstName: "Rose",
        ageRange: "AGE_65_79" as const,
        side: "OLDER" as const,
        connectWithLabel: "my grandson Leo",
        interests: ["Music", "Gardening", "Cooking", "Family history"],
        goals: ["PRESERVE_STORIES" as const, "TALK_MORE_OFTEN" as const],
        textSize: "LARGE" as const,
      }
    : {
        firstName: "Leo",
        ageRange: "UNDER_18" as const,
        side: "YOUNGER" as const,
        connectWithLabel: "my grandma Rose",
        interests: ["Music", "Games", "Technology", "Sports"],
        goals: ["LEARN_ABOUT_LIVES" as const, "MEANINGFUL_TIME" as const],
        textSize: "STANDARD" as const,
      };

/** Creates a private Rose & Leo pair with history and returns their ids. */
export async function createDemoPair() {
  await cleanupExpiredDemos();
  const tag = randomToken(9).toLowerCase().replace(/[^a-z0-9]/g, "");
  const now = new Date();

  return db.$transaction(
    async (tx) => {
      const makeUser = (who: Who) =>
        tx.user.create({
          data: {
            email: `${who === "R" ? "rose" : "leo"}-${tag}@demo.synapse.invalid`,
            isDemo: true,
            emailVerifiedAt: now,
            profile: { create: { ...profile(who), relationshipType: "GRANDPARENT_GRANDCHILD", onboardedAt: now } },
          },
        });
      const rose = await makeUser("R");
      const leo = await makeUser("L");
      const userOf = (w: Who) => (w === "R" ? rose.id : leo.id);
      const nameOf = (w: Who) => (w === "R" ? "Rose" : "Leo");

      const space = await tx.connection.create({
        data: {
          createdAt: ago(70),
          members: {
            create: [
              { userId: rose.id, side: "OLDER", joinedAt: ago(70) },
              { userId: leo.id, side: "YOUNGER", joinedAt: ago(69) },
            ],
          },
        },
      });

      // Conversations, attached to the real published prompts.
      let openConversation: string | null = null;
      for (const c of DEMO_CONVERSATIONS) {
        const prompt =
          (await tx.prompt.findFirst({ where: { text: c.text, status: "PUBLISHED" } })) ??
          (await tx.prompt.findFirst({ where: { status: "PUBLISHED", isPremium: false, category: { slug: c.category } } }));
        if (!prompt) continue;
        const exists = await tx.conversation.findUnique({ where: { connectionId_promptId: { connectionId: space.id, promptId: prompt.id } } });
        if (exists) continue;
        const conversation = await tx.conversation.create({
          data: {
            connectionId: space.id,
            promptId: prompt.id,
            startedById: userOf(c.lines[0][0]),
            status: c.done ? "COMPLETED" : "IN_PROGRESS",
            completedAt: c.done ? ago(c.days - 2) : null,
            createdAt: ago(c.days),
          },
        });
        await tx.promptResponse.createMany({
          data: c.lines.map(([w, body], i) => ({ conversationId: conversation.id, authorId: userOf(w), body, createdAt: ago(c.days, 3 * (i + 1)) })),
        });
        if (!c.done) openConversation = conversation.id;
        if (c.category === "music" || c.category === "food") {
          await tx.memory.create({
            data: {
              connectionId: space.id,
              createdById: userOf(c.lines[c.lines.length - 1][0]),
              type: "CONVERSATION",
              title: prompt.text.slice(0, 120),
              body: c.lines.map(([w, b]) => `${nameOf(w)}: ${b}`).join("\n\n"),
              categoryId: prompt.categoryId,
              conversationId: conversation.id,
              favorite: c.category === "music",
              createdAt: ago(c.days - 2),
            },
          });
        }
      }

      // Activities: one finished and saved, one in progress.
      const activity = (slug: string) =>
        tx.activity.findFirst({ where: { slug, status: "PUBLISHED" }, include: { steps: { orderBy: { order: "asc" } } } });
      const thenNow = await activity("then-vs-now");
      if (thenNow) {
        const s = await tx.activitySession.create({
          data: {
            connectionId: space.id,
            activityId: thenNow.id,
            startedById: leo.id,
            status: "COMPLETED",
            currentStep: thenNow.steps.length + 1,
            createdAt: ago(52),
            completedAt: ago(52),
          },
        });
        await tx.activityNote.createMany({
          data: DEMO_THEN_VS_NOW_NOTES.map((n, i) => ({ sessionId: s.id, authorId: userOf(n.by), stepOrder: n.step, body: n.body, createdAt: ago(52, i + 1) })),
        });
        const stepTitle = (order: number | null) => (order === null ? "Reflection" : (thenNow.steps.find((x) => x.order === order)?.title ?? `Step ${order}`));
        await tx.memory.create({
          data: {
            connectionId: space.id,
            createdById: leo.id,
            type: "ACTIVITY",
            title: thenNow.title,
            body: DEMO_THEN_VS_NOW_NOTES.map((n) => `${stepTitle(n.step)} — ${nameOf(n.by)}: ${n.body}`).join("\n\n"),
            categoryId: thenNow.categoryId,
            activityId: thenNow.id,
            activitySessionId: s.id,
            createdAt: ago(52),
          },
        });
      }
      let openSession: string | null = null;
      const recipe = await activity("recipe-swap");
      if (recipe) {
        const s = await tx.activitySession.create({
          data: { connectionId: space.id, activityId: recipe.id, startedById: rose.id, currentStep: 2, createdAt: ago(8) },
        });
        await tx.activityNote.create({ data: { sessionId: s.id, authorId: rose.id, stepOrder: 1, body: DEMO_RECIPE_NOTE, createdAt: ago(8, 1) } });
        openSession = s.id;
      }

      await tx.memory.createMany({
        data: DEMO_STORIES.map((m) => ({
          connectionId: space.id,
          createdById: userOf(m.by),
          type: m.type,
          title: m.title,
          whenText: m.when,
          body: m.body,
          favorite: m.favorite ?? false,
          createdAt: ago(m.days),
        })),
      });

      // Something new waiting for each of them.
      if (openConversation) {
        await tx.notification.create({
          data: { userId: leo.id, type: "NEW_RESPONSE", title: "Rose answered a question", link: `/spaces/${space.id}/talk/${openConversation}` },
        });
      }
      if (openSession) {
        await tx.notification.create({
          data: { userId: rose.id, type: "ACTIVITY_COMPLETED", title: "Recipe Swap is waiting at step 2", link: `/spaces/${space.id}/sessions/${openSession}` },
        });
      }
      return { roseId: rose.id, leoId: leo.id, connectionId: space.id };
    },
    { timeout: 20_000 },
  );
}

/** The other demo person in a demo user's space, for "see it from their side". */
export async function demoPartnerId(userId: string): Promise<string | null> {
  const member = await db.connectionMember.findFirst({
    where: { userId: { not: userId }, user: { isDemo: true }, connection: { members: { some: { userId, user: { isDemo: true } } } } },
    select: { userId: true },
  });
  return member?.userId ?? null;
}
