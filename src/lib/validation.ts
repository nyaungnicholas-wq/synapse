import { z } from "zod";

/**
 * Plain-text input cleanup applied to every free-text field before it is stored:
 * trims, normalises newlines, removes control characters and collapses runs of blank lines.
 * User text is only ever rendered as text by React, never as HTML.
 */
export function cleanText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const text = (max: number, min = 1) =>
  z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, min === 1 ? "Please fill this in." : `Please write at least ${min} characters.`)
        .max(max, `Please keep this under ${max} characters.`),
    );

export const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? cleanText(v) : ""))
    .pipe(z.string().max(max, `Please keep this under ${max} characters.`))
    .transform((v) => v || null);

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address, like name@example.com.").max(254));

export const password = z
  .string()
  .min(10, "Please use at least 10 characters.")
  .max(200, "Please use 200 characters or fewer.");

export const id = z.string().min(1).max(40).regex(/^[a-z0-9]+$/i, "Invalid id.");

export const signupSchema = z.object({ email, password, next: z.string().optional() });
export const loginSchema = z.object({ email, password: z.string().min(1, "Please enter your password.").max(200), next: z.string().optional() });
export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ token: z.string().min(10).max(200), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "The two passwords do not match.", path: ["confirm"] });

export const AGE_RANGES = ["UNDER_18", "AGE_18_29", "AGE_30_49", "AGE_50_64", "AGE_65_79", "AGE_80_PLUS"] as const;
export const RELATIONSHIP_TYPES = [
  "GRANDPARENT_GRANDCHILD",
  "PARENT_CHILD",
  "AUNT_UNCLE_NIECE_NEPHEW",
  "MENTOR_MENTEE",
  "CAREGIVER",
  "FRIENDS",
  "OTHER",
] as const;
export const SIDES = ["OLDER", "YOUNGER"] as const;
export const GOALS = ["TALK_MORE_OFTEN", "LEARN_ABOUT_LIVES", "PRESERVE_STORIES", "UNDERSTAND_EACH_OTHER", "MEANINGFUL_TIME"] as const;
export const TEXT_SIZES = ["STANDARD", "LARGE", "EXTRA_LARGE"] as const;
export const INTERESTS = [
  "Music",
  "Cooking",
  "Gardening",
  "Sports",
  "Travel",
  "Books",
  "Movies & TV",
  "Games",
  "History",
  "Faith",
  "Art & crafts",
  "Technology",
  "Nature",
  "Pets",
  "Fashion",
  "Family history",
] as const;

export const profileSchema = z.object({
  firstName: text(60),
  ageRange: z.enum(AGE_RANGES, "Please choose an age range."),
  relationshipType: z.enum(RELATIONSHIP_TYPES, "Please choose a relationship."),
  side: z.enum(SIDES, "Please choose one."),
  connectWithLabel: text(80),
  interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length).default([]),
  goals: z.array(z.enum(GOALS)).min(1, "Please choose at least one goal.").max(GOALS.length),
});

export type FieldErrors = Record<string, string[] | undefined>;

/** Shape returned by every form server action and consumed by useActionState. */
export type ActionState = { ok?: boolean; message?: string; error?: string; fieldErrors?: FieldErrors };

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/** Reads a FormData into a plain object; repeated keys (checkbox groups) become arrays. */
export function formToObject(form: FormData, arrayKeys: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    const values = form.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = arrayKeys.includes(key) ? values : values[0];
  }
  for (const key of arrayKeys) out[key] ??= [];
  return out;
}
