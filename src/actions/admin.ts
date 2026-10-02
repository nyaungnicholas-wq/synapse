"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { type ActionState, fieldErrorsOf, formToObject, id, text, optionalText } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";

const checkbox = z.string().optional().transform((v) => v === "on");
const optionalId = z.string().optional().transform((v) => (v ? v : undefined)).pipe(id.optional());
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only.").max(80);
const optionalInt = z.string().optional().transform((v) => (v && v.trim() !== "" ? Number(v) : null)).pipe(z.number().int().min(0).max(100000).nullable());
function isUniqueError(e: unknown) { return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"; }
function isInUseError(e: unknown) { return e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2003" || e.code === "P2014"); }

export async function savePromptAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const schema = z.object({ id: optionalId, categoryId: id, text: text(300), followUp: optionalText(300), audience: z.enum(["ANYONE","OLDER","YOUNGER"]), isPremium: checkbox, featured: checkbox, status: z.enum(["DRAFT","PUBLISHED"]) });
  const parsed = schema.safeParse(formToObject(form));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  const { id: promptId, categoryId, ...data } = parsed.data;
  const cat = await db.category.findUnique({ where: { id: categoryId } });
  if (!cat || cat.kind !== "PROMPT") return { error: "Please fix the highlighted fields.", fieldErrors: { categoryId: ["Choose a prompt category."] } };
  const row = { ...data, categoryId };
  if (promptId) await db.prompt.update({ where: { id: promptId }, data: row }); else await db.prompt.create({ data: row });
  revalidatePath("/admin/prompts");
  redirect("/admin/prompts?notice=saved");
}

export async function setPromptStatusAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id, status: z.enum(["DRAFT","PUBLISHED"]) }).safeParse(formToObject(form));
  if (!parsed.success) return;
  await db.prompt.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  revalidatePath("/admin/prompts");
}

export async function togglePromptFeaturedAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id }).safeParse(formToObject(form));
  if (!parsed.success) return;
  const p = await db.prompt.findUnique({ where: { id: parsed.data.id }, select: { featured: true } });
  if (!p) return;
  await db.prompt.update({ where: { id: parsed.data.id }, data: { featured: !p.featured } });
  revalidatePath("/admin/prompts"); revalidatePath("/admin/featured");
}

export async function deletePromptAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id }).safeParse(formToObject(form));
  if (!parsed.success) return;
  try { await db.prompt.delete({ where: { id: parsed.data.id } }); }
  catch (e) { if (isInUseError(e)) redirect("/admin/prompts?error=in-use"); throw e; }
  revalidatePath("/admin/prompts");
  redirect("/admin/prompts?notice=deleted");
}

export async function saveActivityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const titles = form.getAll("stepTitle").map(String), bodies = form.getAll("stepBody").map(String), fors = form.getAll("stepFor").map(String);
  const steps = titles.map((t,i)=>({title:t.trim(),body:(bodies[i]??"").trim(),stepFor:fors[i]})).filter(s=>s.title||s.body);
  const stepSchema = z.array(z.object({title:z.string().min(1,"Each step needs a title.").max(120),body:z.string().min(1,"Each step needs instructions.").max(1000),stepFor:z.enum(["BOTH","OLDER","YOUNGER"])}))
    .min(1,"Add at least one step.").max(12);
  const stepParsed = stepSchema.safeParse(steps);
  if (!stepParsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: { steps: stepParsed.error.flatten().formErrors } };
  const schema = z.object({ id: optionalId, slug, title: text(120), summary: text(200), description: text(2000), categoryId: id, collectionId: optionalId, estimatedMinutes: z.coerce.number().int().min(1).max(240), difficulty: z.enum(["EASY","MEDIUM","INVOLVED"]), reflectionQuestion: text(300), isPremium: checkbox, featured: checkbox, status: z.enum(["DRAFT","PUBLISHED"]) });
  const parsed = schema.safeParse(formToObject(form));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  const { id: activityId, categoryId, collectionId, ...data } = parsed.data;
  const cat = await db.category.findUnique({ where: { id: categoryId } });
  if (!cat || cat.kind !== "ACTIVITY") return { error: "Please fix the highlighted fields.", fieldErrors: { categoryId: ["Choose an activity category."] } };
  try {
    await db.$transaction(async (tx) => {
      const row = { ...data, categoryId, collectionId: collectionId ?? null };
      const act = activityId
        ? await tx.activity.update({ where: { id: activityId }, data: row, select: { id: true } })
        : await tx.activity.create({ data: row, select: { id: true } });
      await tx.activityStep.deleteMany({ where: { activityId: act.id } });
      await tx.activityStep.createMany({ data: stepParsed.data.map((s,i)=>({...s,activityId:act.id,order:i+1})) });
    });
  } catch (e) { if (isUniqueError(e)) return { error: "Please fix the highlighted fields.", fieldErrors: { slug: ["That slug is already used by another activity."] } }; throw e; }
  revalidatePath("/admin/activities");
  redirect("/admin/activities?notice=saved");
}

export async function setActivityStatusAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id, status: z.enum(["DRAFT","PUBLISHED"]) }).safeParse(formToObject(form));
  if (!parsed.success) return;
  await db.activity.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  revalidatePath("/admin/activities");
}

