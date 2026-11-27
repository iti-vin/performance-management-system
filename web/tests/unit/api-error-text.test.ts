import { createApiError } from "@pms/shared-types";
import { describe, expect, it } from "vitest";
import { apiErrorText } from "@/utils/api-error-text";

const FALLBACK = "The template could not be saved. Try again.";

describe("apiErrorText", () => {
  it("adds the field messages to the message, so a rejected field is named", () => {
    const body = createApiError({
      status: 400,
      message: "The request contains invalid fields.",
      correlationId: "c-1",
      details: [
        { field: "position", code: "MATCHES", message: "position must not be blank" },
        { field: "indicators.0.weight", code: "MIN", message: "weight must not be less than 0.01" },
      ],
    });

    expect(apiErrorText(body, FALLBACK)).toBe(
      "The request contains invalid fields. position must not be blank. weight must not be less than 0.01.",
    );
  });

  it("is the message alone when the error has no field details", () => {
    const body = createApiError({ status: 409, message: "Only draft templates can be updated.", correlationId: "c-2" });

    expect(apiErrorText(body, FALLBACK)).toBe("Only draft templates can be updated.");
  });

  it("is the fallback when the body is not the error envelope", () => {
    expect(apiErrorText({ statusCode: 500 }, FALLBACK)).toBe(FALLBACK);
    expect(apiErrorText(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("adds no second period to a message that already ends a sentence", () => {
    const body = createApiError({
      status: 422,
      message: "The deadlines cannot be extended.",
      correlationId: "c-4",
      details: [{ field: "stages", code: "X", message: "Move at least one deadline later." }],
    });

    expect(apiErrorText(body, FALLBACK)).toBe("The deadlines cannot be extended. Move at least one deadline later.");
  });

  it("repeats no message and stops at three field messages", () => {
    const detail = (field: string, message: string) => ({ field, code: "X", message });
    const body = createApiError({
      status: 400,
      message: "Bad.",
      correlationId: "c-3",
      details: [detail("a", "one"), detail("b", "one"), detail("c", "two"), detail("d", "three"), detail("e", "four")],
    });

    expect(apiErrorText(body, FALLBACK)).toBe("Bad. one. two. three.");
  });
});
