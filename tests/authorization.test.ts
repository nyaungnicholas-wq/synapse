import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { getSpace, requireSpace } from "@/lib/spaces";
import { getConversation, getMemory, listMemories } from "@/lib/queries";
import {
  addResponseAction,
  completeConversationAction,
  startConversationAction,
  toggleMemoryFavoriteAction,
  deleteMemoryAction,
  createMemoryAction,
  startActivityAction,
} from "@/actions/together";
import {
  resetDb,
  seedPlans,
  createUser,
  createSpace,
  createPrompt,
  createCategory,
  form,
  signIn,
  expectRedirect,
  RedirectSignal,
} from "./helpers";

vi.mock("next/cache", async () => (await import("./helpers")).nextCacheMock);
vi.mock("next/navigation", async () => (await import("./helpers")).nextNavigationMock);
vi.mock("next/headers", async () => (await import("./helpers")).nextHeadersMock);
vi.mock("@/lib/session", async (importOriginal) => (await import("./helpers")).sessionMock(await importOriginal()));

let rose: Awaited<ReturnType<typeof createUser>>;
let leo: Awaited<ReturnType<typeof createUser>>;
let mallory: Awaited<ReturnType<typeof createUser>>;
let max: Awaited<ReturnType<typeof createUser>>;
let spaceA: Awaited<ReturnType<typeof createSpace>>;
let spaceB: Awaited<ReturnType<typeof createSpace>>;
let prompt: Awaited<ReturnType<typeof createPrompt>>;
let convA: Awaited<ReturnType<typeof db.conversation.create>>;
let memA: Awaited<ReturnType<typeof db.memory.create>>;

beforeEach(async () => {
  await resetDb();
  await seedPlans();

  rose = await createUser({ name: "Rose", side: "OLDER" });
  leo = await createUser({ name: "Leo", side: "YOUNGER" });
  mallory = await createUser({ name: "Mallory", side: "OLDER" });
  max = await createUser({ name: "Max", side: "YOUNGER" });

  spaceA = await createSpace(rose, leo);
  spaceB = await createSpace(mallory, max);

  prompt = await createPrompt();

  convA = await db.conversation.create({
    data: { connectionId: spaceA.id, promptId: prompt.id, startedById: rose.id },
  });

  memA = await db.memory.create({
    data: {
      connectionId: spaceA.id,
      createdById: rose.id,
      type: "STORY",
      title: "Ours",
      body: "Our story",
    },
  });
});

