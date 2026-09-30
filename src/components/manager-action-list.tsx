import Link from "next/link";
import type { ManagerActionItem } from "@/lib/assistance/manager-actions";

function priorityLabel(priority: ManagerActionItem["priority"]) {
  if (priority === "URGENT") return "Urgent";
  if (priority === "REVIEW") return "Review";
  return "Setup";
}

function actionLabel(type: ManagerActionItem["type"]) {
  switch (type) {
    case "COVERAGE_GAP":
      return "Review";
    case "TIME_OFF":
    case "EXCHANGE":
    case "CALLOUT":
    case "HOURS_REVIEW":
      return "Review";
    case "TARGET_MISSING":
      return "Set target";
    case "AVAILABILITY_MISSING":
      return "View";
    case "ACKNOWLEDGEMENT_MISSING":
      return "View";
    case "DEADLINE_MISSING":
      return "Set deadline";
    case "COVERAGE_RULES_MISSING":
      return "Configure";
  }
}

export function ManagerActionList({
  items,
  limit,
  emptyTitle = "No action needed",
  emptyDetail = "Coverage, requests, availability, and employee hour checks are clear.",
}: {
  items: ManagerActionItem[];
  limit?: number;
  emptyTitle?: string;
  emptyDetail?: string;
}) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  if (!visibleItems.length) {
    return (
      <div className="dashboard-empty-state">
        <strong>{emptyTitle}</strong>
        <span>{emptyDetail}</span>
      </div>
    );
  }

  return (
    <div className="manager-action-table" role="table" aria-label="Manager action items">
      <div className="manager-action-table-head" role="row">
        <span>Priority</span>
        <span>Item</span>
        <span>Details</span>
        <span>Action</span>
      </div>

      {visibleItems.map((item) => (
        <div className="manager-action-table-row" role="row" key={item.id}>
          <span
            className={`manager-priority ${item.priority.toLowerCase().replace("_", "-")}`}
            aria-label={item.priority === "URGENT" ? "Urgent" : item.priority === "REVIEW" ? "Review" : "Setup"}
          >
            <span className={`manager-priority-dot ${item.priority.toLowerCase()}`} aria-hidden="true" />
            <small>{priorityLabel(item.priority)}</small>
          </span>
          <strong>{item.title}</strong>
          <span className="manager-action-detail">{item.detail}</span>
          <Link className="button secondary compact-button" href={item.href}>
            {actionLabel(item.type)}
          </Link>
        </div>
      ))}
    </div>
  );
}