export async function toggleActivityFeaturedAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id }).safeParse(formToObject(form));
  if (!parsed.success) return;
  const a = await db.activity.findUnique({ where: { id: parsed.data.id }, select: { featured: true } });
  if (!a) return;
  await db.activity.update({ where: { id: parsed.data.id }, data: { featured: !a.featured } });
  revalidatePath("/admin/activities"); revalidatePath("/admin/featured");
}

export async function deleteActivityAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id }).safeParse(formToObject(form));
  if (!parsed.success) return;
  try { await db.activity.delete({ where: { id: parsed.data.id } }); }
  catch (e) { if (isInUseError(e)) redirect("/admin/activities?error=in-use"); throw e; }
  revalidatePath("/admin/activities");
  redirect("/admin/activities?notice=deleted");
}

export async function saveCategoryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const schema = z.object({ id: optionalId, kind: z.enum(["PROMPT","ACTIVITY"]), slug, name: text(60), description: optionalText(240), sortOrder: z.coerce.number().int().min(0).max(1000), status: z.enum(["DRAFT","PUBLISHED"]) });
  const parsed = schema.safeParse(formToObject(form));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  const { id: catId, ...data } = parsed.data;
  try {
    if (catId) await db.category.update({ where: { id: catId }, data: { ...data, description: data.description ?? "" } });
    else await db.category.create({ data: { ...data, description: data.description ?? "" } });
  } catch (e) { if (isUniqueError(e)) return { error: "Please fix the highlighted fields.", fieldErrors: { slug: ["That slug is already used for this kind of category."] } }; throw e; }
  revalidatePath("/admin/categories");
  return { ok: true, message: "Category saved." };
}

export async function deleteCategoryAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id }).safeParse(formToObject(form));
  if (!parsed.success) return;
  try { await db.category.delete({ where: { id: parsed.data.id } }); }
  catch (e) { if (isInUseError(e)) redirect("/admin/categories?error=in-use"); throw e; }
  revalidatePath("/admin/categories");
  redirect("/admin/categories?notice=deleted");
}

export async function saveCollectionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const schema = z.object({ id: optionalId, slug, title: text(120), description: text(400), month: z.string().regex(/^\d{4}-\d{2}$/,"Choose a month."), isPremium: checkbox, status: z.enum(["DRAFT","PUBLISHED"]) });
  const parsed = schema.safeParse(formToObject(form));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  const { id: colId, month, ...data } = parsed.data;
  const monthDate = new Date(`${month}-01T00:00:00.000Z`);
  try {
    if (colId) await db.collection.update({ where: { id: colId }, data: { ...data, month: monthDate } });
    else await db.collection.create({ data: { ...data, month: monthDate } });
  } catch (e) { if (isUniqueError(e)) return { error: "Please fix the highlighted fields.", fieldErrors: { slug: ["That slug is already used by another collection."] } }; throw e; }
  revalidatePath("/admin/featured");
  return { ok: true, message: "Collection saved." };
}

export async function setCollectionStatusAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id, status: z.enum(["DRAFT","PUBLISHED"]) }).safeParse(formToObject(form));
  if (!parsed.success) return;
  await db.collection.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  revalidatePath("/admin/featured");
}

export async function savePlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const schema = z.object({ code: z.enum(["FREE","PREMIUM"]), name: text(40), price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/,"Enter a price like 7.99"), interval: z.enum(["MONTH","YEAR"]), features: z.string().max(2000), weeklyPromptLimit: optionalInt, weeklyActivityLimit: optionalInt, memoryLimit: optionalInt, stripePriceId: optionalText(120), active: checkbox });
  const parsed = schema.safeParse(formToObject(form));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  const { code, price, features, ...rest } = parsed.data;
  const priceCents = Math.round(parseFloat(price)*100);
  const featureLines = features.split("\n").map(l=>l.trim()).filter(Boolean).slice(0,12);
  await db.plan.upsert({ where: { code }, create: { code, priceCents, features: featureLines, ...rest }, update: { priceCents, features: featureLines, ...rest } });
  revalidatePath("/admin/plans"); revalidatePath("/");
  return { ok: true, message: "Plan saved." };
}

export async function setUserRoleAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z.object({ userId: id, role: z.enum(["USER","ADMIN"]) }).safeParse(formToObject(form));
  if (!parsed.success) return;
  if (parsed.data.userId === admin.id) redirect("/admin/users?error=self");
  await db.user.update({ where: { id: parsed.data.userId }, data: { role: parsed.data.role } });
  revalidatePath("/admin/users");
}

export async function setUserStatusAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z.object({ userId: id, status: z.enum(["ACTIVE","SUSPENDED"]) }).safeParse(formToObject(form));
  if (!parsed.success) return;
  if (parsed.data.userId === admin.id) redirect("/admin/users?error=self");
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: parsed.data.userId }, data: { status: parsed.data.status } });
    if (parsed.data.status === "SUSPENDED") await tx.session.deleteMany({ where: { userId: parsed.data.userId } });
  });
  revalidatePath("/admin/users");
}

export async function updateReportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const schema = z.object({ id, status: z.enum(["OPEN","REVIEWED","CLOSED"]), adminNote: optionalText(2000) });
  const parsed = schema.safeParse(formToObject(form));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  const { id: reportId, ...data } = parsed.data;
  await db.report.update({ where: { id: reportId }, data });
  revalidatePath("/admin/reports");
  return { ok: true, message: "Report updated." };
}