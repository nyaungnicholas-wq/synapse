import { describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword, randomToken, sha256, invitationCode, normalizeInvitationCode } from "@/lib/crypto";
import { cleanText, signupSchema, profileSchema, formToObject } from "@/lib/validation";
import { safeNextPath } from "@/lib/session";
import { sniffImage, stripImageMetadata, prepareImage } from "@/lib/uploads";
import { startOfWeek, isPremiumSubscription, decide, DEFAULT_PLANS } from "@/lib/entitlements";

// Mock next/headers and next/navigation for session.safeNextPath (though it doesn't use them, the module imports them)
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

describe("crypto", () => {
  describe("hashPassword & verifyPassword", () => {
    it("hashes password to scrypt format", async () => {
      const hash = await hashPassword("password123");
      expect(hash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    });

    it("verifies correct password", async () => {
      const hash = await hashPassword("password123");
      expect(await verifyPassword("password123", hash)).toBe(true);
    });

    it("rejects wrong password", async () => {
      const hash = await hashPassword("password123");
      expect(await verifyPassword("wrong", hash)).toBe(false);
    });

    it("produces different salts for same password", async () => {
      const hash1 = await hashPassword("password123");
      const hash2 = await hashPassword("password123");
      expect(hash1).not.toBe(hash2);
    });

    it("returns false for null stored", async () => {
      expect(await verifyPassword("password", null)).toBe(false);
    });

    it("returns false for malformed stored string", async () => {
      expect(await verifyPassword("password", "scrypt$123$")).toBe(false);
    });
  });

  describe("randomToken", () => {
    it("returns url-safe string of length >= 40", () => {
      const token = randomToken();
      expect(token.length).toBeGreaterThanOrEqual(40);
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });

    it("returns distinct tokens", () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) tokens.add(randomToken());
      expect(tokens.size).toBe(100);
    });
  });

  describe("sha256", () => {
    it("returns deterministic 64 hex chars", () => {
      const hash = sha256("hello");
      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
      expect(sha256("hello")).toBe(hash);
    });
  });

  describe("invitationCode", () => {
    it("matches format and excludes ambiguous chars", () => {
      const codes = Array.from({ length: 50 }, invitationCode);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/);
        expect(code).not.toMatch(/[0O1IL]/);
      });
    });
  });

  describe("normalizeInvitationCode", () => {
    it("normalizes valid input", () => {
      expect(normalizeInvitationCode(" k7qm 2xrp ")).toBe("K7QM-2XRP");
      expect(normalizeInvitationCode("K7QM2XRP")).toBe("K7QM-2XRP");
      expect(normalizeInvitationCode("k7qm-2xrp")).toBe("K7QM-2XRP");
    });

    it("rejects invalid", () => {
      expect(normalizeInvitationCode("K7QM-2XR")).toBeNull(); // too short
      expect(normalizeInvitationCode("K7QM-2XR0")).toBeNull(); // contains 0
      expect(normalizeInvitationCode("K7QM-2XRO")).toBeNull(); // contains O
      expect(normalizeInvitationCode("")).toBeNull();
    });
  });
});

describe("validation", () => {
  describe("cleanText", () => {
    it("strips control characters", () => {
      expect(cleanText("a\u0000b")).toBe("ab");
    });

    it("converts \\r\\n to \\n", () => {
      expect(cleanText("a\r\nb\r\nc")).toBe("a\nb\nc");
    });

    it("collapses 4 newlines to 2", () => {
      expect(cleanText("a\n\n\n\nb")).toBe("a\n\nb");
    });

    it("trims whitespace", () => {
      expect(cleanText("  a  ")).toBe("a");
    });
  });

  describe("signupSchema", () => {
    it("lowercases and trims email", async () => {
      const result = await signupSchema.parseAsync({ email: "  TEST@EXAMPLE.COM  ", password: "1234567890" });
      expect(result.email).toBe("test@example.com");
    });

    it("rejects invalid email", async () => {
      await expect(signupSchema.parseAsync({ email: "not-an-email", password: "1234567890" })).rejects.toThrow();
    });

    it("rejects short password", async () => {
      await expect(signupSchema.parseAsync({ email: "test@example.com", password: "123456789" })).rejects.toThrow();
    });
  });

  describe("profileSchema", () => {
    it("rejects empty goals array", async () => {
      await expect(profileSchema.parseAsync({
        firstName: "John",
        ageRange: "AGE_18_29",
        relationshipType: "GRANDPARENT_GRANDCHILD",
        side: "OLDER",
        connectWithLabel: "my person",
        interests: [],
        goals: []
      })).rejects.toThrow();
    });

    it("rejects unknown interest", async () => {
      await expect(profileSchema.parseAsync({
        firstName: "John",
        ageRange: "AGE_18_29",
        relationshipType: "GRANDPARENT_GRANDCHILD",
        side: "OLDER",
        connectWithLabel: "my person",
        interests: ["UnknownInterest"],
        goals: ["TALK_MORE_OFTEN"]
      })).rejects.toThrow();
    });
  });

  describe("formToObject", () => {
    it("turns repeated keys into arrays for listed keys", () => {
      const form = new FormData();
      form.append("foo", "1");
      form.append("foo", "2");
      form.append("bar", "single");
      const obj = formToObject(form, ["foo"]);
      expect(obj.foo).toEqual(["1", "2"]);
      expect(obj.bar).toBe("single");
    });

    it("defaults missing array keys to empty array", () => {
      const form = new FormData();
      form.append("foo", "1");
      const obj = formToObject(form, ["foo", "bar"]);
      expect(obj.foo).toEqual(["1"]);
      expect(obj.bar).toEqual([]);
    });
  });
});

