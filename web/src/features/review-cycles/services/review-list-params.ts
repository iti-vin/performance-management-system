import { DEFAULT_REVIEW_PAGE_SIZE, reviewListQuerySchema, type ReviewListQueryDto } from "@pms/shared-types";

/** The All Reviews list state. It lives in the URL, so a link restores it. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

const REVIEW_LIST_PATH = "/reviews";

/**
 * Reads the URL with the contract of the API, one field at a time. A bad value becomes its
 * default and an unknown key is dropped: the API refuses both, and a stale link must still open.
 */
export function parseReviewListParams(raw: RawSearchParams): ReviewListQueryDto {
  const accepted = Object.entries(reviewListQuerySchema.shape).flatMap(([key, field]) =>
    field.safeParse(raw[key]).success ? [[key, raw[key]]] : [],
  );
  return reviewListQuerySchema.parse(Object.fromEntries(accepted));
}

/**
 * Only an administrator has the cycle state filter on the page, and only a manager has the team
 * tab. For anyone else such a value from the URL would narrow the list with no control to clear
 * it. The API decides what each account sees.
 */
export function scopeReviewParams(params: ReviewListQueryDto, role: string | undefined): ReviewListQueryDto {
  return {
    ...params,
    ...(role === "ADMIN" ? {} : { cycleState: undefined }),
    ...(params.view === "team" && role !== "MANAGER" ? { view: undefined } : {}),
  };
}

/** The query string for these params, the same for the page and the API. A default stays out of it. */
export function toReviewSearch(params: ReviewListQueryDto): string {
  const search = new URLSearchParams();
  for (const key of ["cycleId", "cycleState", "perspective", "state", "view", "department", "q"] as const) {
    const value = params[key];
    if (value) search.set(key, value);
  }
  if (params.page !== 1) search.set("page", String(params.page));
  if (params.pageSize !== DEFAULT_REVIEW_PAGE_SIZE) search.set("pageSize", String(params.pageSize));

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function buildReviewListHref(params: ReviewListQueryDto): string {
  return `${REVIEW_LIST_PATH}${toReviewSearch(params)}`;
}
