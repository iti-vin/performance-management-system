import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewSectionDto } from "@pms/shared-types";
import { EvaluatorScoringForm, type EvaluatorScoringFormProps } from "@/features/evaluations/components/evaluator-scoring-form";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [RATE, STRICT, NOTE, CHOICE, SHORT] = [guid(131), guid(132), guid(133), guid(134), guid(135)] as const;
const OFTEN = guid(901);
const BACK = "/reviews?state=not_started";

const question = (
  questionId: string,
  prompt: string,
  questionType: ReviewSectionDto["questions"][number]["questionType"],
  isRequired: boolean,
  extra: Partial<ReviewSectionDto["questions"][number]> = {},
) => ({ questionId, prompt, questionType, isRequired, allowNotObserved: false, options: [], ...extra });

const SECTIONS: ReviewSectionDto[] = [
  {
    sectionId: guid(121),
    title: "Collaboration",
    questions: [
      question(RATE, "Shares knowledge", "rating_scale", true, { allowNotObserved: true }),
      question(STRICT, "Meets commitments", "rating_scale", true),
      question(NOTE, "Tell us more", "paragraph", false),
    ],
  },
  {
    sectionId: guid(122),
    title: "Ownership",
    questions: [
      question(CHOICE, "Asks for help", "multiple_choice", true, {
        options: [
          { optionId: OFTEN, label: "Often" },
          { optionId: guid(902), label: "Rarely" },
        ],
      }),
      question(SHORT, "One strength", "short_answer", false),
    ],
  },
];
const COMPLETE = { [RATE]: "4", [STRICT]: "5", [CHOICE]: OFTEN };
const OK = { message: null, fieldErrors: {} };

const onSave = vi.fn();
const onSubmit = vi.fn();

function renderForm(props: Partial<EvaluatorScoringFormProps> = {}) {
  const all: EvaluatorScoringFormProps = {
    sections: SECTIONS,
    initialAnswers: {},
    isEditable: true,
    backHref: BACK,
    onSave,
    onSubmit,
    ...props,
  };
  return { ...render(<EvaluatorScoringForm {...all} />), props: all };
}

const box = (name: RegExp) => screen.getByRole("combobox", { name });
const ratings = (name: RegExp) => screen.getByRole("radiogroup", { name });
const rating = (question: RegExp, choice: string) => within(ratings(question)).getByRole("radio", { name: choice });
const rate = (question: RegExp, choice: string) => userEvent.setup().click(rating(question, choice));
const choicesOf = (question: RegExp) => within(ratings(question)).getAllByRole("radio").map((radio) => radio.getAttribute("aria-label"));
const completion = () => within(screen.getByRole("complementary", { name: "Review completion" }));
const NUMBERS = ["1 Never", "2 Rarely", "3 Sometimes", "4 Often", "5 Always"];
const text = (name: RegExp) => screen.getByRole("textbox", { name });
const button = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  push.mockReset();
  onSave.mockReset().mockResolvedValue(OK);
  onSubmit.mockReset().mockResolvedValue(OK);
});

