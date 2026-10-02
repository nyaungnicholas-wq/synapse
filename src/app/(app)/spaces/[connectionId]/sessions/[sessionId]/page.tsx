import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { goToStepAction } from "@/actions/together";
import { BackLink, Notice } from "@/components/app/bits";
import { CompleteActivityForm } from "@/components/app/forms-b";
import { Badge, ButtonLink, Card, TextArea, buttonClass, cx } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import { getActivitySession } from "@/lib/queries";
import { requireOnboardedUser } from "@/lib/session";
import { memberName, requireSpace } from "@/lib/spaces";

export const metadata = { title: "Activity in progress" };

type Note = { id: string; body: string; stepOrder: number | null; authorId: string; author: { email: string; profile: { firstName: string } | null } };

function StepButton({ sessionId, step, children, className }: { sessionId: string; step: number; children: React.ReactNode; className: string }) {
  return (
    <form action={goToStepAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="step" value={step} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

function NoteList({ notes, viewerId }: { notes: Note[]; viewerId: string }) {
  if (!notes.length) return null;
  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className={cx("rounded-control p-4", n.authorId === viewerId ? "bg-clay-soft" : "bg-sand")}>
          <p className="font-semibold">{n.authorId === viewerId ? "You" : memberName({ user: n.author })}</p>
          <p className="whitespace-pre-line text-lg">{n.body}</p>
        </li>
      ))}
    </ul>
  );
}

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string; sessionId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { connectionId, sessionId } = await params;
  const sp = await searchParams;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);
  const session = await getActivitySession(sessionId, space.id);
  if (!session) notFound();

  const { activity } = session;
  const total = activity.steps.length;
  const current = Math.min(Math.max(session.currentStep, 1), total + 1);
  const onReflection = current === total + 1;
  const step = activity.steps.find((s) => s.order === current);
  const partnerName = space.partner ? memberName(space.partner) : null;

  const forWhom = (stepFor: "BOTH" | "OLDER" | "YOUNGER") => {
    if (stepFor === "BOTH") return "Both of you";
    const m = space.members.find((x) => x.side === stepFor);
    if (!m) return stepFor === "OLDER" ? "The older one of you" : "The younger one of you";
    return m.userId === user.id ? "You" : memberName({ user: m.user });
  };
  const notesFor = (order: number | null) => session.notes.filter((n) => n.stepOrder === order);

  const header = (
    <>
      <BackLink href={`/spaces/${space.id}/activities/${activity.slug}`}>About this activity</BackLink>
      <Notice
        value={sp.notice}
        messages={{
          completed: "Activity finished. Well done, both of you.",
          saved: "Finished and saved to your memories.",
          "memory-full": "Finished. Your free scrapbook is full, so it wasn't saved.",
        }}
      />
      <div>
        <Badge>{activity.category.name}</Badge>
      </div>
      <h1 className="mt-3 font-display text-3xl sm:text-4xl">{activity.title}</h1>
    </>
  );

  if (session.status === "COMPLETED") {
    return (
      <>
        {header}
        <Card className="mt-6 flex flex-wrap items-center gap-4">
          <CheckCircle aria-hidden="true" className="size-8 text-sage" />
          <p className="flex-1 text-lg font-semibold">
            Finished {session.completedAt ? `on ${formatDate(session.completedAt)}` : ""}
          </p>
          {session.memory && (
            <ButtonLink href={`/spaces/${space.id}/memories/${session.memory.id}`} variant="secondary">
              Open in memories
            </ButtonLink>
          )}
        </Card>
        <section aria-labelledby="recap" className="mt-10 space-y-8">
          <h2 id="recap" className="font-display text-2xl">
            What you wrote
          </h2>
          {activity.steps.map((s) => (
            <div key={s.id}>
              <h3 className="mb-2 text-xl font-semibold">
                {s.order}. {s.title}
              </h3>
              {notesFor(s.order).length ? <NoteList viewerId={user.id} notes={notesFor(s.order)} /> : <p className="text-ink-muted">No notes for this step.</p>}
            </div>
          ))}
          <div>
            <h3 className="mb-2 text-xl font-semibold">Reflections</h3>
            {notesFor(null).length ? <NoteList viewerId={user.id} notes={notesFor(null)} /> : <p className="text-ink-muted">No reflections written.</p>}
          </div>
        </section>
        <ButtonLink href={`/spaces/${space.id}/activities`} className="mt-10">
          Find another activity
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      {header}

      <div className="mt-6">
        <p aria-live="polite" className="font-semibold text-ink-soft">
          {onReflection ? "Last step: talk about it together" : `Step ${current} of ${total}`}
        </p>
        <div aria-hidden="true" className="mt-2 flex gap-1">
          {Array.from({ length: total + 1 }, (_, i) => (
            <span key={i} className={cx("h-2 flex-1 rounded-full", i < current ? "bg-clay" : "bg-sand")} />
          ))}
        </div>
      </div>

      <div className="mt-8 gap-8 lg:grid lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!onReflection && step ? (
            <Card>
              <Badge tone="sage">For: {forWhom(step.stepFor)}</Badge>
              <h2 className="mt-4 font-display text-3xl">{step.title}</h2>
              <p className="mt-4 whitespace-pre-line text-xl leading-relaxed">{step.body}</p>
              <div className="mt-8 space-y-4">
                <NoteList viewerId={user.id} notes={notesFor(current)} />
              </div>
              {/* One form: the note is saved by whichever button moves you, so nothing typed is lost. */}
              <form action={goToStepAction} className="mt-6 space-y-4">
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="stepOrder" value={current} />
                <TextArea
                  label="Write something down for this step (optional)"
                  name="body"
                  id={`note-${current}`}
                  rows={3}
                  maxLength={4000}
                  hint="It is saved when you press a button below."
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {current > 1 ? (
                    <button type="submit" name="step" value={current - 1} className={buttonClass("secondary", "lg")}>
                      <ArrowLeft aria-hidden="true" className="size-5" /> Back
                    </button>
                  ) : (
                    <button type="submit" name="step" value={current} className={buttonClass("secondary", "lg")}>
                      Save note
                    </button>
                  )}
                  <button type="submit" name="step" value={current + 1} className={buttonClass("primary", "lg")}>
                    {current === total ? "On to the reflection" : "Next step"} <ArrowRight aria-hidden="true" className="size-5" />
                  </button>
                </div>
              </form>
            </Card>
          ) : (
            <Card>
              <h2 className="font-display text-3xl">Talk about it</h2>
              <p className="mt-3 font-display text-2xl text-ink-soft">{activity.reflectionQuestion}</p>
              <div className="mt-6 space-y-6">
                <NoteList viewerId={user.id} notes={notesFor(null)} />
                <CompleteActivityForm
                  sessionId={session.id}
                  reflectionQuestion={activity.reflectionQuestion}
                  alreadySaved={Boolean(session.memory)}
                />
              </div>
            </Card>
          )}

          {onReflection && (
            <StepButton sessionId={session.id} step={current - 1} className={buttonClass("secondary", "lg")}>
              <ArrowLeft aria-hidden="true" className="size-5" /> Back to the last step
            </StepButton>
          )}
          <p className="text-ink-muted">
            {partnerName
              ? `${partnerName} sees the same step when they open this activity.`
              : "Your person will see this activity when they join."}
          </p>
        </div>

        <nav aria-label="All steps" className="mt-10 lg:mt-0">
          <details className="rounded-card border border-line bg-surface p-4 lg:open:block" open>
            <summary className="min-h-12 cursor-pointer py-2 font-semibold">All steps</summary>
            <ol className="mt-2 space-y-1">
              {[...activity.steps.map((s) => ({ order: s.order, title: s.title })), { order: total + 1, title: "Talk about it" }].map((s) => (
                <li key={s.order}>
                  <StepButton
                    sessionId={session.id}
                    step={s.order}
                    className={cx(
                      "flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left hover:bg-sand",
                      s.order === current && "bg-clay-soft font-semibold text-clay-hover",
                    )}
                  >
                    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-sand text-sm">
                      {s.order <= total ? s.order : "✓"}
                    </span>
                    <span>
                      {s.title}
                      {s.order === current && <span className="sr-only"> (current step)</span>}
                    </span>
                  </StepButton>
                </li>
              ))}
            </ol>
          </details>
        </nav>
      </div>
    </>
  );
}
