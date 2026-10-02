"use client";

import { useState } from "react";
import { saveActivityAction } from "@/actions/admin";
import { TextField } from "@/components/ui";
import { TextArea } from "@/components/ui";
import { SelectField } from "@/components/ui";
import { ChoiceCard } from "@/components/ui";
import { Fieldset } from "@/components/ui";
import { SubmitButton, useActionForm } from "@/components/client";

export type StepRow = { title: string; body: string; stepFor: string };
export type ActivityFormValues = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  categoryId: string;
  collectionId: string;
  estimatedMinutes: number;
  difficulty: string;
  reflectionQuestion: string;
  isPremium: boolean;
  featured: boolean;
  status: string;
  steps: StepRow[];
};

export function ActivityForm({
  categories,
  collections,
  values,
}: {
  categories: { id: string; name: string }[];
  collections: { id: string; title: string }[];
  values?: ActivityFormValues;
}) {
  const { state, pending, onSubmit } = useActionForm(saveActivityAction);
  const [steps, setSteps] = useState<StepRow[]>(
    values?.steps?.length ? values.steps : [{ title: "", body: "", stepFor: "BOTH" }]
  );

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="id" value={values?.id ?? ""} />
      <TextField
        label="Title"
        name="title"
        value={values?.title ?? ""}
        error={Array.isArray(state.fieldErrors?.title) ? state.fieldErrors?.title[0] : undefined}
      />
      <TextField
        label="URL name (slug)"
        name="slug"
        hint="Lowercase words joined by dashes, e.g. memory-lane."
        value={values?.slug ?? ""}
        error={Array.isArray(state.fieldErrors?.slug) ? state.fieldErrors?.slug[0] : undefined}
      />
      <TextField
        label="Summary"
        name="summary"
        maxLength={200}
        value={values?.summary ?? ""}
        error={Array.isArray(state.fieldErrors?.summary) ? state.fieldErrors?.summary[0] : undefined}
      />
      <TextArea
        label="Description"
        name="description"
        rows={4}
        value={values?.description ?? ""}
        error={Array.isArray(state.fieldErrors?.description) ? state.fieldErrors?.description[0] : undefined}
      />
      <SelectField
        label="Category"
        name="categoryId"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        value={values?.categoryId ?? ""}
        error={Array.isArray(state.fieldErrors?.categoryId) ? state.fieldErrors?.categoryId[0] : undefined}
      />
      <SelectField
        label="Monthly collection"
        name="collectionId"
        options={[
          { value: "", label: "None" },
          ...collections.map((c) => ({ value: c.id, label: c.title })),
        ]}
        value={values?.collectionId ?? ""}
        error={Array.isArray(state.fieldErrors?.collectionId) ? state.fieldErrors?.collectionId[0] : undefined}
      />
      <TextField
        label="Minutes"
        name="estimatedMinutes"
        type="number"
        min={1}
        max={240}
        value={values?.estimatedMinutes?.toString() ?? ""}
        error={Array.isArray(state.fieldErrors?.estimatedMinutes) ? state.fieldErrors?.estimatedMinutes[0] : undefined}
      />
      <SelectField
        label="Difficulty"
        name="difficulty"
        options={[
          { value: "EASY", label: "Easy" },
          { value: "MEDIUM", label: "Some effort" },
          { value: "INVOLVED", label: "A bigger project" },
        ]}
        value={values?.difficulty ?? "EASY"}
        error={Array.isArray(state.fieldErrors?.difficulty) ? state.fieldErrors?.difficulty[0] : undefined}
      />
      <TextArea
        label="Reflection question"
        name="reflectionQuestion"
        rows={2}
        value={values?.reflectionQuestion ?? ""}
        error={Array.isArray(state.fieldErrors?.reflectionQuestion) ? state.fieldErrors?.reflectionQuestion[0] : undefined}
      />
      <Fieldset legend="" hint="">
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
      </Fieldset>
      <SelectField
        label="Status"
        name="status"
        options={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
        ]}
        value={values?.status ?? "DRAFT"}
        error={Array.isArray(state.fieldErrors?.status) ? state.fieldErrors?.status[0] : undefined}
      />

      <Fieldset legend="Steps">
        {state.fieldErrors?.steps && (
          <p role="alert" className="text-danger">
            {Array.isArray(state.fieldErrors?.steps) ? state.fieldErrors?.steps[0] : state.fieldErrors?.steps}
          </p>
        )}
        {steps.map((step, i) => (
          <div key={i} className="border rounded-control p-4 mb-4">
            <div className="flex items-baseline mb-2">
              <h3 className="text-lg font-display">Step {i + 1}</h3>
            </div>
            <div className="grid gap-2">
              <TextField
                label="Step title"
                name="stepTitle"
                id={`step-${i}-title`}
                value={step.title}
                onChange={(e) => {
                  const newSteps = [...steps];
                  newSteps[i] = { ...newSteps[i], title: e.target.value };
                  setSteps(newSteps);
                }}
              />
              <TextArea
                label="Instructions"
                name="stepBody"
                id={`step-${i}-body`}
                rows={3}
                value={step.body}
                onChange={(e) => {
                  const newSteps = [...steps];
                  newSteps[i] = { ...newSteps[i], body: e.target.value };
                  setSteps(newSteps);
                }}
              />
              <SelectField
                label="Who does it"
                name="stepFor"
                id={`step-${i}-for`}
                options={[
                  { value: "BOTH", label: "Both" },
                  { value: "OLDER", label: "Older person" },
                  { value: "YOUNGER", label: "Younger person" },
                ]}
                value={step.stepFor}
                onChange={(e) => {
                  const newSteps = [...steps];
                  newSteps[i] = { ...newSteps[i], stepFor: e.target.value };
                  setSteps(newSteps);
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (i === 0) return;
                    const newSteps = [...steps];
                    [newSteps[i - 1], newSteps[i]] = [newSteps[i], newSteps[i - 1]];
                    setSteps(newSteps);
                  }}
                  disabled={i === 0}
                  className="min-h-12 px-4 rounded-control border border-line-strong bg-surface text-ink hover:bg-sand transition-colors"
                >
                  Move up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (i === steps.length - 1) return;
                    const newSteps = [...steps];
                    [newSteps[i], newSteps[i + 1]] = [newSteps[i + 1], newSteps[i]];
                    setSteps(newSteps);
                  }}
                  disabled={i === steps.length - 1}
                  className="min-h-12 px-4 rounded-control border border-line-strong bg-surface text-ink hover:bg-sand transition-colors"
                >
                  Move down
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (steps.length <= 1) return;
                    const newSteps = steps.filter((_, index) => index !== i);
                    setSteps(newSteps);
                  }}
                  disabled={steps.length <= 1}
                  className="min-h-12 px-4 rounded-control border border-line-strong bg-surface text-ink hover:bg-sand transition-colors"
                >
                  Remove step
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            if (steps.length >= 12) return;
            setSteps([...steps, { title: "", body: "", stepFor: "BOTH" }]);
          }}
          className="min-h-12 px-4 rounded-control border border-line-strong bg-surface text-ink hover:bg-sand transition-colors"
        >
          Add a step
        </button>
      </Fieldset>

      <SubmitButton pending={pending} type="submit">Save activity</SubmitButton>
    </form>
  );
}
