import type { EvaluatorType, ResultBehaviorDto, ResultDetailDto, ResultGoalsDto } from "@pms/shared-types";
import type { ReactNode } from "react";

import { DefinitionGrid } from "@/components/molecules/definition-grid";
import { DataTable } from "@/components/organisms/data-table";
import { EVALUATOR_TYPE_LABELS } from "@/constants/domain-labels";
import { formatScore, formatWeight } from "@/features/review-cycles/services/result-words";
import { formatWorkspaceDate } from "@/utils/workspace-date";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      <h2 className="text-pms-section-title">{title}</h2>
      {children}
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <p className="text-pms-body text-muted-foreground">{children}</p>;

const achievement = (isTargetMet: boolean | null) =>
  isTargetMet === null ? "Not scored" : isTargetMet ? "Achieved" : "Below Target";

function Goals({ goals }: { goals: ResultGoalsDto | null }) {
  if (!goals) return <Muted>Goals Performance does not apply to this cycle.</Muted>;
  return (
    <>
      <Muted>{[goals.templateName, goals.templateVersion && `v${goals.templateVersion}`].filter(Boolean).join(" · ")}</Muted>
      <DataTable
        caption="Goals Performance indicators"
        rows={goals.indicators}
        getRowId={(row) => row.indicatorId}
        emptyMessage="No indicator was frozen for this employee."
        columns={[
          { id: "name", heading: "Performance Indicator", renderCell: (row) => <span className="whitespace-normal">{row.name}</span> },
          { id: "unit", heading: "Measurement Unit", renderCell: (row) => row.unit ?? "Not set" },
          { id: "target", heading: "Target", renderCell: (row) => row.target ?? "Not set" },
          { id: "actual", heading: "Verified Actual Result", renderCell: (row) => row.actualValue ?? "Not reported" },
          { id: "achievement", heading: "Achievement Status", renderCell: (row) => achievement(row.isTargetMet) },
          { id: "score", heading: "Score", renderCell: (row) => formatScore(row.score) },
        ]}
      />
    </>
  );
}

/** The cell of one question and one perspective: a rating, or why there is none. */
function ratingWords(behavior: ResultBehaviorDto, perspective: EvaluatorType, ratings: ResultBehaviorDto["questions"][number]["ratings"]) {
  if (behavior.assessments.some((row) => row.perspective === perspective && row.isWithheld)) return "Withheld";
  const found = ratings.find((entry) => entry.perspective === perspective);
  if (found) return found.rating.toFixed(2);
  // An anonymous question with too few ratings shows none (Res-008).
  return perspective === "peer" || perspective === "upward" ? "Withheld" : "Not Observed";
}

const authorOf = (name: string | null) => name ?? "Anonymous grouped feedback";