describe("session.safeNextPath", () => {
  it("keeps valid relative path", () => {
    expect(safeNextPath("/invite/ABCD-EFGH")).toBe("/invite/ABCD-EFGH");
  });

  it("returns fallback for evil paths", () => {
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
  });

  it("returns fallback for non-string and undefined", () => {
    expect(safeNextPath(42)).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
  });

  it("honours custom fallback", () => {
    expect(safeNextPath("//evil.com", "/custom")).toBe("/custom");
  });
});

describe("uploads", () => {
  describe("sniffImage", () => {
    it("recognises JPEG", () => {
      expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff]))).toEqual({ mime: "image/jpeg", ext: "jpg" });
    });

    it("recognises PNG", () => {
      expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({ mime: "image/png", ext: "png" });
    });

    it("recognises WEBP", () => {
      expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]))).toEqual({ mime: "image/webp", ext: "webp" });
    });

    it("returns null for GIF", () => {
      expect(sniffImage(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull();
    });

    it("returns null for random bytes", () => {
      expect(sniffImage(new Uint8Array([0x00, 0x01]))).toBeNull();
    });
  });

  describe("stripImageMetadata", () => {
    it("removes APP1 (Exif) from JPEG", () => {
      // JPEG: SOI (ff d8), APP1 (ff e1 00 08 45 78 69 66 00 00), APP0 (ff e0 00 04 00 00), SOS (ff da ...)
      const buf = Buffer.from([
        0xff, 0xd8, // SOI
        0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // APP1 (Exif)
        0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0
        0xff, 0xda, 0x00, 0x01, 0x00, 0x00 // SOS + minimal data
      ]);
      const stripped = stripImageMetadata(buf, "image/jpeg");
      expect(stripped.includes(Buffer.from([0x45, 0x78, 0x69, 0x66]))).toBe(false); // No "Exif"
      expect(stripped.includes(Buffer.from([0xff, 0xe0, 0x00, 0x04]))).toBe(true); // APP0 kept
      expect(stripped.includes(Buffer.from([0xff, 0xda]))).toBe(true); // SOS kept
    });

    it("removes tEXt chunk from PNG", () => {
      // PNG: signature, IHDR, tEXt, IEND
      const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const ihdr = Buffer.from([
        0x00, 0x00, 0x00, 0x0d, // length = 13
        0x49, 0x48, 0x44, 0x52, // "IHDR"
        0x00, 0x00, 0x00, 0x01, // width=1
        0x00, 0x00, 0x00, 0x01, // height=1
        0x08, 0x02, 0x00, 0x00, 0x00 // bit depth, color type, compression, filter, interlace
      ]);
      // CRC for IHDR can be zero for simplicity in test
      const ihdrCrc = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const text = Buffer.from([
        0x00, 0x00, 0x00, 0x09, // length = 9 ("key\0value")
        0x74, 0x45, 0x58, 0x74, // "tEXt"
        0x6b, 0x65, 0x79, 0x00, // "key\0"
        0x76, 0x61, 0x6c, 0x75, 0x65 // "value"
      ]);
      const textCrc = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const iend = Buffer.from([
        0x00, 0x00, 0x00, 0x00, // length=0
        0x49, 0x45, 0x4e, 0x44, // "IEND"
        0x00, 0x00, 0x00, 0x00 // CRC
      ]);
      const buf = Buffer.concat([signature, ihdr, ihdrCrc, text, textCrc, iend]);
      const stripped = stripImageMetadata(buf, "image/png");
      expect(stripped.includes(text)).toBe(false); // tEXt removed
      expect(stripped.includes(iend)).toBe(true); // IEND remains
    });
  });

  describe("prepareImage", () => {
    it("rejects files that are not images, whatever their name says", async () => {
      const fake = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], "photo.jpg", { type: "image/jpeg" });
      expect(await prepareImage(fake)).toEqual({ error: "Please choose a JPEG, PNG or WebP photo." });
    });
    it("rejects files over 5 MB and empty files", async () => {
      expect(await prepareImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png"))).toHaveProperty("error");
      expect(await prepareImage(new File([], "empty.png"))).toHaveProperty("error");
    });
  });
});

