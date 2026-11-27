"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  BEHAVIORAL_REVIEW_TYPES,
  TEMPLATE_VERSION_STATUSES,
  type BehavioralTemplateListResponseDto,
} from "@pms/shared-types";
import { StatusBadge } from "@/components/atoms/status-badge";
import { DataTable } from "@/components/organisms/data-table";
import { FilteredTable } from "@/components/organisms/filtered-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { BEHAVIORAL_TEMPLATE_PATH } from "@/constants/behavioral-template-path";
import {
  BEHAVIORAL_REVIEW_TYPE_LABELS,
  BEHAVIORAL_TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_VERSION_STATUS_LABELS,
  TEMPLATE_VERSION_STATUS_TONES,
} from "@/constants/domain-labels";
import { formatWorkspaceDate } from "@/utils/workspace-date";

type BehavioralTemplateRow = BehavioralTemplateListResponseDto[number];

const TABLE_LAYOUT =
  "@container min-w-0 [&_table]:min-w-2xl [&_table]:table-fixed " +
  "[&_th]:px-4 [&_th]:whitespace-normal [&_th]:text-pms-label [&_th]:text-muted-foreground " +
  "[&_td]:px-4 [&_td]:py-3 [&_td]:whitespace-normal";

/**
 * A template made before the name column existed has no name: a short id names
 * it, and its missing category and review type read as not set.
 */
export function BehavioralTemplateList({
  templates,
  isLoading = false,
}: {
  templates: BehavioralTemplateListResponseDto;
  isLoading?: boolean;
}) {
  if (!isLoading && templates.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No behavioral assessment templates yet</EmptyTitle>
          <EmptyDescription>
            A template is a form of sections and questions that evaluators answer.
            Create one to start.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const columns: ComponentProps<typeof DataTable<BehavioralTemplateRow>>["columns"] = [
    {
      id: "template",
      heading: "Template Name",
      renderCell: (row) => (
        <Link
          href={`${BEHAVIORAL_TEMPLATE_PATH}/${row.templateId}`}
          className="group/link inline-grid min-h-pms-touch content-center gap-0.5 rounded-pms-control"
        >
          <span className="font-semibold text-primary group-hover/link:underline group-focus-visible/link:underline">
            {row.name ?? `Template ${row.templateId.slice(0, 8)}`}
          </span>
          <span className="text-pms-label text-muted-foreground">
            Version {row.currentVersion}
            {row.category && ` · ${BEHAVIORAL_TEMPLATE_CATEGORY_LABELS[row.category]}`}
          </span>
        </Link>
      ),
    },
    {
      id: "description",
      heading: "Description",
      renderCell: (row) => <span className="wrap-anywhere">{row.description || "Not set"}</span>,
    },
    {
      id: "review-type",
      heading: "Review Type",
      renderCell: (row) =>
        row.reviewType ? BEHAVIORAL_REVIEW_TYPE_LABELS[row.reviewType] : "Not set",
    },
    {
      id: "questions",
      heading: "Questions",
      renderCell: (row) => <span className="tabular-nums">{row.questionCount}</span>,
    },
    {
      id: "updated",
      heading: "Last Updated",
      renderCell: (row) => (
        <span className="text-muted-foreground">
          {formatWorkspaceDate(row.updatedAt)}
        </span>
      ),
    },
    {
      id: "status",
      heading: "Status",
      renderCell: (row) => (
        <StatusBadge
          label={TEMPLATE_VERSION_STATUS_LABELS[row.status]}
          tone={TEMPLATE_VERSION_STATUS_TONES[row.status]}
        />
      ),
    },
  ];
  const getRowId = (row: BehavioralTemplateRow) => row.templateId;
  const empty = "No behavioral assessment templates yet";

  if (isLoading) {
    return (
      <div className={TABLE_LAYOUT}>
        <DataTable<BehavioralTemplateRow>
          caption="Behavioral assessment templates"
          rows={templates}
          isLoading
          getRowId={getRowId}
          emptyMessage={empty}
          columns={columns}
        />
      </div>
    );
  }

  const statusTab = (status: BehavioralTemplateRow["status"]) => ({
    value: status,
    label: TEMPLATE_VERSION_STATUS_LABELS[status],
    matches: (row: BehavioralTemplateRow) => row.status === status,
  });

  return (
    <div className={TABLE_LAYOUT}>
      <FilteredTable<BehavioralTemplateRow>
        caption="Behavioral assessment templates"
        rows={templates}
        columns={columns}
        getRowId={getRowId}
        emptyMessage={empty}
        noMatchMessage="No templates match these filters."
        searchPlaceholder="Search templates..."
        searchText={(row) => `${row.name ?? ""} ${row.description ?? ""}`}
        tabs={[{ value: "all", label: "All Templates" }, statusTab("draft"), statusTab("published")]}
        filters={[
          {
            id: "type",
            label: "Review Type",
            allLabel: "All types",
            options: BEHAVIORAL_REVIEW_TYPES.map((value) => ({ value, label: BEHAVIORAL_REVIEW_TYPE_LABELS[value] })),
            matches: (row, value) => row.reviewType === value,
          },
          {
            id: "status",
            label: "Status",
            allLabel: "All statuses",
            options: TEMPLATE_VERSION_STATUSES.map((value) => ({ value, label: TEMPLATE_VERSION_STATUS_LABELS[value] })),
            matches: (row, value) => row.status === value,
          },
        ]}
      />
    </div>
  );
}
