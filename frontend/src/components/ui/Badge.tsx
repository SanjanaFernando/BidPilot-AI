type StatusKey = string;

const MAP: Record<string, { cls: string; label?: string }> = {
  Analyzing: { cls: "badge-warning", label: "Analyzing" },
  Draft: { cls: "badge-neutral", label: "Draft" },
  Review: { cls: "badge-info", label: "In Review" },
  Approved: { cls: "badge-success", label: "Approved" },
  Submitted: { cls: "badge-gold", label: "Submitted" },
  Covered: { cls: "badge-success", label: "Covered" },
  Partial: { cls: "badge-warning", label: "Partial" },
  Missing: { cls: "badge-danger", label: "Missing" },
  "Evidence Required": { cls: "badge-info", label: "Evidence Needed" },
  Active: { cls: "badge-success", label: "Active" },
  "Expiring Soon": { cls: "badge-warning", label: "Expiring Soon" },
  Expired: { cls: "badge-danger", label: "Expired" },
  Expert: { cls: "badge-success", label: "Expert" },
  Proficient: { cls: "badge-info", label: "Proficient" },
  Familiar: { cls: "badge-neutral", label: "Familiar" },
  Generated: { cls: "badge-info", label: "Generated" },
  Reviewed: { cls: "badge-gold", label: "Reviewed" },
  Pending: { cls: "badge-neutral", label: "Pending" },
};

export default function Badge({ status }: { status: StatusKey }) {
  const entry = MAP[status] ?? { cls: "badge-neutral" };
  return <span className={`status-badge ${entry.cls}`}>{entry.label ?? status}</span>;
}