describe("authorization: cross-space access is denied", () => {
  it("getSpace returns null for non-member; requireSpace throws 404", async () => {
    const space = await getSpace(spaceA.id, mallory.id);
    expect(space).toBeNull();

    await expect(requireSpace(spaceA.id, mallory.id)).rejects.toThrow(RedirectSignal);
    try {
      await requireSpace(spaceA.id, mallory.id);
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectSignal);
      expect((e as RedirectSignal).url).toBe("/404");
    }
  });

  it("queries filtered by wrong connectionId return nothing", async () => {
    const conv = await getConversation(convA.id, spaceB.id);
    expect(conv).toBeNull();

    const mem = await getMemory(memA.id, spaceB.id);
    expect(mem).toBeNull();

    const memories = await listMemories(spaceB.id, {});
    expect(memories.find((m) => m.id === memA.id)).toBeUndefined();
  });

  it("addResponseAction from outsider returns error and creates no PromptResponse", async () => {
    signIn(mallory);
    const result = await addResponseAction({}, form({ conversationId: convA.id, body: "hi" }));
    expect(result.error).toBeTruthy();

    const count = await db.promptResponse.count({ where: { conversationId: convA.id } });
    expect(count).toBe(0);
  });

  it("completeConversationAction from outsider redirects to dashboard and leaves conversation IN_PROGRESS", async () => {
    signIn(mallory);
    const url = await expectRedirect(() => completeConversationAction(form({ conversationId: convA.id })));
    expect(url).toBe("/dashboard");

    const conv = await db.conversation.findUnique({ where: { id: convA.id } });
    expect(conv?.status).toBe("IN_PROGRESS");
  });

  it("startConversationAction from outsider redirects to dashboard and creates no conversation", async () => {
    signIn(mallory);
    const before = await db.conversation.count({ where: { connectionId: spaceA.id } });
    const url = await expectRedirect(() => startConversationAction(form({ connectionId: spaceA.id, promptId: prompt.id })));
    expect(url).toBe("/dashboard");

    const after = await db.conversation.count({ where: { connectionId: spaceA.id } });
    expect(after).toBe(before);
  });

  it("toggleMemoryFavoriteAction and deleteMemoryAction from outsider redirect to dashboard and leave memory unchanged", async () => {
    signIn(mallory);

    const favUrl = await expectRedirect(() => toggleMemoryFavoriteAction(form({ memoryId: memA.id })));
    expect(favUrl).toBe("/dashboard");
    const memAfterFav = await db.memory.findUnique({ where: { id: memA.id } });
    expect(memAfterFav?.favorite).toBe(false);

    const delUrl = await expectRedirect(() => deleteMemoryAction(form({ memoryId: memA.id })));
    expect(delUrl).toBe("/dashboard");
    const memAfterDel = await db.memory.findUnique({ where: { id: memA.id } });
    expect(memAfterDel).not.toBeNull();
  });

  it("deleteMemoryAction: non-creator member cannot delete; creator can delete and redirect contains notice=deleted", async () => {
    signIn(leo);
    const leoDelUrl = await expectRedirect(() => deleteMemoryAction(form({ memoryId: memA.id })));
    expect(leoDelUrl).toBe("/dashboard");
    const memAfterLeo = await db.memory.findUnique({ where: { id: memA.id } });
    expect(memAfterLeo).not.toBeNull();

    signIn(rose);
    const roseDelUrl = await expectRedirect(() => deleteMemoryAction(form({ memoryId: memA.id })));
    expect(roseDelUrl).toContain("notice=deleted");
    const memAfterRose = await db.memory.findUnique({ where: { id: memA.id } });
    expect(memAfterRose).toBeNull();
  });

  it("createMemoryAction from outsider returns error and spaceA memory count unchanged", async () => {
    signIn(mallory);
    const before = await db.memory.count({ where: { connectionId: spaceA.id } });
    const result = await createMemoryAction({}, form({ connectionId: spaceA.id, type: "STORY", title: "Sneaky" }));
    expect(result.error).toBeTruthy();

    const after = await db.memory.count({ where: { connectionId: spaceA.id } });
    expect(after).toBe(before);
    expect(after).toBe(1);
  });

  it("startActivityAction from outsider redirects to dashboard and creates no ActivitySession", async () => {
    const activity = await db.activity.create({
      data: {
        slug: "test-act",
        title: "Test Activity",
        summary: "Summary",
        description: "Description",
        categoryId: (await createCategory("ACTIVITY")).id,
        estimatedMinutes: 20,
        reflectionQuestion: "What did you learn?",
        status: "PUBLISHED",
        steps: { create: [{ order: 1, title: "Step 1", body: "Do it." }] },
      },
    });

    signIn(mallory);
    const before = await db.activitySession.count({ where: { connectionId: spaceA.id } });
    const url = await expectRedirect(() => startActivityAction(form({ connectionId: spaceA.id, activityId: activity.id })));
    expect(url).toBe("/dashboard");

    const after = await db.activitySession.count({ where: { connectionId: spaceA.id } });
    expect(after).toBe(before);
  });

  it("signed out addResponseAction redirects to /login", async () => {
    signIn(null);
    try {
      await expectRedirect(() => addResponseAction({}, form({ conversationId: convA.id, body: "hi" })));
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectSignal);
      expect((e as RedirectSignal).url).toBe("/login");
    }
  });

  it("malformed conversationId throws zod error and changes nothing", async () => {
    signIn(rose);
    const before = await db.conversation.findUnique({ where: { id: convA.id } });
    await expect(completeConversationAction(form({ conversationId: "../../etc" }))).rejects.toThrow();
    const after = await db.conversation.findUnique({ where: { id: convA.id } });
    expect(after?.status).toBe(before?.status);
  });
});