"use client";

import { Stepper } from "@/components/molecules/stepper";

const STEPS = [
  "Cycle Details",
  "Select Participants",
  "Evaluation Setup",
  "Assessment Workflow",
  "Review & Launch",
];

interface CycleSetupStepperProps {
  currentStep: number;
  furthestStep: number;
  onStepChange: (step: number) => void;
}

export function CycleSetupStepper(props: CycleSetupStepperProps) {
  return (
    <Stepper label="Review cycle setup" steps={STEPS} {...props} />
  );
}
