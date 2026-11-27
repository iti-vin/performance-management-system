import { useEffect, useRef, type RefObject } from "react";

import type { FormActionResult } from "@/types/form-action";

/** The controls that can take the focus. A radio group marks itself too, and cannot. */
const INVALID_CONTROL = ["input:not([aria-hidden])", "textarea", '[role="radio"]', '[role="combobox"]']
  .map((control) => `${control}[aria-invalid="true"]`)
  .join(", ");

/**
 * The field with a problem can be far from the button that found it: an action that finds one
 * takes the focus there. An edit changes the problems too, and leaves the focus alone.
 * Call the returned function with the problems that an action found.
 */
export function useProblemFocus(
  formRef: RefObject<HTMLFormElement | null>,
  problems: FormActionResult,
  setProblems: (problems: FormActionResult) => void,
) {
  const wantsFocus = useRef(false);
  useEffect(() => {
    if (!wantsFocus.current) return;
    wantsFocus.current = false;
    formRef.current?.querySelector<HTMLElement>(INVALID_CONTROL)?.focus();
  }, [formRef, problems]);

  return function showProblems(found: FormActionResult) {
    wantsFocus.current = Object.keys(found.fieldErrors).length > 0;
    setProblems(found);
  };
}
