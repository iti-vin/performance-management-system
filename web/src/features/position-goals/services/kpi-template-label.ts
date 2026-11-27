import type { AccomplishmentListRowDto } from "@pms/shared-types";

type TemplateFacts = Pick<AccomplishmentListRowDto, "kpiTemplateName" | "kpiTemplateVersion" | "position">;

/** The KPI template of a record, by name. An older template has none: the position names it. */
export function kpiTemplateLabel({ kpiTemplateName, kpiTemplateVersion, position }: TemplateFacts): string {
  if (kpiTemplateVersion === null) return "Not set";
  return kpiTemplateName ?? position ?? "Not set";
}