function Behavior({ behavior }: { behavior: ResultBehaviorDto }) {
  const perspectives = [...new Set(behavior.assessments.map((row) => row.perspective))];
  const withheld = behavior.assessments.filter((row) => row.isWithheld);
  return (
    <>
      <Card title="Behavioral Performance Ratings">
        <Muted>
          Average of the observed ratings from 1 to 5. Unanswered and Not Observed answers are left out, and written answers
          are not scored. A group below the anonymity minimum is withheld.
        </Muted>
        <DataTable
          caption="Behavioral ratings"
          rows={behavior.questions}
          getRowId={(row) => row.questionId}
          emptyMessage="This template has no rating question."
          columns={[
            { id: "prompt", heading: "Behavioral Indicator", renderCell: (row) => <span className="whitespace-normal">{row.prompt}</span> },
            ...perspectives.map((perspective) => ({
              id: perspective,
              heading: EVALUATOR_TYPE_LABELS[perspective],
              renderCell: (row: ResultBehaviorDto["questions"][number]) => ratingWords(behavior, perspective, row.ratings),
            })),
          ]}
        />
      </Card>
      <Card title="Assessments">
        <DataTable
          caption="Assessment summary"
          rows={behavior.assessments}
          getRowId={(row) => `${row.perspective}-${row.evaluatorName ?? "group"}`}
          emptyMessage="No assessment was submitted."
          columns={[
            { id: "assessment", heading: "Assessment", renderCell: (row) => EVALUATOR_TYPE_LABELS[row.perspective] },
            { id: "evaluator", heading: "Evaluator", renderCell: (row) => row.evaluatorName ?? "Anonymous group" },
            {
              id: "submitted",
              heading: "Submitted",
              renderCell: (row) => (row.submittedAt ? formatWorkspaceDate(row.submittedAt) : `${row.submittedCount} submitted`),
            },
            { id: "rating", heading: "Behavioral Rating", renderCell: (row) => (row.isWithheld ? "Withheld" : formatScore(row.rating)) },
          ]}
        />
      </Card>
      <Card title="Written Feedback">
        {behavior.feedback.length === 0 && withheld.length === 0 && <Muted>No written answer.</Muted>}
        <ul className="grid gap-3">
          {behavior.feedback.map((entry, index) => (
            // Anonymous entries have no id of their own: the list never changes on this page.
            <li key={index} className="grid gap-1 text-pms-body">
              <p className="text-pms-label font-semibold">{`${EVALUATOR_TYPE_LABELS[entry.perspective]} · ${authorOf(entry.evaluatorName)}`}</p>
              <p className="text-muted-foreground">{entry.prompt}</p>
              <p className="max-w-pms-copy whitespace-pre-wrap wrap-break-word">{entry.text}</p>
            </li>
          ))}
        </ul>
        {withheld.map((row) => (
          <Muted key={row.perspective}>{`${EVALUATOR_TYPE_LABELS[row.perspective]} feedback is withheld to protect anonymity.`}</Muted>
        ))}
      </Card>
    </>
  );
}

/** One finalized result with the evidence that finalization froze (PRD 9.9). */
export function ResultDetails({ result }: { result: ResultDetailDto }) {
  const components = [
    { id: "goals", name: "Goals Performance", score: result.goalsScore, weight: result.goalsWeight },
    { id: "behavioral", name: "Behavioral Performance", score: result.behavioralScore, weight: result.behavioralWeight },
  ].filter((component) => component.weight > 0);

  return (
    <div className="grid min-w-0 gap-4">
      <Card title="Employee and Evaluation Overview">
        <DefinitionGrid
          columns={3}
          items={[
            { label: "Overall Performance Rating", value: formatScore(result.overallScore) },
            { label: "Employee Name", value: result.employeeName },
            { label: "Position", value: result.position ?? "Not set" },
            { label: "Department", value: result.department ?? "Not set" },
            { label: "Review Cycle", value: result.cycleName },
            {
              label: "Evaluation Period",
              value: `${formatWorkspaceDate(result.evaluationStart)} to ${formatWorkspaceDate(result.evaluationEnd)}`,
            },
            {
              label: "Results Visibility",
              value: result.releasedAt ? `Released on ${formatWorkspaceDate(result.releasedAt)}` : "Not released",
            },
          ]}
        />
      </Card>
      <Card title="Performance Overview">
        <DefinitionGrid
          items={components.map((component) => ({
            label: `${component.name} · ${formatWeight(component.weight)}`,
            value: formatScore(component.score),
          }))}
        />
      </Card>
      <Card title="Goals Performance">
        <Goals goals={result.goals} />
      </Card>
      {result.behavioral ? (
        <Behavior behavior={result.behavioral} />
      ) : (
        <Card title="Behavioral Performance Ratings">
          <Muted>Behavioral Performance does not apply to this cycle.</Muted>
        </Card>
      )}
      <Card title="Overall Performance Summary">
        <DataTable
          caption="Overall performance summary"
          rows={components}
          getRowId={(row) => row.id}
          emptyMessage="No component applies."
          columns={[
            { id: "name", heading: "Performance Dimension", renderCell: (row) => row.name },
            { id: "score", heading: "Score", renderCell: (row) => formatScore(row.score) },
            { id: "weight", heading: "Configured Weight", renderCell: (row) => formatWeight(row.weight) },
            {
              id: "contribution",
              heading: "Weighted Contribution",
              renderCell: (row) => formatScore(row.score === null ? null : row.score * row.weight),
            },
          ]}
        />
        <Muted>The calculation uses unrounded scores. The page rounds to two decimals.</Muted>
      </Card>
    </div>
  );
}
