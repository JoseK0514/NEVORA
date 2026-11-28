/** The first row retains the field names used by the single-shift actions. */
export function shiftFieldName(row: number, field: string) {
  return row === 0 ? field : `shift-${row}-${field}`;
}

export function shiftFormEntry(data: FormData, row: number) {
  const value = (field: string) => String(data.get(shiftFieldName(row, field)) ?? "").trim();
  return {
    employeeId: value("employeeId"), locationId: value("locationId"),
    date: value("date"), startTime: value("startTime"), endTime: value("endTime"),
    positionId: value("positionId") || undefined, isDesignatedLead: value("isDesignatedLead") === "on",
    notes: value("notes") || undefined,
  };
}
