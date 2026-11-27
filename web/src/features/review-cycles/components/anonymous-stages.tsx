"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { StageDraft, StageKind } from "@/features/review-cycles/services/cycle-draft";

export interface PeerSetup {
  /** The active employees of the company. */
  employees: readonly { employeeId: string; name: string; managerId: string | null }[];
  /** The peers of each participant, by participant. */
  choices: Readonly<Record<string, string[]>>;
  minimum: string;
  onChange: (choices: Record<string, string[]>) => void;
  onMinimumChange: (minimum: string) => void;
}

/** The order of the stages of a cycle. HR comes last. */
const ORDER: readonly StageKind[] = ["self", "manager", "peer", "upward", "hr"];
const OPTIONAL = [
  { perspective: "peer", label: "Include peer assessment" },
  { perspective: "upward", label: "Include upward assessment" },
] as const;

/** Adds or removes an optional stage, and keeps the order. */
function toggled(stages: readonly StageDraft[], perspective: StageKind, isIncluded: boolean): StageDraft[] {
  const others = stages.filter((stage) => stage.perspective !== perspective);
  const next = isIncluded ? [...others, { perspective, deadline: "", evaluatorId: "" }] : others;
  return next.toSorted((a, b) => ORDER.indexOf(a.perspective) - ORDER.indexOf(b.perspective));
}

interface AnonymousStagesProps {
  stages: readonly StageDraft[];
  participantIds: readonly string[];
  peers: PeerSetup;
  /** HR administrators read the results, so none of them is an anonymous peer. */
  hrAdminIds: readonly string[];
  onStagesChange: (stages: StageDraft[]) => void;
}

/** The optional anonymous stages: which are included, who the peers are, and the minimum below which nothing shows. */
export function AnonymousStages({ stages, participantIds, peers, hrAdminIds, onStagesChange }: AnonymousStagesProps) {
  const has = (perspective: StageKind) => stages.some((stage) => stage.perspective === perspective);
  const nameOf = (id: string) => peers.employees.find((person) => person.employeeId === id)?.name ?? "Unknown employee";

  /**
   * The people to choose from. The manager of the participant and HR administrators are left out
   * (D12), unless they are chosen already: HR then sees why and removes them.
   */
  function candidatesOf(participantId: string, chosen: readonly string[]) {
    const managerId = peers.employees.find((person) => person.employeeId === participantId)?.managerId;
    return peers.employees
      .filter((person) => person.employeeId !== participantId)
      .map((person) => ({ ...person, isBarred: person.employeeId === managerId || hrAdminIds.includes(person.employeeId) }))
      .filter((person) => !person.isBarred || chosen.includes(person.employeeId));
  }

  function choose(participantId: string, peerId: string, isChosen: boolean) {
    const others = (peers.choices[participantId] ?? []).filter((id) => id !== peerId);
    peers.onChange({ ...peers.choices, [participantId]: isChosen ? [...others, peerId] : others });
  }

  return (
    <section aria-label="Anonymous assessments" className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      <h3 className="text-pms-section-title">Peer and upward assessment</h3>
      <div className="flex flex-wrap gap-4">
        {OPTIONAL.map(({ perspective, label }) => (
          <label key={perspective} className="flex min-h-pms-touch items-center gap-2 text-pms-body">
            <Checkbox
              checked={has(perspective)}
              onCheckedChange={(checked) => onStagesChange(toggled(stages, perspective, checked === true))}
            />
            {label}
          </label>
        ))}
      </div>
      {(has("peer") || has("upward")) && (
        <Field className="max-w-48">
          <FieldLabel htmlFor="anonymity-minimum" className="text-pms-label">
            Anonymity Minimum
          </FieldLabel>
          <Input
            id="anonymity-minimum"
            type="number"
            min={2}
            max={10}
            className="min-h-pms-touch rounded-pms-control"
            value={peers.minimum}
            aria-describedby="anonymity-minimum-note"
            onChange={(event) => peers.onMinimumChange(event.target.value)}
          />
          <FieldDescription id="anonymity-minimum-note">From 2 to 10. A smaller group shows no result.</FieldDescription>
        </Field>
      )}
      {has("peer") &&
        participantIds.map((participantId) => {
          const chosen = peers.choices[participantId] ?? [];
          return (
            <details key={participantId} className="rounded-pms-control border border-border p-3">
              <summary className="min-h-pms-touch cursor-pointer content-center text-pms-body">
                {`${nameOf(participantId)}: ${chosen.length} ${chosen.length === 1 ? "peer" : "peers"} chosen`}
              </summary>
              <div className="grid gap-1 md:grid-cols-2">
                {candidatesOf(participantId, chosen).map((person) => (
                  <label key={person.employeeId} className="flex min-h-pms-touch items-center gap-2 text-pms-body">
                    <Checkbox
                      checked={chosen.includes(person.employeeId)}
                      onCheckedChange={(checked) => choose(participantId, person.employeeId, checked === true)}
                    />
                    {person.isBarred ? `${person.name} (cannot be a peer)` : person.name}
                  </label>
                ))}
              </div>
            </details>
          );
        })}
    </section>
  );
}
