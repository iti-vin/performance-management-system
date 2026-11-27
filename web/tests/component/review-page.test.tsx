import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewDetailDto } from "@pms/shared-types";
import ReviewPage from "@/app/(workspace)/reviews/[assignment-id]/page";
import { ReviewContent } from "@/app/(workspace)/reviews/[assignment-id]/review-content";

const { push, notFound, getCurrentUser, getReview, saveReviewDraft, submitReview } = vi.hoisted(() => ({
  push: vi.fn(),
  notFound: vi.fn(),
  getCurrentUser: vi.fn(),
  getReview: vi.fn(),
  saveReviewDraft: vi.fn(),
  submitReview: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), notFound }));
vi.mock("@/features/auth/services/current-user", () => ({ getCurrentUser }));
vi.mock("@/features/review-cycles/services/review-cycle-reader", () => ({ getReview }));
vi.mock("@/features/review-cycles/services/review-response", () => ({
  saveReviewDraft: async (...args: unknown[]) => saveReviewDraft(...args),
  submitReview: async (...args: unknown[]) => submitReview(...args),
}));

const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const ID = guid(301);
const CYCLE_ID = guid(141);
const QUESTION = guid(131);

const review = (change: Partial<ReviewDetailDto> = {}): ReviewDetailDto => ({
  assignmentId: ID,
  cycleId: CYCLE_ID,
  cycleName: "ZZ demo",
  cycleState: "active",
  subjectName: "Iging UserDotTech",
  subjectPosition: "Software Engineer",
  subjectDepartment: "IT",
  isAssignedToCaller: false,
  evaluatorName: "Iging ManagerDotTech",
  perspective: "manager",
  state: "not_started",
  deadline: "2026-12-11T15:59:59.000Z",
  isOverdue: false,
  canEdit: true,
  isRestricted: false,
  waitingFor: null,
  sections: [
    {
      sectionId: guid(121),
      title: "Collaboration",
      questions: [{ questionId: QUESTION, prompt: "Tell us more", questionType: "paragraph", isRequired: false, allowNotObserved: false, options: [] }],
    },
  ],
  response: null,
  reopenReason: null,
  history: [],
  stages: [],
  goals: null,
  template: { name: "Quarterly Performance", description: "Reflect on observable behaviors.", version: 2 },
  ...change,
});

async function renderContent(search: Record<string, string> = {}) {
  render(<>{await ReviewContent({ params: Promise.resolve({ "assignment-id": ID }), searchParams: Promise.resolve(search) })}</>);
}

beforeEach(() => {
  for (const mock of [push, notFound, getCurrentUser, getReview, saveReviewDraft, submitReview]) mock.mockReset();
  getCurrentUser.mockResolvedValue({ role: "ADMIN" });
  getReview.mockResolvedValue({ kind: "ok", data: review() });
  saveReviewDraft.mockResolvedValue({ message: null, fieldErrors: {} });
});

