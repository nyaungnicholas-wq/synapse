import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  resetDb,
  seedPlans,
  createUser,
  createSpace,
  createPrompt,
  createActivity,
  form,
  signIn,
  expectRedirect } from "./helpers";
import { startConversationAction, addResponseAction, completeConversationAction } from "@/actions/together";
import { startActivityAction, goToStepAction, addStepNoteAction, completeActivityAction } from "@/actions/together";
import { createMemoryAction } from "@/actions/together";

vi.mock("next/cache", async () => (await import("./helpers")).nextCacheMock);
vi.mock("next/navigation", async () => (await import("./helpers")).nextNavigationMock);
vi.mock("next/headers", async () => (await import("./helpers")).nextHeadersMock);
vi.mock("@/lib/session", async (importOriginal) => (await import("./helpers")).sessionMock(await importOriginal()));

describe("together actions", () => {
  let rose: Awaited<ReturnType<typeof createUser>>;
  let leo: Awaited<ReturnType<typeof createUser>>;
  let space: Awaited<ReturnType<typeof createSpace>>;
  let prompt: Awaited<ReturnType<typeof createPrompt>>;
  let premiumPrompt: Awaited<ReturnType<typeof createPrompt>>;
  let activity: Awaited<ReturnType<typeof createActivity>>;

  beforeEach(async () => {
    await resetDb();
    await seedPlans();
    rose = await createUser({ name: "Rose", side: "OLDER" });
    leo = await createUser({ name: "Leo", side: "YOUNGER" });
    space = await createSpace({ id: rose.id }, { id: leo.id });
    prompt = await createPrompt({ isPremium: false });
    premiumPrompt = await createPrompt({ isPremium: true });
    activity = await createActivity({ isPremium: false });
    signIn(rose);
  });

  describe("conversations", () => {
    it("starts a conversation and redirects to it", async () => {
      const url = await expectRedirect(() =>
        startConversationAction(form({ connectionId: space.id, promptId: prompt.id }))
      );
      expect(url).toMatch(new RegExp(`^/spaces/${space.id}/talk/[a-z0-9]+$`));
      const count = await db.conversation.count({ where: { connectionId: space.id } });
      expect(count).toBe(1);
    });

    it("starting the same prompt again redirects to the same conversation", async () => {
      const conv = await db.conversation.create({
        data: { connectionId: space.id, promptId: prompt.id, startedById: rose.id },
      });
      const url = await expectRedirect(() =>
        startConversationAction(form({ connectionId: space.id, promptId: prompt.id }))
      );
      expect(url).toBe(`/spaces/${space.id}/talk/${conv.id}`);
      const count = await db.conversation.count({ where: { connectionId: space.id } });
      expect(count).toBe(1);
    });

    it("free limit: after 3 conversations this week, 4th is blocked", async () => {
      await Promise.all([
        db.conversation.create({ data: { connectionId: space.id, promptId: (await createPrompt()).id, startedById: rose.id } }),
        db.conversation.create({ data: { connectionId: space.id, promptId: (await createPrompt()).id, startedById: rose.id } }),
        db.conversation.create({ data: { connectionId: space.id, promptId: (await createPrompt()).id, startedById: rose.id } }),
      ]);
      const url = await expectRedirect(() =>
        startConversationAction(form({ connectionId: space.id, promptId: prompt.id }))
      );
      expect(url).toContain("blocked=limit");
      const count = await db.conversation.count({ where: { connectionId: space.id } });
      expect(count).toBe(3);
    });

    it("conversations created last week do not count toward limit", async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      await Promise.all([
        db.conversation.create({
          data: {
            connectionId: space.id,
            promptId: (await createPrompt()).id,
            startedById: rose.id,
            createdAt: eightDaysAgo,
          },
        }),
        db.conversation.create({
          data: {
            connectionId: space.id,
            promptId: (await createPrompt()).id,
            startedById: rose.id,
            createdAt: eightDaysAgo,
          },
        }),
        db.conversation.create({
          data: {
            connectionId: space.id,
            promptId: (await createPrompt()).id,
            startedById: rose.id,
            createdAt: eightDaysAgo,
          },
        }),
      ]);
      const url = await expectRedirect(() =>
        startConversationAction(form({ connectionId: space.id, promptId: prompt.id }))
      );
      expect(url).not.toContain("blocked=limit");
      const count = await db.conversation.count({ where: { connectionId: space.id } });
      expect(count).toBe(4);
    });

    it("premium prompt on free plan redirects with blocked=premium", async () => {
      const url = await expectRedirect(() =>
        startConversationAction(form({ connectionId: space.id, promptId: premiumPrompt.id }))
      );
      expect(url).toContain("blocked=premium");
      const count = await db.conversation.count({ where: { connectionId: space.id } });
      expect(count).toBe(0);
    });

    it("premium prompt is accessible if partner has premium subscription", async () => {
      await db.subscription.create({
        data: { userId: leo.id, planCode: "PREMIUM", status: "ACTIVE", provider: "MOCK" },
      });
      const url = await expectRedirect(() =>
        startConversationAction(form({ connectionId: space.id, promptId: premiumPrompt.id }))
      );
      expect(url).not.toContain("blocked=premium");
      const count = await db.conversation.count({ where: { connectionId: space.id } });
      expect(count).toBe(1);
    });

    it("addResponseAction creates response and one unread notification for partner", async () => {
      const conv = await db.conversation.create({
        data: { connectionId: space.id, promptId: (await createPrompt()).id, startedById: rose.id },
      });
      await addResponseAction({}, form({ conversationId: conv.id, body: "Hi" }));
      const responses = await db.promptResponse.count({ where: { conversationId: conv.id } });
      expect(responses).toBe(1);
      const notifications = await db.notification.count({
        where: { userId: leo.id, type: "NEW_RESPONSE", readAt: null },
      });
      expect(notifications).toBe(1);
    });

    it("second response does not create second unread notification for same conversation", async () => {
      const conv = await db.conversation.create({
        data: { connectionId: space.id, promptId: (await createPrompt()).id, startedById: rose.id },
      });
      await addResponseAction({}, form({ conversationId: conv.id, body: "Hi" }));
      await addResponseAction({}, form({ conversationId: conv.id, body: "Bye" }));
      const notifications = await db.notification.count({
        where: { userId: leo.id, type: "NEW_RESPONSE", readAt: null },
      });
      expect(notifications).toBe(1);
    });

    it("completeConversationAction with saveAsMemory creates conversation memory", async () => {
      const conv = await db.conversation.create({
        data: { connectionId: space.id, promptId: (await createPrompt()).id, startedById: rose.id },
      });
      await addResponseAction({}, form({ conversationId: conv.id, body: "Rose says hi" }));
      signIn(leo);
      await addResponseAction({}, form({ conversationId: conv.id, body: "Leo says hi" }));
      signIn(rose);
      const url = await expectRedirect(() =>
        completeConversationAction(form({ conversationId: conv.id, saveAsMemory: "on" }))
      );
      expect(url).toBe(`/spaces/${space.id}/talk/${conv.id}?notice=saved`);
      const completed = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(completed?.status).toBe("COMPLETED");
      const memories = await db.memory.count({
        where: { connectionId: space.id, type: "CONVERSATION" },
      });
      expect(memories).toBe(1);
      const memory = await db.memory.findFirst({
        where: { connectionId: space.id, type: "CONVERSATION" },
      });
      expect(memory?.body).toContain("Rose");
      expect(memory?.body).toContain("Leo");
    });

    it("response after completed conversation returns error", async () => {
      const conv = await db.conversation.create({
        data: { connectionId: space.id, promptId: (await createPrompt()).id, startedById: rose.id },
      });
      await db.conversation.update({ where: { id: conv.id }, data: { status: "COMPLETED" } });
      const result = await addResponseAction({}, form({ conversationId: conv.id, body: "Hi" }));
      expect(result).toEqual({ error: "This conversation is finished. Start a new one any time." });
    });

    it("when space has 30 memories, completing with saveAsMemory redirects with notice=memory-full", async () => {
      await db.memory.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
          connectionId: space.id,
          createdById: rose.id,
          type: "STORY",
          title: `Memory ${i}`,
          body: `Body ${i}`,
        })),
      });
      const conv = await db.conversation.create({
        data: { connectionId: space.id, promptId: (await createPrompt()).id, startedById: rose.id },
      });
      await addResponseAction({}, form({ conversationId: conv.id, body: "Hi" }));
      signIn(leo);
      await addResponseAction({}, form({ conversationId: conv.id, body: "Hi" }));
      signIn(rose);
      const url = await expectRedirect(() =>
        completeConversationAction(form({ conversationId: conv.id, saveAsMemory: "on" }))
      );
      expect(url).toContain("notice=memory-full");
      const memories = await db.memory.count({ where: { connectionId: space.id } });
      expect(memories).toBe(30);
    });
  });

  describe("activities", () => {
    it("starts an activity and redirects to session", async () => {
      const url = await expectRedirect(() =>
        startActivityAction(form({ connectionId: space.id, activityId: activity.id }))
      );
      expect(url).toMatch(new RegExp(`^/spaces/${space.id}/sessions/[a-z0-9]+$`));
      const count = await db.activitySession.count({ where: { connectionId: space.id } });
      expect(count).toBe(1);
    });

    it("starting the same activity again redirects to the same session", async () => {
      const session = await db.activitySession.create({
        data: { connectionId: space.id, activityId: activity.id, startedById: rose.id },
      });
      const url = await expectRedirect(() =>
        startActivityAction(form({ connectionId: space.id, activityId: activity.id }))
      );
      expect(url).toBe(`/spaces/${space.id}/sessions/${session.id}`);
      const count = await db.activitySession.count({ where: { connectionId: space.id } });
      expect(count).toBe(1);
    });

    it("free plan: second different activity in same week is blocked", async () => {
      const activity2 = await createActivity({ isPremium: false });
      await db.activitySession.create({
        data: { connectionId: space.id, activityId: activity.id, startedById: rose.id },
      });
      const url = await expectRedirect(() =>
        startActivityAction(form({ connectionId: space.id, activityId: activity2.id }))
      );
      expect(url).toContain("blocked=limit");
      const count = await db.activitySession.count({ where: { connectionId: space.id } });
      expect(count).toBe(1);
    });

    it("goToStepAction clamps step to steps + 1", async () => {
      const session = await db.activitySession.create({
        data: { connectionId: space.id, activityId: activity.id, startedById: rose.id },
      });
      await expectRedirect(() =>
        goToStepAction(form({ sessionId: session.id, step: "99" }))
      );
      const updated = await db.activitySession.findUnique({ where: { id: session.id } });
      expect(updated?.currentStep).toBe(4);
    });

    it("addStepNoteAction stores note with given stepOrder", async () => {
      const session = await db.activitySession.create({
        data: { connectionId: space.id, activityId: activity.id, startedById: rose.id },
      });
      await addStepNoteAction({}, form({ sessionId: session.id, stepOrder: "2", body: "Note" }));
      const notes = await db.activityNote.findMany({
        where: { sessionId: session.id },
      });
      expect(notes).toHaveLength(1);
      expect(notes[0].stepOrder).toBe(2);
      expect(notes[0].body).toBe("Note");
    });

    it("completeActivityAction with saveAsMemory creates activity memory", async () => {
      const session = await db.activitySession.create({
        data: { connectionId: space.id, activityId: activity.id, startedById: rose.id },
      });
      await addStepNoteAction({}, form({ sessionId: session.id, stepOrder: "1", body: "Step note" }));
      const url = await expectRedirect(() =>
        completeActivityAction(
          {},
          form({ sessionId: session.id, reflection: "We laughed a lot", saveAsMemory: "on" })
        )
      );
      expect(url).toBe(`/spaces/${space.id}/sessions/${session.id}?notice=saved`);
      const completed = await db.activitySession.findUnique({ where: { id: session.id } });
      expect(completed?.status).toBe("COMPLETED");
      const memories = await db.memory.count({
        where: { connectionId: space.id, type: "ACTIVITY" },
      });
      expect(memories).toBe(1);
      const memory = await db.memory.findFirst({
        where: { connectionId: space.id, type: "ACTIVITY" },
      });
      expect(memory?.body).toContain("We laughed a lot");
    });
  });

  describe("memories", () => {
    it("createMemoryAction STORY redirects and partner gets notification", async () => {
      const url = await expectRedirect(() =>
        createMemoryAction(
          {},
          form({
            connectionId: space.id,
            type: "STORY",
            title: "Title",
            body: "Body",
          })
        )
      );
      expect(url).toMatch(new RegExp(`^/spaces/${space.id}/memories/[a-z0-9]+[?]notice=created$`));
      const memories = await db.memory.count({ where: { connectionId: space.id } });
      expect(memories).toBe(1);
      const notifications = await db.notification.count({
        where: { userId: leo.id, type: "MEMORY_ADDED", readAt: null },
      });
      expect(notifications).toBe(1);
    });

    it("createMemoryAction without title returns fieldErrors.title", async () => {
      const result = await createMemoryAction(
        {},
        form({
          connectionId: space.id,
          type: "STORY",
          title: "",
          body: "Body",
        })
      );
      expect(result.fieldErrors?.title?.[0]).toBeTruthy();
      expect(await db.memory.count({ where: { connectionId: space.id } })).toBe(0);
    });

    it("createMemoryAction PHOTO without file returns fieldErrors.photo", async () => {
      const result = await createMemoryAction(
        {},
        form({
          connectionId: space.id,
          type: "PHOTO",
          title: "Title",
          body: "Body",
        })
      );
      expect(result).toEqual({
        fieldErrors: { photo: ["Please choose a photo."] },
      });
    });

    it("createMemoryAction PHOTO with real tiny PNG creates Photo and memory, then deletes file", async () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
        0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const file = new File([pngBytes], "a.png", { type: "image/png" });
      const url = await expectRedirect(() =>
        createMemoryAction(
          {},
          form({
            connectionId: space.id,
            type: "PHOTO",
            title: "Title",
            body: "Body",
            photo: file,
          })
        )
      );
      expect(url).toMatch(new RegExp(`^/spaces/${space.id}/memories/[a-z0-9]+[?]notice=created$`));
      const photos = await db.photo.count({ where: { connectionId: space.id } });
      expect(photos).toBe(1);
      const memories = await db.memory.count({
        where: { connectionId: space.id, type: "PHOTO" },
      });
      expect(memories).toBe(1);
      const photo = await db.photo.findFirst({ where: { connectionId: space.id } });
      expect(photo).not.toBeNull();
      const memory = await db.memory.findFirst({
        where: { connectionId: space.id, type: "PHOTO" },
      });
      expect(memory?.photoId).toBe(photo?.id);
      expect(photo!.data.length).toBeGreaterThan(0);
    });
  });
});