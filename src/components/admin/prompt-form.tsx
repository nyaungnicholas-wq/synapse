"use client";

import { savePromptAction } from "@/actions/admin";
import { Alert } from "@/components/ui";
import { SelectField } from "@/components/ui";
import { TextField } from "@/components/ui";
import { TextArea } from "@/components/ui";
import { ChoiceCard } from "@/components/ui";
import { SubmitButton, useActionForm } from "@/components/client";

export type PromptFormValues = {
  id?: string;
  categoryId: string;
  text: string;
  followUp: string;
  audience: string;
  isPremium: boolean;
  featured: boolean;
  status: string;
};

export function PromptForm({
  categories,
  values,
}: {
  categories: { id: string; name: string }[];
  values?: PromptFormValues;
}) {
  const { state, pending, onSubmit } = useActionForm(savePromptAction);

  return (
    <form onSubmit={onSubmit}>
      {values?.id && (
        <input type="hidden" name="id" defaultValue={values.id} />
      )}
      <SelectField
        label="Category"
        name="categoryId"
        options={categories.map((c) => ({
          value: c.id,
          label: c.name,
        }))}
        error={state.fieldErrors?.categoryId?.[0]}
        required
      />
      <TextArea
        label="Question"
        name="text"
        rows={3}
        maxLength={300}
        hint="One specific question, written the way a thoughtful family member would ask it."
        error={state.fieldErrors?.text?.[0]}
        required
        defaultValue={values?.text ?? ""}
      />
      <TextField
        label="Follow-up question (optional)"
        name="followUp"
        maxLength={300}
        error={state.fieldErrors?.followUp?.[0]}
        defaultValue={values?.followUp ?? ""}
      />
      <SelectField
        label="Who answers"
        name="audience"
        options={[
          { value: "ANYONE", label: "Either person" },
          { value: "OLDER", label: "The older person" },
          { value: "YOUNGER", label: "The younger person" },
        ]}
        error={state.fieldErrors?.audience?.[0]}
        required
        defaultValue={values?.audience ?? "ANYONE"}
      />
      <ChoiceCard
        type="checkbox"
        name="isPremium"
        value="on"
        label="Premium only"
        defaultChecked={values?.isPremium ?? false}
      />
      <ChoiceCard
        type="checkbox"
        name="featured"
        value="on"
        label="Featured"
        defaultChecked={values?.featured ?? false}
      />
      <SelectField
        label="Status"
        name="status"
        options={[
          { value: "DRAFT", label: "Draft (hidden)" },
          { value: "PUBLISHED", label: "Published" },
        ]}
        error={state.fieldErrors?.status?.[0]}
        required
        defaultValue={values?.status ?? "DRAFT"}
      />
      {state.error && (
        <Alert tone="error" title="Error">
          {state.error}
        </Alert>
      )}
      <SubmitButton pending={pending} type="submit">Save question</SubmitButton>
    </form>
  );
}