describe("entitlements", () => {
  describe("startOfWeek", () => {
    it("returns Monday 00:00 UTC for Sunday input", () => {
      const sunday = new Date("2026-10-04T15:00:00Z");
      expect(startOfWeek(sunday)).toEqual(new Date("2026-09-28T00:00:00.000Z"));
    });

    it("returns same Monday 00:00 for Monday 00:30", () => {
      const monday = new Date("2026-09-28T00:30:00Z");
      expect(startOfWeek(monday)).toEqual(new Date("2026-09-28T00:00:00.000Z"));
    });
  });

  describe("isPremiumSubscription", () => {
    it("returns true for ACTIVE/TRIALING PREMIUM with no end", () => {
      expect(isPremiumSubscription({ planCode: "PREMIUM", status: "ACTIVE", currentPeriodEnd: null })).toBe(true);
      expect(isPremiumSubscription({ planCode: "PREMIUM", status: "TRIALING", currentPeriodEnd: null })).toBe(true);
    });

    it("returns true for future end", () => {
      const future = new Date(Date.now() + 86400000); // tomorrow
      expect(isPremiumSubscription({ planCode: "PREMIUM", status: "ACTIVE", currentPeriodEnd: future })).toBe(true);
    });

    it("returns false for CANCELED", () => {
      expect(isPremiumSubscription({ planCode: "PREMIUM", status: "CANCELED", currentPeriodEnd: null })).toBe(false);
    });

    it("returns false for expired", () => {
      const past = new Date(Date.now() - 86400000); // yesterday
      expect(isPremiumSubscription({ planCode: "PREMIUM", status: "ACTIVE", currentPeriodEnd: past })).toBe(false);
    });

    it("returns false for FREE plan", () => {
      expect(isPremiumSubscription({ planCode: "FREE", status: "ACTIVE", currentPeriodEnd: null })).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isPremiumSubscription(null)).toBe(false);
      expect(isPremiumSubscription(undefined)).toBe(false);
    });
  });

  describe("decide", () => {
    const freePlan = DEFAULT_PLANS.FREE;
    const premiumPlan = DEFAULT_PLANS.PREMIUM;

    it("blocks prompt when limit reached", () => {
      expect(decide("prompt", freePlan, { conversationsThisWeek: 3, activitiesThisWeek: 0, memories: 0 })).toEqual({
        allowed: false,
        reason: "limit",
        message: expect.stringContaining("3 conversations")
      });
    });

    it("allows prompt when under limit", () => {
      expect(decide("prompt", freePlan, { conversationsThisWeek: 2, activitiesThisWeek: 0, memories: 0 })).toEqual({ allowed: true });
    });

    it("blocks activity when limit reached", () => {
      expect(decide("activity", freePlan, { conversationsThisWeek: 0, activitiesThisWeek: 1, memories: 0 })).toEqual({
        allowed: false,
        reason: "limit",
        message: expect.stringContaining("1 activity")
      });
    });

    it("allows activity when under limit", () => {
      expect(decide("activity", freePlan, { conversationsThisWeek: 0, activitiesThisWeek: 0, memories: 0 })).toEqual({ allowed: true });
    });

    it("blocks memory when limit reached", () => {
      expect(decide("memory", freePlan, { conversationsThisWeek: 0, activitiesThisWeek: 0, memories: 30 })).toEqual({
        allowed: false,
        reason: "limit",
        message: expect.stringContaining("30 memories")
      });
    });

    it("allows memory when under limit", () => {
      expect(decide("memory", freePlan, { conversationsThisWeek: 0, activitiesThisWeek: 0, memories: 29 })).toEqual({ allowed: true });
    });

    it("blocks premium item on FREE", () => {
      expect(decide("prompt", freePlan, { conversationsThisWeek: 0, activitiesThisWeek: 0, memories: 0 }, true)).toEqual({
        allowed: false,
        reason: "premium",
        message: "This one is part of SYNAPSE Premium."
      });
    });

    it("allows everything on PREMIUM", () => {
      expect(decide("prompt", premiumPlan, { conversationsThisWeek: 999, activitiesThisWeek: 999, memories: 999 })).toEqual({ allowed: true });
      expect(decide("activity", premiumPlan, { conversationsThisWeek: 999, activitiesThisWeek: 999, memories: 999 })).toEqual({ allowed: true });
      expect(decide("memory", premiumPlan, { conversationsThisWeek: 999, activitiesThisWeek: 999, memories: 999 })).toEqual({ allowed: true });
    });
  });
});
