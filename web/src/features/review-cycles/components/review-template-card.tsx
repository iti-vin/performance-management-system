import type { ReviewDetailDto } from "@pms/shared-types";

/** The template that the reviewer answers, as the cycle froze its version. */
export function ReviewTemplateCard({ template }: { template: NonNullable<ReviewDetailDto["template"]> }) {
  return (
    <section aria-label="Assessment template" className="grid min-w-0 gap-1 rounded-pms-card border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-pms-section-title wrap-break-word">{template.name ?? "Behavioral assessment"}</h2>
        <span className="rounded-pms-tag bg-muted/30 px-2 text-pms-label text-muted-foreground">{`v${template.version}`}</span>
      </div>
      {template.description && <p className="max-w-pms-copy text-pms-body text-muted-foreground">{template.description}</p>}
    </section>
  );
}
