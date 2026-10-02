"use client"

import { useEffect, useRef, useState } from "react";
import { TextField, TextArea, ChoiceCard, Fieldset, Alert } from "@/components/ui"
import { SubmitButton, useActionForm } from "@/components/client";
import { addResponseAction, addStepNoteAction, completeActivityAction, createMemoryAction } from "@/actions/together"

export function ResponseForm({ conversationId, label }: { conversationId: string; label: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const { state, pending, onSubmit } = useActionForm(addResponseAction);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      ;(document.getElementById("field-body") as HTMLTextAreaElement | null)?.focus()
    }
  }, [state])

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="conversationId" value={conversationId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <TextArea
        label={label}
        name="body"
        id="field-body"
        rows={5}
        maxLength={4000}
        hint="Write as much or as little as you like."
        error={state.fieldErrors?.body}
      />
      <SubmitButton pending={pending} size="lg" pendingLabel="Sharing…">
        Share my answer
      </SubmitButton>
    </form>
  )
}

export function StepNoteForm({ sessionId, stepOrder }: { sessionId: string; stepOrder: number }) {
  const formRef = useRef<HTMLFormElement>(null)
  const { state, pending, onSubmit } = useActionForm(addStepNoteAction);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      ;(document.getElementById(`note-${stepOrder}`) as HTMLTextAreaElement | null)?.focus()
    }
  }, [state, stepOrder])

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="stepOrder" value={String(stepOrder)} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <TextArea
        label="Write something down for this step (optional)"
        name="body"
        id={`note-${stepOrder}`}
        rows={3}
        error={state.fieldErrors?.body}
      />
      <SubmitButton pending={pending} variant="secondary" pendingLabel="Saving…">
        Save note
      </SubmitButton>
    </form>
  )
}

export function CompleteActivityForm({
  sessionId,
  reflectionQuestion,
  alreadySaved,
}: { sessionId: string; reflectionQuestion: string; alreadySaved: boolean }) {
  const { state, pending, onSubmit } = useActionForm(completeActivityAction);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="sessionId" value={sessionId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <TextArea
        label={reflectionQuestion}
        name="reflection"
        rows={5}
        hint="Optional — but this is often the part people treasure later."
        error={state.fieldErrors?.reflection}
      />
      {!alreadySaved && (
        <ChoiceCard
          type="checkbox"
          name="saveAsMemory"
          value="on"
          label="Save this activity to our memories"
          description="Your notes and reflection become a page in your scrapbook."
          defaultChecked
        />
      )}
      <SubmitButton pending={pending} size="lg" pendingLabel="Finishing…">
        Finish activity
      </SubmitButton>
    </form>
  )
}

export function MemoryForm({
  connectionId,
  defaultType = "STORY",
}: { connectionId: string; defaultType?: "STORY" | "MOMENT" | "PHOTO" }) {
  const [type, setType] = useState(defaultType)
  const { state, pending, onSubmit } = useActionForm(createMemoryAction);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="connectionId" value={connectionId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Fieldset legend="What are you adding?">
        <div
          onChange={(e) => {
            const t = e.target as HTMLInputElement
            if (t.name === "type") setType(t.value as typeof type)
          }}
          className="space-y-3"
        >
          <ChoiceCard
            type="radio"
            name="type"
            value="STORY"
            label="A story"
            description="Something that happened, in your own words"
            defaultChecked={defaultType === "STORY"}
          />
          <ChoiceCard
            type="radio"
            name="type"
            value="PHOTO"
            label="A photo"
            description="A picture and the story behind it"
            defaultChecked={defaultType === "PHOTO"}
          />
          <ChoiceCard
            type="radio"
            name="type"
            value="MOMENT"
            label="A favorite moment"
            description="Something small you want to remember"
            defaultChecked={defaultType === "MOMENT"}
          />
        </div>
      </Fieldset>

      <TextField
        label="Title"
        name="title"
        maxLength={120}
        required
        placeholder="For example: The summer we drove to the coast"
        error={state.fieldErrors?.title}
      />
      <TextField
        label="When was it? (optional)"
        name="whenText"
        maxLength={60}
        placeholder="For example: Summer 1968, or last Sunday"
        error={state.fieldErrors?.whenText}
      />

      {type === "PHOTO" && (
        <div className="space-y-2">
          <label htmlFor="field-photo" className="block font-semibold text-ink">
            Choose a photo
          </label>
          <input
            id="field-photo"
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={state.fieldErrors?.photo ? "field-photo-hint field-photo-error" : "field-photo-hint"}
            aria-invalid={state.fieldErrors?.photo ? true : undefined}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              // Catch oversize photos before upload, so a long story is never sent with a doomed file.
              e.currentTarget.setCustomValidity(f && f.size > 5 * 1024 * 1024 ? "That photo is larger than 5 MB. Please choose a smaller one." : "");
              e.currentTarget.reportValidity();
            }}
            className="block w-full rounded-control border-2 border-dashed border-line-strong bg-surface p-6 text-base file:mr-4 file:min-h-12 file:rounded-control file:border-0 file:bg-clay file:px-5 file:font-semibold file:text-white"
          />
          <p id="field-photo-hint" className="text-ink-muted">
            JPEG, PNG or WebP, up to 5 MB. Location data is removed before saving.
          </p>
          {state.fieldErrors?.photo && (
            <p id="field-photo-error" role="alert" className="font-semibold text-danger">
              {state.fieldErrors.photo[0]}
            </p>
          )}
        </div>
      )}

      <TextArea
        label={type === "PHOTO" ? "The story behind it (optional)" : "Tell the story"}
        name="body"
        rows={7}
        maxLength={8000}
        error={state.fieldErrors?.body}
      />

      <SubmitButton pending={pending} size="lg" pendingLabel="Saving…">
        Save to our memories
      </SubmitButton>
    </form>
  )
}