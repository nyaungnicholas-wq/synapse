"use client";

import {
  TextField,
  TextArea,
  SelectField,
  ChoiceCard,
  Fieldset,
  Alert,
} from "@/components/ui";
import { SubmitButton, useActionForm } from "@/components/client";
import {
  createInviteAction,
  joinWithCodeAction,
  acceptInviteAction,
  reportConcernAction,
} from "@/actions/connections";
import {
  updateProfileAction,
  changePasswordAction,
} from "@/actions/account";
import { changeEmailAction } from "@/actions/auth";
import {
  AGE_RANGES,
  RELATIONSHIP_TYPES,
  SIDES,
  GOALS,
  INTERESTS,
  TEXT_SIZES,
} from "@/lib/validation";
import {
  AGE_RANGE_LABELS,
  RELATIONSHIP_LABELS,
  SIDE_LABELS,
  GOAL_LABELS,
  TEXT_SIZE_LABELS,
} from "@/lib/labels";

function optionsFromLabels(arr: readonly string[], labels: Record<string, string>) {
  return arr.map((v) => ({ value: v, label: labels[v] ?? v }));
}

export function InviteForm({
  connectionId,
  canEmail,
}: { connectionId?: string; canEmail: boolean }) {
  const { state, pending, onSubmit } = useActionForm(createInviteAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {connectionId && <input type="hidden" name="connectionId" value={connectionId} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      {canEmail ? (
        <TextField
          label="Their email (optional)"
          name="email"
          type="email"
          autoComplete="off"
          hint="We'll email them the link and code. Or leave this empty and share it yourself."
          error={state.fieldErrors?.email}
        />
      ) : (
        <p className="text-ink-muted">
          Confirm your own email to send invitations by email. You can still share a link or code.
        </p>
      )}
      <SubmitButton pending={pending} size="lg">Create invitation</SubmitButton>
    </form>
  );
}

export function JoinCodeForm() {
  const { state, pending, onSubmit } = useActionForm(joinWithCodeAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <TextField
        label="Invitation code"
        name="code"
        placeholder="ABCD-2345"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        hint="The code has 8 letters and numbers. Spaces and dashes don't matter."
        error={state.fieldErrors?.code}
      />
      <SubmitButton pending={pending}>Join</SubmitButton>
    </form>
  );
}

export function AcceptInviteForm({ code, inviterName }: { code: string; inviterName: string }) {
  const { state, pending, onSubmit } = useActionForm(acceptInviteAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="code" value={code} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton pending={pending} size="lg" className="w-full">
        Join {inviterName}'s Connection Space
      </SubmitButton>
    </form>
  );
}

export function ReportConcernForm({ connectionId }: { connectionId: string }) {
  const { state, pending, onSubmit } = useActionForm(reportConcernAction);
  if (state.ok) {
    return <Alert tone="success">{state.message ?? "Report sent. Thank you."}</Alert>;
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="connectionId" value={connectionId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SelectField
        label="What is happening?"
        name="reason"
        options={[
          { value: "uncomfortable", label: "Something made me uncomfortable" },
          { value: "scam", label: "I think this might be a scam" },
          { value: "harmful", label: "Someone may be at risk of harm" },
          { value: "account", label: "I think this account was taken over" },
          { value: "other", label: "Something else" },
        ]}
        error={state.fieldErrors?.reason}
      />
      <TextArea
        label="Tell us more"
        name="details"
        rows={4}
        hint="Only our safety team will read this."
        error={state.fieldErrors?.details}
      />
      <SubmitButton pending={pending} variant="secondary">Send report</SubmitButton>
    </form>
  );
}

export type ProfileDefaults = {
  firstName: string;
  ageRange: string;
  relationshipType: string;
  side: string;
  connectWithLabel: string;
  interests: string[];
  goals: string[];
  textSize: string;
};

export function ProfileForm({ profile }: { profile: ProfileDefaults }) {
  const { state, pending, onSubmit } = useActionForm(updateProfileAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <TextField
        label="First name"
        name="firstName"
        defaultValue={profile.firstName}
        error={state.fieldErrors?.firstName}
      />
      <SelectField
        label="Age range"
        name="ageRange"
        options={optionsFromLabels(AGE_RANGES, AGE_RANGE_LABELS)}
        defaultValue={profile.ageRange}
        error={state.fieldErrors?.ageRange}
      />
      <SelectField
        label="Relationship"
        name="relationshipType"
        options={optionsFromLabels(RELATIONSHIP_TYPES, RELATIONSHIP_LABELS)}
        defaultValue={profile.relationshipType}
        error={state.fieldErrors?.relationshipType}
      />
      <SelectField
        label="In this relationship, you are…"
        name="side"
        options={optionsFromLabels(SIDES, SIDE_LABELS)}
        defaultValue={profile.side}
        error={state.fieldErrors?.side}
      />
      <TextField
        label="Who you're connecting with"
        name="connectWithLabel"
        defaultValue={profile.connectWithLabel}
        error={state.fieldErrors?.connectWithLabel}
      />
      <Fieldset legend="Interests" error={state.fieldErrors?.interests}>
          {INTERESTS.map((interest) => (
            <ChoiceCard
              key={interest}
              type="checkbox"
              name="interests"
              value={interest}
              label={interest}
              defaultChecked={profile.interests.includes(interest)}
            />
          ))}
      </Fieldset>
      <Fieldset legend="Goals" error={state.fieldErrors?.goals}>
          {GOALS.map((goal) => (
            <ChoiceCard
              key={goal}
              type="checkbox"
              name="goals"
              value={goal}
              label={GOAL_LABELS[goal as keyof typeof GOAL_LABELS]}
              defaultChecked={profile.goals.includes(goal)}
            />
          ))}
      </Fieldset>
      <Fieldset
        legend="Text size"
        hint="Changes the size of all text in SYNAPSE."
        error={state.fieldErrors?.textSize}
      >
          {TEXT_SIZES.map((size) => (
            <ChoiceCard
              key={size}
              type="radio"
              name="textSize"
              value={size}
              label={TEXT_SIZE_LABELS[size as keyof typeof TEXT_SIZE_LABELS]}
              description={
                size === "STANDARD"
                  ? "Comfortable for most people"
                  : size === "LARGE"
                  ? "Easier to read"
                  : "Largest and clearest"
              }
              defaultChecked={profile.textSize === size}
            />
          ))}
      </Fieldset>
      <SubmitButton pending={pending}>Save changes</SubmitButton>
    </form>
  );
}

export function EmailForm({ currentEmail, hasPassword }: { currentEmail: string; hasPassword: boolean }) {
  const { state, pending, onSubmit } = useActionForm(changeEmailAction);
  if (!hasPassword) {
    return <p className="text-ink-soft">To change your email, first set a password below.</p>;
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <TextField
        label="New email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder={currentEmail}
        error={state.fieldErrors?.email}
      />
      <TextField
        label="Your current password"
        name="current"
        id="field-email-current"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.current}
      />
      <SubmitButton pending={pending} variant="secondary">
        Change email
      </SubmitButton>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { state, pending, onSubmit } = useActionForm(changePasswordAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      {hasPassword && (
        <TextField
          label="Current password"
          name="current"
          type="password"
          autoComplete="current-password"
          error={state.fieldErrors?.current}
        />
      )}
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        error={state.fieldErrors?.password}
      />
      <TextField
        label="Type the new password again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton pending={pending} variant="secondary">
        {hasPassword ? "Change password" : "Set a password"}
      </SubmitButton>
    </form>
  );
}