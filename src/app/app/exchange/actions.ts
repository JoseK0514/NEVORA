"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { currentDateInPuertoRico } from "@/lib/date-utils";
import {
  approveCoverageExchange,
  approveSwapExchange,
  cancelExchange,
  claimCoverage,
  createCoverageOffer,
  createSwapProposal,
  denyExchange,
  getExchange,
  getPublishedShift,
  respondToSwap,
} from "@/lib/data/exchanges";
import { getShiftValidationContext } from "@/lib/data/schedules";
import {
  prepareExchangeContext,
  validateSwapRequest,
} from "@/lib/scheduling/exchange-validation";
import { validateShift } from "@/lib/scheduling/validate-shift";
import { clearWeekAcknowledgements } from "@/lib/data/acknowledgements";

function exchangeUrl(suffix = "") {
  return `/app/exchange${suffix}`;
}

async function validateCoverageEligibility(
  employeeId: string,
  exchangeId: string,
) {
  const exchange = await getExchange(exchangeId);

  if (
    !exchange ||
    exchange.kind !== "COVERAGE" ||
    !["OPEN", "MANAGER_PENDING"].includes(exchange.status)
  ) {
    return { valid: false as const, code: "EXCHANGE_UNAVAILABLE" };
  }

  const source = exchange.sourceShift;
  const context = await getShiftValidationContext({
    employeeId,
    date: source.date,
    weekStart: source.weekStart,
  });

  if (!context) {
    return { valid: false as const, code: "EMPLOYEE_NOT_FOUND" };
  }

  const result = validateShift({
    candidate: {
      employeeId,
      locationId: source.locationId,
      date: source.date,
      startTime: source.startTime,
      endTime: source.endTime,
    },
    ...context,
    mode: "SHIFT_EXCHANGE",
  });

  const blocking = result.issues.find((issue) => issue.severity === "error");

  return blocking
    ? { valid: false as const, code: blocking.code }
    : { valid: true as const, exchange, warnings: result.issues };
}

