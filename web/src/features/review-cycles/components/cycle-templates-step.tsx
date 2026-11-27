"use client";

import type { ReviewCycleOptionsDto } from "@pms/shared-types";
import { DataTable } from "@/components/organisms/data-table";
import { FormSelect } from "@/components/molecules/form-select";
import { matchKpi } from "@/features/review-cycles/services/cycle-draft";

export interface TemplateChoices {
  /** A KPI template that HR chose for one employee, by employee id. */
  kpiChoices: Record<string, string>;
  behavioralDefaultId: string;
  /** A behavioral template for one position, by position text. */
  behavioralOverrides: Record<string, string>;
}

type Employee = ReviewCycleOptionsDto["employees"][number];

interface CycleTemplatesStepProps {
  /** The selected employees, as the options list them. */
  participants: readonly Employee[];
  kpiTemplates: ReviewCycleOptionsDto["kpiTemplates"];
  behavioralTemplates: ReviewCycleOptionsDto["behavioralTemplates"];
  choices: TemplateChoices;
  onChange: (choices: TemplateChoices) => void;
  /** A component that the cycle leaves out needs no template. Both apply when left out here. */
  usesGoals?: boolean;
  usesBehavioral?: boolean;
}

const USE_DEFAULT = "";

interface Template {
  templateId: string;
  name: string | null;
  version: number;
}

/**
 * How each template of one list reads, by id: its name and version. Two that still read the
 * same also show the start of their id, so HR can tell them apart.
 */
function labelsOf(templates: readonly Template[]): Map<string, string> {
  const named = templates.map(({ templateId, name, version }) => ({
    templateId,
    label: `${name ?? `Template ${templateId.slice(0, 8)}`} · v${version}`,
  }));
  const isShared = (label: string) => named.filter((other) => other.label === label).length > 1;
  return new Map(
    named.map(({ templateId, label }) => [templateId, isShared(label) ? `${label} · ${templateId.slice(0, 8)}` : label]),
  );
}

export function CycleTemplatesStep({
  participants,
  kpiTemplates,
  behavioralTemplates,
  choices,
  onChange,
  usesGoals = true,
  usesBehavioral = true,
}: CycleTemplatesStepProps) {
  const behavioralOptions = [...labelsOf(behavioralTemplates)].map(([value, label]) => ({ value, label }));
  const positions = [...new Set(participants.flatMap((person) => person.position ?? []))].sort();

  function chooseKpi(employeeId: string, templateId: string) {
    onChange({ ...choices, kpiChoices: { ...choices.kpiChoices, [employeeId]: templateId } });
  }

  function chooseOverride(position: string, templateId: string) {
    const kept = Object.fromEntries(Object.entries(choices.behavioralOverrides).filter(([key]) => key !== position));
    onChange({
      ...choices,
      behavioralOverrides: templateId === USE_DEFAULT ? kept : { ...kept, [position]: templateId },
    });
  }

  function kpiCell(person: Employee) {
    const match = matchKpi(kpiTemplates, person.position);
    if (match.kind === "matched") return `Matched: ${labelsOf([match.template]).get(match.template.templateId)}`;
    if (match.kind === "none") {
      return person.position === null
        ? "No position, so no KPI goal template can match."
        : `No published template for the position ${person.position}.`;
    }
    return (
      <FormSelect
        label={`KPI goal template for ${person.name}`}
        value={choices.kpiChoices[person.employeeId] ?? null}
        options={[...labelsOf(match.templates)].map(([value, label]) => ({ value, label }))}
        onChange={(templateId) => chooseKpi(person.employeeId, templateId)}
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-pms-section">
      <section aria-labelledby="kpi-heading" className="grid min-w-0 gap-4">
        <h2 id="kpi-heading" className="text-pms-section-title">
          Goals Performance
        </h2>
        {!usesGoals && <p className="text-pms-body text-muted-foreground">Goals Performance does not apply to this cycle.</p>}
        {usesGoals && (
          <>
        <p className="max-w-pms-copy text-pms-body text-muted-foreground">
          Each participant gets the one published template of their exact position. Choose one when several
          share the position.
        </p>
        <DataTable
          caption="KPI goal template of each participant"
          rows={participants}
          getRowId={(person) => person.employeeId}
          emptyMessage="Select participants first."
          columns={[
            { id: "name", heading: "Employee", renderCell: (person) => person.name },
            { id: "position", heading: "Position", renderCell: (person) => person.position ?? "No position" },
            { id: "kpi", heading: "Applicable KPI Goal Template", renderCell: kpiCell },
          ]}
        />
          </>
        )}
      </section>

      <section aria-labelledby="behavioral-heading" className="grid min-w-0 gap-4">
        <h2 id="behavioral-heading" className="text-pms-section-title">
          Behavioral Performance
        </h2>
        {!usesBehavioral ? (
          <p className="text-pms-body text-muted-foreground">Behavioral Performance does not apply to this cycle.</p>
        ) : behavioralOptions.length === 0 ? (
          <p className="text-pms-body text-muted-foreground">
            No behavioral template is published yet. Publish one first.
          </p>
        ) : (
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <FormSelect
              label="Default behavioral template"
              value={choices.behavioralDefaultId || null}
              options={behavioralOptions}
              onChange={(behavioralDefaultId) => onChange({ ...choices, behavioralDefaultId })}
              description="Used for every participant, unless their position has its own."
            />
            {positions.map((position) => (
              <FormSelect
                key={position}
                label={`Behavioral template for ${position}`}
                value={choices.behavioralOverrides[position] ?? USE_DEFAULT}
                options={[{ value: USE_DEFAULT, label: "Use the default" }, ...behavioralOptions]}
                onChange={(templateId) => chooseOverride(position, templateId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
