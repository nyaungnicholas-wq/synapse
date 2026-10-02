"use client";
import { useEffect, useRef, useState } from "react";
import { TextField, ChoiceCard, Fieldset, Alert, Button } from "@/components/ui";
import { SubmitButton, useActionForm } from "@/components/client";
import { saveOnboardingAction } from "@/actions/connections";
import { AGE_RANGES, RELATIONSHIP_TYPES, SIDES, GOALS, INTERESTS } from "@/lib/validation";
import { AGE_RANGE_LABELS, RELATIONSHIP_LABELS, SIDE_LABELS, GOAL_LABELS } from "@/lib/labels";

export type OnboardingDefaults = {
  firstName?: string;
  ageRange?: string;
  relationshipType?: string;
  side?: string;
  connectWithLabel?: string;
  interests?: string[];
  goals?: string[];
};

const FIELD_STEP: Record<string, number> = {
  firstName: 0,
  ageRange: 1,
  relationshipType: 2,
  side: 2,
  connectWithLabel: 3,
  interests: 4,
  goals: 5,
};

export function OnboardingForm({ next, defaults = {} }: { next: string; defaults?: OnboardingDefaults }) {
  const { state, pending, onSubmit } = useActionForm(saveOnboardingAction);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>(Array(6).fill(null));
  const firstRenderRef = useRef(true);

  // When the server rejects an answer, jump back to the step that owns it (derived during render).
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const steps = Object.keys(state.fieldErrors ?? {}).map((k) => FIELD_STEP[k] ?? 5);
    if (steps.length) setStep(Math.min(...steps));
  }

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    headingRefs.current[step]?.focus();
  }, [step]);

  const goNext = () => {
    const section = formRef.current?.querySelectorAll("section")[step];
    if (!section) return;
    const required = Array.from(section.querySelectorAll<HTMLInputElement>("input[required]"));
    const firstInvalid = required.find((input) => {
      if (input.type === "radio" || input.type === "checkbox") {
        return !Array.from(section.querySelectorAll<HTMLInputElement>(`input[name="${input.name}"]`)).some((i) => i.checked);
      }
      return input.value.trim() === "";
    });
    if (firstInvalid) {
      setError("Please answer this question to continue.");
      firstInvalid.focus();
      return;
    }
    setError(null);
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const goBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
    setError(null);
  };

  // Only block submission when no goal is chosen; otherwise React posts the form to the action.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!e.currentTarget.querySelector('input[name="goals"]:checked')) {
      e.preventDefault();
      setError("Please choose at least one goal.");
      return;
    }
    setError(null);
    onSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type === "text" && step < 5) {
      e.preventDefault();
      goNext();
    }
  };

  const progress = ((step + 1) / 6) * 100;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-6"
    >
      <input type="hidden" name="next" value={next} />
      <p aria-live="polite" className="font-semibold text-ink-soft">
        Step {step + 1} of 6
      </p>
      <div className="relative h-2 rounded-full bg-sand">
        <div
          className="h-2 rounded-full bg-clay transition-all"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        ></div>
      </div>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {/* Step 0: First name */}
      <section
        aria-labelledby="onboarding-step-0"
        hidden={step !== 0}
        className="space-y-4"
      >
        <h2
          id="onboarding-step-0"
          ref={(el) => {
            headingRefs.current[0] = el;
          }}
          tabIndex={-1}
          className="font-display text-3xl text-ink mb-6 outline-none"
        >
          What should we call you?
        </h2>
        <TextField
          label="First name"
          name="firstName"
          autoComplete="given-name"
          maxLength={60}
          required
          defaultValue={defaults.firstName}
          error={state.fieldErrors?.firstName}
        />
      </section>

      {/* Step 1: Age range */}
      <section
        aria-labelledby="onboarding-step-1"
        hidden={step !== 1}
        className="space-y-4"
      >
        <h2
          id="onboarding-step-1"
          ref={(el) => {
            headingRefs.current[1] = el;
          }}
          tabIndex={-1}
          className="font-display text-3xl text-ink mb-6 outline-none"
        >
          How old are you?
        </h2>
        <Fieldset
          legend="Age range"
          hint="This helps us suggest the right questions. We never show it to anyone."
          error={state.fieldErrors?.ageRange}
        >
          {AGE_RANGES.map(value => (
            <ChoiceCard
              key={value}
              type="radio"
              name="ageRange"
              value={value}
              label={AGE_RANGE_LABELS[value]}
              required
              defaultChecked={defaults.ageRange === value}
            />
          ))}
        </Fieldset>
      </section>

      {/* Step 2: Relationship type and side */}
      <section
        aria-labelledby="onboarding-step-2"
        hidden={step !== 2}
        className="space-y-4"
      >
        <h2
          id="onboarding-step-2"
          ref={(el) => {
            headingRefs.current[2] = el;
          }}
          tabIndex={-1}
          className="font-display text-3xl text-ink mb-6 outline-none"
        >
          Who is this for?
        </h2>
        <Fieldset
          legend="Your relationship"
          error={state.fieldErrors?.relationshipType}
        >
          {RELATIONSHIP_TYPES.map(value => (
            <ChoiceCard
              key={value}
              type="radio"
              name="relationshipType"
              value={value}
              label={RELATIONSHIP_LABELS[value]}
              required
              defaultChecked={defaults.relationshipType === value}
            />
          ))}
        </Fieldset>
        <Fieldset
          legend="In this relationship, you are…"
          error={state.fieldErrors?.side}
        >
          {SIDES.map(value => (
            <ChoiceCard
              key={value}
              type="radio"
              name="side"
              value={value}
              label={SIDE_LABELS[value]}
              required
              defaultChecked={defaults.side === value}
            />
          ))}
        </Fieldset>
      </section>

      {/* Step 3: Connect with label */}
      <section
        aria-labelledby="onboarding-step-3"
        hidden={step !== 3}
        className="space-y-4"
      >
        <h2
          id="onboarding-step-3"
          ref={(el) => {
            headingRefs.current[3] = el;
          }}
          tabIndex={-1}
          className="font-display text-3xl text-ink mb-6 outline-none"
        >
          Who would you like to connect with?
        </h2>
        <TextField
          label="Their name, or who they are to you"
          name="connectWithLabel"
          placeholder="For example: my grandson Leo"
          maxLength={80}
          required
          defaultValue={defaults.connectWithLabel}
          error={state.fieldErrors?.connectWithLabel}
        />
      </section>

      {/* Step 4: Interests */}
      <section
        aria-labelledby="onboarding-step-4"
        hidden={step !== 4}
        className="space-y-4"
      >
        <h2
          id="onboarding-step-4"
          ref={(el) => {
            headingRefs.current[4] = el;
          }}
          tabIndex={-1}
          className="font-display text-3xl text-ink mb-6 outline-none"
        >
          What do you enjoy?
        </h2>
        <Fieldset
          legend="Interests (choose any)"
          hint="Pick as many as you like, or skip this step."
        >
          {INTERESTS.map(value => (
            <ChoiceCard
              key={value}
              type="checkbox"
              name="interests"
              value={value}
              label={value}
              defaultChecked={defaults.interests?.includes(value) ?? false}
            />
          ))}
        </Fieldset>
      </section>

      {/* Step 5: Goals */}
      <section
        aria-labelledby="onboarding-step-5"
        hidden={step !== 5}
        className="space-y-4"
      >
        <h2
          id="onboarding-step-5"
          ref={(el) => {
            headingRefs.current[5] = el;
          }}
          tabIndex={-1}
          className="font-display text-3xl text-ink mb-6 outline-none"
        >
          What would you like from SYNAPSE?
        </h2>
        <Fieldset
          legend="Your goals (choose at least one)"
          error={state.fieldErrors?.goals}
        >
          {GOALS.map(value => (
            <ChoiceCard
              key={value}
              type="checkbox"
              name="goals"
              value={value}
              label={GOAL_LABELS[value]}
              defaultChecked={defaults.goals?.includes(value) ?? false}
            />
          ))}
        </Fieldset>
      </section>

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="secondary" onClick={goBack}>
            Back
          </Button>
        ) : (
          <span></span>
        )}
        {step < 5 ? (
          <Button size="lg" onClick={goNext}>
            Next
          </Button>
        ) : (
          <SubmitButton pending={pending} size="lg" pendingLabel="Saving…">
            Finish
          </SubmitButton>
        )}
      </div>
    </form>
  );
}