async function validateSwapEligibility(exchangeId: string) {
  const exchange = await getExchange(exchangeId);

  if (
    !exchange ||
    exchange.kind !== "SWAP" ||
    !exchange.targetShift ||
    !exchange.targetEmployeeId ||
    !["EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status)
  ) {
    return { valid: false as const, code: "EXCHANGE_UNAVAILABLE" };
  }

  const source = exchange.sourceShift;
  const target = exchange.targetShift;

  const requestCheck = validateSwapRequest({
    requesterEmployeeId: exchange.requestedByEmployeeId,
    sourceShiftId: source.id,
    sourceEmployeeId: source.employeeId,
    targetShiftId: target.id,
    targetEmployeeId: target.employeeId,
    sourceWeekStart: source.weekStart,
    targetWeekStart: target.weekStart,
  });

  if (!requestCheck.valid) {
    return { valid: false as const, code: requestCheck.code };
  }

  const [requesterContext, targetContext] = await Promise.all([
    getShiftValidationContext({
      employeeId: exchange.requestedByEmployeeId,
      date: target.date,
      weekStart: target.weekStart,
    }),
    getShiftValidationContext({
      employeeId: exchange.targetEmployeeId,
      date: source.date,
      weekStart: source.weekStart,
    }),
  ]);

  if (!requesterContext || !targetContext) {
    return { valid: false as const, code: "EMPLOYEE_NOT_FOUND" };
  }

  const requesterAdjusted = prepareExchangeContext(
    {
      existingShifts: requesterContext.existingShifts,
      existingWeeklyMinutes: requesterContext.existingWeeklyMinutes,
    },
    source,
  );

  const targetAdjusted = prepareExchangeContext(
    {
      existingShifts: targetContext.existingShifts,
      existingWeeklyMinutes: targetContext.existingWeeklyMinutes,
    },
    target,
  );

  const requesterResult = validateShift({
    candidate: {
      employeeId: exchange.requestedByEmployeeId,
      locationId: target.locationId,
      date: target.date,
      startTime: target.startTime,
      endTime: target.endTime,
    },
    employee: requesterContext.employee,
    existingShifts: requesterAdjusted.existingShifts,
    availability: requesterContext.availability,
    approvedTimeOff: requesterContext.approvedTimeOff,
    existingWeeklyMinutes: requesterAdjusted.existingWeeklyMinutes,
    mode: "SHIFT_EXCHANGE",
  });

  const targetResult = validateShift({
    candidate: {
      employeeId: exchange.targetEmployeeId,
      locationId: source.locationId,
      date: source.date,
      startTime: source.startTime,
      endTime: source.endTime,
    },
    employee: targetContext.employee,
    existingShifts: targetAdjusted.existingShifts,
    availability: targetContext.availability,
    approvedTimeOff: targetContext.approvedTimeOff,
    existingWeeklyMinutes: targetAdjusted.existingWeeklyMinutes,
    mode: "SHIFT_EXCHANGE",
  });

  const blocking = [...requesterResult.issues, ...targetResult.issues].find(
    (issue) => issue.severity === "error",
  );

  return blocking
    ? { valid: false as const, code: blocking.code }
    : {
        valid: true as const,
        exchange,
        warnings: [...requesterResult.issues, ...targetResult.issues],
      };
}

export async function offerCoverageAction(formData: FormData) {
  const session = await requireSession();
  const sourceShiftId = String(formData.get("sourceShiftId") ?? "");
  const shift = await getPublishedShift(sourceShiftId);

  if (
    !shift ||
    shift.employeeId !== session.id ||
    shift.date < currentDateInPuertoRico()
  ) {
    redirect(exchangeUrl("?tab=my&error=INVALID_SHIFT"));
  }

  try {
    await createCoverageOffer({
      sourceShiftId,
      requestedByEmployeeId: session.id,
    });
  } catch {
    redirect(exchangeUrl("?tab=my&error=SHIFT_ALREADY_OFFERED"));
  }

  revalidatePath("/app/exchange");
  redirect(exchangeUrl("?tab=my&offered=1"));
}

export async function claimCoverageAction(formData: FormData) {
  const session = await requireSession();
  const exchangeId = String(formData.get("exchangeId") ?? "");

  const validation = await validateCoverageEligibility(session.id, exchangeId);

  if (!validation.valid) {
    redirect(exchangeUrl(`?tab=coverage&error=${encodeURIComponent(validation.code)}`));
  }

  const claimed = await claimCoverage({
    exchangeId,
    employeeId: session.id,
  });

  if (!claimed) {
    redirect(exchangeUrl("?tab=coverage&error=EXCHANGE_TAKEN"));
  }

  revalidatePath("/app/exchange");
  redirect(exchangeUrl("?tab=coverage&claimed=1"));
}

export async function proposeSwapAction(formData: FormData) {
  const session = await requireSession();
  const sourceShiftId = String(formData.get("sourceShiftId") ?? "");
  const targetShiftId = String(formData.get("targetShiftId") ?? "");

  const [source, target] = await Promise.all([
    getPublishedShift(sourceShiftId),
    getPublishedShift(targetShiftId),
  ]);

  const today = currentDateInPuertoRico();

  if (
    !source ||
    !target ||
    source.date < today ||
    target.date < today
  ) {
    redirect(exchangeUrl("?tab=my&error=INVALID_SHIFT"));
  }

  const requestCheck = validateSwapRequest({
    requesterEmployeeId: session.id,
    sourceShiftId: source.id,
    sourceEmployeeId: source.employeeId,
    targetShiftId: target.id,
    targetEmployeeId: target.employeeId,
    sourceWeekStart: source.weekStart,
    targetWeekStart: target.weekStart,
  });

  if (!requestCheck.valid) {
    redirect(exchangeUrl(`?tab=my&error=${encodeURIComponent(requestCheck.code)}`));
  }

  const [requesterContext, targetContext] = await Promise.all([
    getShiftValidationContext({
      employeeId: session.id,
      date: target.date,
      weekStart: target.weekStart,
    }),
    getShiftValidationContext({
      employeeId: target.employeeId,
      date: source.date,
      weekStart: source.weekStart,
    }),
  ]);

  if (!requesterContext || !targetContext) {
    redirect(exchangeUrl("?tab=my&error=EMPLOYEE_NOT_FOUND"));
  }

  const requesterAdjusted = prepareExchangeContext(
    {
      existingShifts: requesterContext.existingShifts,
      existingWeeklyMinutes: requesterContext.existingWeeklyMinutes,
    },
    source,
  );
  const targetAdjusted = prepareExchangeContext(
    {
      existingShifts: targetContext.existingShifts,
      existingWeeklyMinutes: targetContext.existingWeeklyMinutes,
    },
    target,
  );

  const requesterResult = validateShift({
    candidate: {
      employeeId: session.id,
      locationId: target.locationId,
      date: target.date,
      startTime: target.startTime,
      endTime: target.endTime,
    },
    employee: requesterContext.employee,
    existingShifts: requesterAdjusted.existingShifts,
    availability: requesterContext.availability,
    approvedTimeOff: requesterContext.approvedTimeOff,
    existingWeeklyMinutes: requesterAdjusted.existingWeeklyMinutes,
    mode: "SHIFT_EXCHANGE",
  });

  const targetResult = validateShift({
    candidate: {
      employeeId: target.employeeId,
      locationId: source.locationId,
      date: source.date,
      startTime: source.startTime,
      endTime: source.endTime,
    },
    employee: targetContext.employee,
    existingShifts: targetAdjusted.existingShifts,
    availability: targetContext.availability,
    approvedTimeOff: targetContext.approvedTimeOff,
    existingWeeklyMinutes: targetAdjusted.existingWeeklyMinutes,
    mode: "SHIFT_EXCHANGE",
  });

  const blocking = [...requesterResult.issues, ...targetResult.issues].find(
    (issue) => issue.severity === "error",
  );

  if (blocking) {
    redirect(exchangeUrl(`?tab=my&error=${encodeURIComponent(blocking.code)}`));
  }

  try {
    await createSwapProposal({
      sourceShiftId: source.id,
      targetShiftId: target.id,
      requestedByEmployeeId: session.id,
      targetEmployeeId: target.employeeId,
    });
  } catch {
    redirect(exchangeUrl("?tab=my&error=SHIFT_ALREADY_OFFERED"));
  }

  revalidatePath("/app/exchange");
  redirect(exchangeUrl("?tab=my&swapRequested=1"));
}

export async function respondSwapAction(formData: FormData) {
  const session = await requireSession();
  const exchangeId = String(formData.get("exchangeId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (decision === "DENIED") {
    const updated = await respondToSwap({
      exchangeId,
      employeeId: session.id,
      accept: false,
    });

    if (!updated) {
      redirect(exchangeUrl("?tab=requests&error=EXCHANGE_UNAVAILABLE"));
    }

    revalidatePath("/app/exchange");
    redirect(exchangeUrl("?tab=requests&swapDeclined=1"));
  }

  if (decision !== "ACCEPTED") {
    redirect(exchangeUrl("?tab=requests&error=INVALID_DECISION"));
  }

  const validation = await validateSwapEligibility(exchangeId);

  if (
    !validation.valid ||
    validation.exchange.targetEmployeeId !== session.id
  ) {
    redirect(
      exchangeUrl(
        `?error=${encodeURIComponent(
          validation.valid ? "NOT_TARGET_EMPLOYEE" : validation.code,
        )}`,
      ),
    );
  }

  const updated = await respondToSwap({
    exchangeId,
    employeeId: session.id,
    accept: true,
  });

  if (!updated) {
    redirect(exchangeUrl("?tab=requests&error=EXCHANGE_UNAVAILABLE"));
  }

  revalidatePath("/app/exchange");
  redirect(exchangeUrl("?tab=requests&swapAccepted=1"));
}

export async function reviewExchangeAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const exchangeId = String(formData.get("exchangeId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const exchange = await getExchange(exchangeId);

  if (!exchange || exchange.status !== "MANAGER_PENDING") {
    redirect(exchangeUrl("?tab=requests&error=EXCHANGE_UNAVAILABLE"));
  }

  if (decision === "DENIED") {
    await denyExchange({
      exchangeId,
      managerId: session.id,
    });
    revalidatePath("/app/exchange");
    revalidatePath("/app/schedule");
    redirect(exchangeUrl("?tab=requests&reviewed=1"));
  }

  if (decision !== "APPROVED") {
    redirect(exchangeUrl("?tab=requests&error=INVALID_DECISION"));
  }

  if (exchange.kind === "COVERAGE") {
    if (!exchange.targetEmployeeId) {
      redirect(exchangeUrl("?tab=requests&error=EXCHANGE_UNAVAILABLE"));
    }

    const validation = await validateCoverageEligibility(
      exchange.targetEmployeeId,
      exchangeId,
    );

    if (!validation.valid) {
      redirect(exchangeUrl(`?tab=requests&error=${encodeURIComponent(validation.code)}`));
    }

    const approved = await approveCoverageExchange({
      exchangeId,
      managerId: session.id,
    });

    if (!approved) {
      redirect(exchangeUrl("?tab=requests&error=EXCHANGE_CHANGED"));
    }
  } else {
    const validation = await validateSwapEligibility(exchangeId);

    if (!validation.valid) {
      redirect(exchangeUrl(`?tab=requests&error=${encodeURIComponent(validation.code)}`));
    }

    const approved = await approveSwapExchange({
      exchangeId,
      managerId: session.id,
    });

    if (!approved) {
      redirect(exchangeUrl("?tab=requests&error=EXCHANGE_CHANGED"));
    }
  }

  await clearWeekAcknowledgements(exchange.sourceShift.weekStart);
  revalidatePath("/app/exchange");
  revalidatePath("/app/schedule");
  redirect(exchangeUrl("?tab=requests&approved=1"));
}


export async function cancelExchangeAction(formData: FormData) {
  const session = await requireSession();
  const exchangeId = String(formData.get("exchangeId") ?? "");

  const cancelled = await cancelExchange({
    exchangeId,
    employeeId: session.id,
  });

  if (!cancelled) {
    redirect(exchangeUrl("?tab=history&error=EXCHANGE_UNAVAILABLE"));
  }

  revalidatePath("/app/exchange");
  redirect(exchangeUrl("?tab=history&cancelled=1"));
}
