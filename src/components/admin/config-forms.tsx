"use client";

import { saveCategoryAction } from "@/actions/admin";
import { savePlanAction } from "@/actions/admin";
import { updateReportAction } from "@/actions/admin";
import { saveCollectionAction } from "@/actions/admin";
import { TextField } from "@/components/ui";
import { TextArea } from "@/components/ui";
import { SelectField } from "@/components/ui";
import { ChoiceCard } from "@/components/ui";
import { SubmitButton, useActionForm } from "@/components/client";
import { Alert } from "@/components/ui";

export function CategoryForm({ values }: { values?: { id: string; kind: string; slug: string; name: string; description: string; sortOrder: number; status: string } }) {
  const { state, pending, onSubmit } = useActionForm(saveCategoryAction);
  const isEdit = !!values?.id;
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {isEdit && (
        <>
          <input type="hidden" name="id" value={values.id} />
          <input type="hidden" name="kind" value={values.kind} />
        </>
      )}
      {!isEdit && (
        <SelectField
          label="Kind"
          name="kind"
          options={[
            { value: "PROMPT", label: "Conversation prompts" },
            { value: "ACTIVITY", label: "Activities" },
          ]}
        />
      )}
      <TextField label="Name" name="name" defaultValue={values?.name ?? ""} />
      <TextField label="Slug" name="slug" defaultValue={values?.slug ?? ""} />
      <TextField label="Description" name="description" defaultValue={values?.description ?? ""} />
      <TextField
        label="Order"
        name="sortOrder"
        type="number"
        defaultValue={values?.sortOrder ?? 0}
        hint="Higher numbers appear first"
      />
      <SelectField
        label="Status"
        name="status"
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
        ]}
        defaultValue={values?.status ?? "PUBLISHED"}
      />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <SubmitButton pending={pending} type="submit">
        {isEdit ? "Save" : "Add category"}
      </SubmitButton>
    </form>
  );
}

export function PlanForm({ plan }: { plan: { code: string; name: string; priceCents: number; interval: string; features: string[]; weeklyPromptLimit: number | null; weeklyActivityLimit: number | null; memoryLimit: number | null; stripePriceId: string | null; active: boolean } }) {
  const { state, pending, onSubmit } = useActionForm(savePlanAction);
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="code" value={plan.code} />
      <TextField label="Name" name="name" defaultValue={plan.name} />
      <TextField
        label="Price in dollars"
        name="price"
        defaultValue={(plan.priceCents / 100).toFixed(2)}
        hint="Enter a price like 7.99"
      />
      <SelectField
        label="Interval"
        name="interval"
        options={[
          { value: "MONTH", label: "Per month" },
          { value: "YEAR", label: "Per year" },
        ]}
        defaultValue={plan.interval}
      />
      <TextArea
        label="Features (one per line)"
        name="features"
        defaultValue={plan.features.join("\n")}
        hint="Maximum 12 lines"
      />
      <TextField
        label="Weekly prompt limit"
        name="weeklyPromptLimit"
        type="number"
        defaultValue={plan.weeklyPromptLimit ?? ""}
        hint="Leave empty for unlimited"
      />
      <TextField
        label="Weekly activity limit"
        name="weeklyActivityLimit"
        type="number"
        defaultValue={plan.weeklyActivityLimit ?? ""}
        hint="Leave empty for unlimited"
      />
      <TextField
        label="Memory limit"
        name="memoryLimit"
        type="number"
        defaultValue={plan.memoryLimit ?? ""}
        hint="Leave empty for unlimited"
      />
      <TextField
        label="Stripe price ID (optional)"
        name="stripePriceId"
        defaultValue={plan.stripePriceId ?? ""}
      />
      <ChoiceCard
        type="checkbox"
        name="active"
        value="on"
        label="Available to new customers"
        defaultChecked={plan.active}
      />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <SubmitButton pending={pending} type="submit">Save</SubmitButton>
    </form>
  );
}

export function ReportForm({ report }: { report: { id: string; status: string; adminNote: string | null } }) {
  const { state, pending, onSubmit } = useActionForm(updateReportAction);
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="id" value={report.id} />
      <SelectField
        label="Status"
        name="status"
        options={[
          { value: "OPEN", label: "Open" },
          { value: "REVIEWED", label: "Reviewed" },
          { value: "CLOSED", label: "Closed" },
        ]}
        defaultValue={report.status}
      />
      <TextArea
        label="Note for the team"
        name="adminNote"
        defaultValue={report.adminNote ?? ""}
        rows={2}
      />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <SubmitButton pending={pending} type="submit" variant="secondary">
        Update
      </SubmitButton>
    </form>
  );
}

export function CollectionForm({ values }: { values?: { id: string; slug: string; title: string; description: string; month: string; isPremium: boolean; status: string } }) {
  const { state, pending, onSubmit } = useActionForm(saveCollectionAction);
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {values?.id && <input type="hidden" name="id" value={values.id} />}
      <TextField label="Title" name="title" defaultValue={values?.title ?? ""} />
      <TextField label="Slug" name="slug" defaultValue={values?.slug ?? ""} />
      <TextArea label="Description" name="description" defaultValue={values?.description ?? ""} rows={2} />
      <TextField label="Month" name="month" type="month" defaultValue={values?.month ?? ""} />
      <ChoiceCard
        type="checkbox"
        name="isPremium"
        value="on"
        label="Premium collection"
        defaultChecked={values?.isPremium ?? false}
      />
      <SelectField
        label="Status"
        name="status"
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
        ]}
        defaultValue={values?.status ?? "DRAFT"}
      />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <SubmitButton pending={pending} type="submit">Save</SubmitButton>
    </form>
  );
}