describe("EvaluatorScoringForm questions", () => {
  it("shows each section with its questions, and marks the optional ones", () => {
    renderForm();

    expect(screen.getByRole("group", { name: "Collaboration" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Ownership" })).toBeTruthy();
    expect(ratings(/Shares knowledge/)).toHaveAttribute("aria-required", "true");
    expect(text(/Tell us more/)).toHaveAccessibleDescription("Optional");
    expect(text(/One strength/)).toHaveAccessibleDescription("Optional");
    expect(box(/Asks for help/)).toBeRequired();
  });

  it("numbers the sections and counts their questions", () => {
    renderForm();

    const first = screen.getByRole("group", { name: "Collaboration" });
    expect(within(first).getByText("01")).toHaveAttribute("aria-hidden", "true");
    expect(within(first).getByText("3 questions")).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Ownership" })).getByText("2 questions")).toBeTruthy();
  });

  it("offers the five ratings with their words, and Not Observed where the question allows it", () => {
    renderForm();

    expect(choicesOf(/Shares knowledge/)).toEqual([...NUMBERS, "Not Observed"]);
    expect(choicesOf(/Meets commitments/)).toEqual(NUMBERS);
    expect(rating(/Meets commitments/, "4 Often")).toHaveTextContent("4Often");
  });

  it("holds one rating of a question, chosen by a click or with the arrow keys", async () => {
    renderForm({ initialAnswers: { [STRICT]: "3" } });
    expect(rating(/Meets commitments/, "3 Sometimes")).toBeChecked();

    await rate(/Meets commitments/, "4 Often");
    expect(rating(/Meets commitments/, "4 Often")).toBeChecked();
    expect(rating(/Meets commitments/, "3 Sometimes")).not.toBeChecked();

    await userEvent.setup().keyboard("{ArrowRight}");
    await waitFor(() => expect(rating(/Meets commitments/, "5 Always")).toBeChecked());
  });

  it("clears the answer of an optional rating, and never offers that for a required one", async () => {
    const optional = question(RATE, "Mentors others", "rating_scale", false);
    renderForm({ sections: [{ sectionId: guid(121), title: "Growth", questions: [optional, SECTIONS[0]!.questions[1]!] }] });
    expect(screen.queryByRole("button", { name: /Clear answer/ })).toBeNull();

    await rate(/Mentors others/, "2 Rarely");
    await rate(/Meets commitments/, "2 Rarely");
    expect(screen.getAllByRole("button", { name: /Clear answer/ })).toHaveLength(1);
    await userEvent.setup().click(button("Clear answer to Mentors others"));

    expect(within(ratings(/Mentors others/)).queryByRole("radio", { checked: true })).toBeNull();
    await userEvent.setup().click(button("Save as Draft"));
    expect(onSave.mock.calls[0]?.[0].answers.map((answer: { questionId: string }) => answer.questionId)).toEqual([STRICT]);
  });

  it("limits a written answer to what the API takes", () => {
    renderForm();

    expect(text(/Tell us more/).getAttribute("maxlength")).toBe("5000");
  });
});

describe("EvaluatorScoringForm completion", () => {
  it("counts the required questions answered, Not Observed among them", async () => {
    renderForm();
    expect(completion().getByText("0 / 3 required questions answered")).toBeTruthy();
    expect(completion().getByText("0%")).toBeTruthy();

    await rate(/Shares knowledge/, "Not Observed");
    await userEvent.setup().type(text(/Tell us more/), "An optional note counts for nothing.");

    expect(completion().getByText("1 / 3 required questions answered")).toBeTruthy();
    expect(completion().getByText("33%")).toBeTruthy();
    expect(completion().getByRole("progressbar", { name: "Required questions answered" })).toHaveAttribute("aria-valuenow", "33");
  });

  it("is complete with no required question", () => {
    renderForm({ sections: [{ sectionId: guid(121), title: "Notes", questions: [SECTIONS[0]!.questions[2]!] }] });

    expect(completion().getByText("0 / 0 required questions answered")).toBeTruthy();
    expect(completion().getByText("100%")).toBeTruthy();
    expect(completion().queryByText(/Not Observed is a valid answer/)).toBeNull();
  });

  it("holds both actions, and says what Not Observed does", () => {
    renderForm();

    expect(completion().getByRole("button", { name: "Save as Draft" })).toBeTruthy();
    expect(completion().getByRole("button", { name: "Submit Review" })).toBeTruthy();
    expect(completion().getByText("Not Observed is a valid answer and is excluded from rating averages.")).toBeTruthy();
    expect(completion().getByText("Save your progress, then submit when you are ready.")).toBeTruthy();
  });
});

describe("EvaluatorScoringForm save and submit", () => {
  it("saves a draft with what is filled in, and says so", async () => {
    renderForm();
    await rate(/Shares knowledge/, "Not Observed");
    await userEvent.setup().type(text(/Tell us more/), "Steady.");

    await userEvent.setup().click(button("Save as Draft"));

    expect(onSave).toHaveBeenCalledWith({
      writtenFeedback: "",
      answers: [
        { questionId: RATE, score: null, writtenAnswer: null, optionId: null, isNotObserved: true },
        { questionId: NOTE, score: null, writtenAnswer: "Steady.", optionId: null, isNotObserved: false },
      ],
    });
    expect(await screen.findByText("Draft saved.")).toBeTruthy();
  });

  it("asks for the required answers on their questions, before any confirmation", async () => {
    renderForm({ initialAnswers: { [RATE]: "4" } });

    await userEvent.setup().click(button("Submit Review"));

    expect(ratings(/Meets commitments/)).toHaveAttribute("aria-invalid", "true");
    expect(ratings(/Meets commitments/)).toHaveAccessibleDescription("Answer this question.");
    expect(box(/Asks for help/).getAttribute("aria-invalid")).toBe("true");
    expect(ratings(/Shares knowledge/)).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Answer every required question before you submit.")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("drops the problem of a question once it is answered, and keeps the others", async () => {
    renderForm();
    await userEvent.setup().click(button("Submit Review"));
    expect(ratings(/Meets commitments/)).toHaveAttribute("aria-invalid", "true");

    await rate(/Meets commitments/, "4 Often");

    expect(ratings(/Meets commitments/)).not.toHaveAttribute("aria-invalid", "true");
    expect(ratings(/Meets commitments/)).not.toHaveAccessibleDescription("Answer this question.");
    expect(ratings(/Shares knowledge/)).toHaveAttribute("aria-invalid", "true");
    expect(box(/Asks for help/)).toHaveAttribute("aria-invalid", "true");
  });

  it("drops the words about required questions once every one is answered", async () => {
    renderForm({ initialAnswers: { [RATE]: "4", [CHOICE]: OFTEN } });
    await userEvent.setup().click(button("Submit Review"));
    const words = "Answer every required question before you submit.";
    expect(screen.getByText(words)).toBeTruthy();

    await rate(/Meets commitments/, "5 Always");

    expect(screen.queryByText(words)).toBeNull();
  });

  // `fireEvent.click` moves no focus, as a click in Safari does not.
  it("moves the focus to the first rating with a problem, and chooses nothing", async () => {
    renderForm();
    await userEvent.setup().type(text(/Tell us more/), "x");

    fireEvent.click(button("Submit Review"));

    await waitFor(() => expect(rating(/Shares knowledge/, "1 Never")).toHaveFocus());
    expect(within(ratings(/Shares knowledge/)).queryByRole("radio", { checked: true })).toBeNull();
  });

  it("moves the focus to a list with a problem when the ratings are answered", async () => {
    renderForm({ initialAnswers: { [RATE]: "4", [STRICT]: "4" } });

    fireEvent.click(button("Submit Review"));

    await waitFor(() => expect(box(/Asks for help/)).toHaveFocus());
  });

  it("asks before it submits, then sends the answers once", async () => {
    renderForm({ initialAnswers: COMPLETE });

    await userEvent.setup().click(button("Submit Review"));
    const dialog = within(await screen.findByRole("alertdialog"));
    expect(dialog.getByText("After you submit, you cannot change your answers.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.setup().click(dialog.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0].answers).toHaveLength(3);
    expect(await screen.findByText("Review submitted.")).toBeTruthy();
  });

  it("sends nothing when the confirmation is cancelled", async () => {
    renderForm({ initialAnswers: COMPLETE });

    await userEvent.setup().click(button("Submit Review"));
    await userEvent.setup().click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a refusal, puts a field problem on its question, and keeps the input", async () => {
    onSave.mockResolvedValue({ message: "Some answers do not fit.", fieldErrors: { [NOTE]: "This text is not taken." } });
    renderForm();
    await userEvent.setup().type(text(/Tell us more/), "Steady.");

    await userEvent.setup().click(button("Save as Draft"));

    expect(await screen.findByText("Some answers do not fit.")).toBeTruthy();
    expect(screen.getByText("This text is not taken.")).toBeTruthy();
    expect(text(/Tell us more/).getAttribute("aria-invalid")).toBe("true");
    expect((text(/Tell us more/) as HTMLTextAreaElement).value).toBe("Steady.");
  });

  it("says that something went wrong when the action itself fails", async () => {
    onSave.mockRejectedValue(new Error("network"));
    renderForm();

    await userEvent.setup().click(button("Save as Draft"));

    expect(await screen.findByText("Something went wrong. Try again.")).toBeTruthy();
  });

  it("disables both actions while one runs, and keeps the focus on the one that was pressed", async () => {
    onSave.mockReturnValue(new Promise(() => {}));
    renderForm();
    const user = userEvent.setup();

    await user.click(button("Save as Draft"));

    await waitFor(() => expect(button("Save as Draft").getAttribute("aria-disabled")).toBe("true"));
    expect(button("Submit Review").getAttribute("aria-disabled")).toBe("true");
    // The `disabled` attribute would drop the focus to the page body in a browser.
    expect(button("Save as Draft").hasAttribute("disabled")).toBe(false);
    expect(document.activeElement).toBe(button("Save as Draft"));
    await user.click(button("Save as Draft"));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe("EvaluatorScoringForm focus after a result", () => {
  async function submitAndConfirm() {
    const user = userEvent.setup();
    await user.click(button("Submit Review"));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Submit" }));
  }

  it("returns to Submit review after a refusal", async () => {
    onSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ message: "The goals are not verified.", fieldErrors: {} }), 50)),
    );
    renderForm({ initialAnswers: COMPLETE });

    await submitAndConfirm();
    await screen.findByText("The goals are not verified.");

    await waitFor(() => expect(document.activeElement).toBe(button("Submit Review")));
  });

  it("moves to the result once the submitted review has no more actions", async () => {
    const view = renderForm({ initialAnswers: COMPLETE });

    await submitAndConfirm();
    await screen.findByText("Review submitted.");
    view.rerender(<EvaluatorScoringForm {...view.props} isEditable={false} />);

    await waitFor(() => expect(document.activeElement?.textContent).toBe("Review submitted."));
  });
});

describe("EvaluatorScoringForm leaving", () => {
  const unloadIsBlocked = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it("goes back to the list at once when nothing changed", async () => {
    renderForm({ initialAnswers: COMPLETE });

    await userEvent.setup().click(button("Back to Reviews"));

    expect(push).toHaveBeenCalledWith(BACK);
    expect(unloadIsBlocked()).toBe(false);
  });

  it("asks before it discards changes, and warns on a tab close", async () => {
    renderForm();
    await userEvent.setup().type(text(/Tell us more/), "Draft");
    expect(unloadIsBlocked()).toBe(true);

    await userEvent.setup().click(button("Back to Reviews"));
    expect(push).not.toHaveBeenCalled();
    await userEvent.setup().click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));

    expect(push).toHaveBeenCalledWith(BACK);
    expect((text(/Tell us more/) as HTMLTextAreaElement).value).toBe("");
  });

  it("is clean again once the saved answers arrive from the server", async () => {
    const view = renderForm();
    await userEvent.setup().type(text(/Tell us more/), "Steady.  ");

    view.rerender(<EvaluatorScoringForm {...view.props} initialAnswers={{ [NOTE]: "Steady." }} />);
    await userEvent.setup().click(button("Back to Reviews"));

    expect(push).toHaveBeenCalledWith(BACK);
  });
});

describe("EvaluatorScoringForm read only", () => {
  it("shows the saved answers as words, with no control to change them", () => {
    renderForm({
      isEditable: false,
      initialAnswers: { [RATE]: "not_observed", [STRICT]: "5", [CHOICE]: OFTEN, [NOTE]: "Steady." },
    });

    for (const answer of ["Not Observed", "5 · Always", "Often", "Steady.", "No answer"]) {
      expect(screen.getByText(answer)).toBeTruthy();
    }
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("complementary", { name: "Review completion" })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Save draft|Submit review/ })).toBeNull();
    expect(button("Back to Reviews")).toBeTruthy();
  });

  it("says that the template has no question", () => {
    renderForm({ sections: [], isEditable: false });

    expect(screen.getByText("This review has no questions.")).toBeTruthy();
  });
});
