import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createSpace, createUser, resetDb } from "./helpers";
import { getSpace } from "@/lib/spaces";

vi.mock("next/navigation", async () => (await import("./helpers")).nextNavigationMock);

describe("test harness", () => {
  beforeEach(resetDb);

  it("uses the test database, never the dev database", async () => {
    const [{ current_database }] = await db.$queryRawUnsafe<{ current_database: string }[]>("SELECT current_database()");
    expect(current_database).toMatch(/^synapse_test/);
  });

  it("only members can open a Connection Space", async () => {
    const rose = await createUser({ name: "Rose" });
    const leo = await createUser({ name: "Leo", side: "YOUNGER" });
    const stranger = await createUser({ name: "Stranger" });
    const space = await createSpace(rose, leo);
    expect((await getSpace(space.id, rose.id))?.partner?.userId).toBe(leo.id);
    expect(await getSpace(space.id, stranger.id)).toBeNull();
  });
});