describe("ReviewContent", () => {
  it("says who is reviewed, by whom, in which cycle and stage, until when, and where it stands", async () => {
    await renderContent();

    expect(getReview).toHaveBeenCalledWith(ID);
    for (const words of ["Iging UserDotTech", "Iging ManagerDotTech", "ZZ demo", "Manager", "Dec 11, 2026", "Not Started"]) {
      expect(screen.getByText(words)).toBeTruthy();
    }
    expect(screen.queryByText("Overdue")).toBeNull();
    expect(screen.getByRole("textbox", { name: /Tell us more/ })).toBeTruthy();
  });

  it("names the employee and the position under the heading", async () => {
    await renderContent();

    expect(screen.getByRole("heading", { level: 1, name: "Review Details" })).toBeTruthy();
    expect(screen.getByText("Iging UserDotTech · Software Engineer")).toBeTruthy();
  });

  it("names the employee alone when the cycle froze no position", async () => {
    getReview.mockResolvedValue({ kind: "ok", data: review({ subjectPosition: null }) });

    await renderContent();

    expect(screen.getByRole("heading", { level: 1 }).nextElementSibling?.textContent).toBe("Iging UserDotTech");
  });

  it("shows the template of the review with its version and description, above the questions", async () => {
    await renderContent();

    const card = screen.getByRole("region", { name: "Assessment template" });
    expect(within(card).getByRole("heading", { name: "Quarterly Performance" })).toBeTruthy();
    expect(within(card).getByText("v2")).toBeTruthy();
    expect(within(card).getByText("Reflect on observable behaviors.")).toBeTruthy();
    const section = screen.getByRole("group", { name: "Collaboration" });
    expect(card.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("names an older template that has no name", async () => {
    getReview.mockResolvedValue({ kind: "ok", data: review({ template: { name: null, description: null, version: 1 } }) });

    await renderContent();

    expect(screen.getByRole("heading", { name: "Behavioral assessment" })).toBeTruthy();
  });

  it("shows no template card for a review with no template", async () => {
    getReview.mockResolvedValue({ kind: "ok", data: review({ template: null }) });

    await renderContent();

    expect(screen.queryByRole("region", { name: "Assessment template" })).toBeNull();
  });

  it("shows the position and the department of the employee in the summary", async () => {
    await renderContent();

    const summary = within(screen.getByRole("region", { name: "Review summary" }));
    expect(summary.getByText("Software Engineer")).toBeTruthy();
    expect(summary.getByText("IT")).toBeTruthy();
  });

  it("puts the way back first, above the summary and the questions", async () => {
    await renderContent();

    const back = screen.getByRole("button", { name: "Back to Reviews" });
    const summary = screen.getByRole("region", { name: "Review summary" });
    expect(back.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says Overdue as a word", async () => {
    getReview.mockResolvedValue({ kind: "ok", data: review({ isOverdue: true }) });

    await renderContent();

    expect(screen.getByText("Overdue")).toBeTruthy();
  });

  it("fills the form with the saved draft, and saves for this review", async () => {
    const answer = { questionId: QUESTION, score: null, writtenAnswer: "Steady.", optionId: null, isNotObserved: false };
    getReview.mockResolvedValue({
      kind: "ok",
      data: review({ state: "in_progress", response: { version: 1, status: "draft", submittedAt: null, answers: [answer], writtenFeedback: null } }),
    });

    await renderContent();
    expect((screen.getByRole("textbox", { name: /Tell us more/ }) as HTMLTextAreaElement).value).toBe("Steady.");
    await userEvent.setup().click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(saveReviewDraft).toHaveBeenCalledWith(ID, { answers: [answer], writtenFeedback: "" });
  });

  it.each([
    ["a locked review", { state: "locked", canEdit: false, waitingFor: "self" }, "Waiting for the Self stage."],
    ["a submitted review", { state: "submitted", canEdit: false }, "This review is submitted. It cannot be changed."],
    ["a cancelled cycle", { cycleState: "cancelled", canEdit: false }, "The cycle is not active. This review cannot be changed."],
    ["a completed cycle", { cycleState: "completed", canEdit: false }, "The cycle is completed. This review cannot be changed."],
    ["the review of another evaluator", { canEdit: false }, "Only the evaluator can change this review. Answers show after it is submitted."],
  ] as const)("explains %s, and offers no action", async (_label, change, words) => {
    getReview.mockResolvedValue({ kind: "ok", data: review(change) });

    await renderContent();

    expect(screen.getByText(words)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Save draft|Submit review/ })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it.each([
    ["a review of another evaluator", { perspective: "manager" }, "This response is restricted by the review confidentiality settings."],
    ["a peer review", { perspective: "peer", evaluatorName: "Anonymous peer" }, "The answers of this perspective are anonymous. They show only in the results, pooled."],
  ] as const)("says why %s is restricted, and shows no question (D5)", async (_what, change, words) => {
    getReview.mockResolvedValue({ kind: "ok", data: review({ ...change, isRestricted: true, canEdit: false, sections: [], stages: [], template: null }) });

    await renderContent();

    expect(screen.getByText(words)).toBeTruthy();
    expect(screen.queryByText("This review has no questions.")).toBeNull();
    expect(screen.queryByRole("button", { name: /Save as Draft|Submit Review/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Back to Reviews" })).toBeTruthy();
  });

  it("holds the submission while an earlier stage is open again, and still saves a draft", async () => {
    getReview.mockResolvedValue({ kind: "ok", data: review({ state: "in_progress", canEdit: true, waitingFor: "self" }) });

    await renderContent();

    expect(screen.getByText("Waiting for the Self stage. You can save a draft, and submit after that stage is submitted.")).toBeTruthy();
    const submit = screen.getByRole("button", { name: "Submit Review" });
    // The button stays focusable, so it says that it is disabled with ARIA.
    expect(submit).toHaveAttribute("aria-disabled", "true");
    await userEvent.setup().click(submit);
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Save as Draft" }));
    expect(saveReviewDraft).toHaveBeenCalledWith(ID, { answers: [], writtenFeedback: "" });
  });

  describe("the earlier versions (PRD Rev-006, Rec-003)", () => {
    const entry = (version: number, words: string | null, writtenFeedback: string | null, reopenReason: string | null) => ({
      version,
      submittedAt: "2026-11-26T02:00:00.000Z",
      answers: words === null ? [] : [{ questionId: QUESTION, score: null, writtenAnswer: words, optionId: null, isNotObserved: false }],
      writtenFeedback,
      reopenReason,
    });

    it("lists them after the review, closed, newest first, with the answers, the feedback, and the reason", async () => {
      getReview.mockResolvedValue({
        kind: "ok",
        data: review({ canEdit: false, history: [entry(2, "Second words.", "Old feedback.", "Wrong ratings"), entry(1, null, null, null)] }),
      });

      await renderContent();

      const region = screen.getByRole("region", { name: "Earlier versions" });
      const versions = [...region.querySelectorAll("details")];
      expect(versions.map((version) => version.querySelector("summary")?.textContent)).toEqual([
        "Version 2, submitted Nov 26, 2026",
        "Version 1, submitted Nov 26, 2026",
      ]);
      expect(versions.some((version) => version.open)).toBe(false);
      const second = within(versions[0] as HTMLElement);
      expect(second.getByText("Reopened by HR: Wrong ratings")).toBeTruthy();
      expect(second.getByRole("heading", { name: "Collaboration" })).toBeTruthy();
      expect(second.getByText("Tell us more")).toBeTruthy();
      expect(second.getByText("Second words.")).toBeTruthy();
      expect(second.getByText("Written Feedback: Old feedback.")).toBeTruthy();
      const first = within(versions[1] as HTMLElement);
      expect(first.getByText("No answer")).toBeTruthy();
      expect(first.queryByText(/Reopened by HR|Written Feedback/)).toBeNull();
      const questions = screen.getByRole("group", { name: "Collaboration" });
      expect(questions.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("shows nothing of them when there are none", async () => {
      await renderContent();

      expect(screen.queryByRole("region", { name: "Earlier versions" })).toBeNull();
    });
  });

  it("says why HR reopened the review", async () => {
    getReview.mockResolvedValue({ kind: "ok", data: review({ state: "in_progress", reopenReason: "Wrong ratings" }) });

    await renderContent();

    expect(screen.getByText("Reopened by HR: Wrong ratings")).toBeTruthy();
  });

  it("says that a reader of a reopened review sees the last submitted version", async () => {
    getReview.mockResolvedValue({
      kind: "ok",
      data: review({
        state: "in_progress",
        canEdit: false,
        reopenReason: "Wrong ratings",
        response: { version: 1, status: "submitted", submittedAt: "2026-11-26T00:00:00.000Z", answers: [], writtenFeedback: null },
      }),
    });

    await renderContent();

    expect(screen.getByText("Only the evaluator can change this review. These are the answers of the last submitted version.")).toBeTruthy();
  });

  it("goes back to the list with its filters, and never to an address that the URL carries", async () => {
    await renderContent({ cycleId: CYCLE_ID, state: "locked", returnTo: "https://example.invalid/" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Back to Reviews" }));

    expect(push).toHaveBeenCalledWith(`/reviews?cycleId=${CYCLE_ID}&state=locked`);
  });

  it("drops the administrator filters from the way back of anyone else", async () => {
    getCurrentUser.mockResolvedValue({ role: "MANAGER" });

    await renderContent({ cycleId: CYCLE_ID, cycleState: "completed", state: "locked", view: "mine" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Back to Reviews" }));

    // The cycle filter and the tab are on the page of every role.
    expect(push).toHaveBeenCalledWith(`/reviews?cycleId=${CYCLE_ID}&state=locked&view=mine`);
  });

  it("goes back to the progress of its cycle when an administrator came from there", async () => {
    await renderContent({ from: "cycle" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Back to Cycle" }));

    expect(push).toHaveBeenCalledWith(`/review-cycles/${CYCLE_ID}?tab=progress`);
  });

  it("keeps the way back to the list for anyone else, whatever the address says", async () => {
    getCurrentUser.mockResolvedValue({ role: "MANAGER" });

    await renderContent({ from: "cycle" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Back to Reviews" }));

    expect(push).toHaveBeenCalledWith("/reviews");
  });

  it("answers not found for a review that the caller cannot read", async () => {
    getReview.mockResolvedValue({ kind: "not_found" });
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(renderContent()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each([
    ["signed_out", "Session ended"],
    ["forbidden", "No company on your account"],
    ["unavailable", "Reviews are unavailable"],
  ])("shows the notice of a %s read", async (kind, title) => {
    getReview.mockResolvedValue({ kind });

    await renderContent();

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Review Details" })).toBeTruthy();
  });
});

describe("ReviewPage", () => {
  it("shows the heading, and says that the review is loading", () => {
    render(<ReviewPage params={new Promise(() => {})} searchParams={new Promise(() => {})} />);

    expect(screen.getByRole("heading", { name: "Review Details" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Loading the review");
  });
});

describe("an anonymous review", () => {
  it("tells a reader who is not the evaluator that the answers show pooled only", async () => {
    getReview.mockResolvedValue({
      kind: "ok",
      data: review({ perspective: "peer", evaluatorName: "Anonymous peer", state: "submitted", canEdit: false }),
    });

    await renderContent();

    expect(screen.getByText("The answers of this perspective are anonymous. They show only in the results, pooled.")).toBeTruthy();
  });
});

describe("Assessment Details", () => {
  const stage = (perspective: "self" | "manager", evaluatorName: string, state: "submitted" | "locked", isCurrent: boolean) => ({
    perspective,
    evaluatorName,
    deadline: "2026-12-04T15:59:59.000Z",
    state,
    isCurrent,
  });
  const STAGES = [stage("self", "Iging UserDotTech", "submitted", false), stage("manager", "Iging ManagerDotTech", "locked", true)];
  const show = async (change: Partial<ReviewDetailDto>) => {
    getReview.mockResolvedValue({ kind: "ok", data: review(change) });
    await renderContent();
  };

  it("shows each stage in order with its evaluator, due date, and status, and marks this one", async () => {
    await show({ stages: STAGES });

    const cards = within(screen.getByRole("list", { name: "Assessment stages" })).getAllByRole("listitem");
    expect(cards.map((card) => card.textContent)).toEqual([
      "1Self AssessmentIging UserDotTechDue Dec 4, 2026Submitted",
      "2Manager AssessmentIging ManagerDotTechDue Dec 4, 2026Locked",
    ]);
    expect(cards[1]).toHaveAttribute("aria-current", "step");
  });

  it("offers the goals of the participant when the API gives them", async () => {
    await show({ goals: { accomplishmentId: guid(171), status: "submitted" } });

    expect(screen.getByRole("heading", { name: "Goals Performance" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Goals" })).toHaveAttribute("href", `/goals/${guid(171)}`);
  });

  it("shows no goals card without them", async () => {
    await show({ goals: null });

    expect(screen.queryByRole("link", { name: "Open Goals" })).toBeNull();
  });

  it("takes the written feedback, starts from the saved one, and saves it", async () => {
    await show({ response: { version: 1, status: "draft", submittedAt: null, answers: [], writtenFeedback: "Half way." } });
    const user = userEvent.setup();
    const field = screen.getByRole("textbox", { name: "Written Feedback (optional)" }) as HTMLTextAreaElement;
    expect(field.value).toBe("Half way.");
    expect(field.maxLength).toBe(5000);

    await user.type(field, " Done.");
    await user.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(saveReviewDraft).toHaveBeenCalledWith(ID, { answers: [], writtenFeedback: "Half way. Done." });
  });

  it("shows the feedback of a read only review as words", async () => {
    await show({
      canEdit: false,
      state: "submitted",
      response: { version: 1, status: "submitted", submittedAt: "2026-11-26T00:00:00.000Z", answers: [], writtenFeedback: "Good quarter." },
    });

    expect(screen.getByText("Good quarter.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
