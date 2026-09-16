import { useState } from "react";
import type { Member } from "../api/members";
import type { IssueCategory, IssuePriority, IssueStatus } from "../api/types";

export interface Filters {
  assignee_id: string;
  priority: string;
  category: string;
  status: string;
  search: string;
}

interface IssueFilterBarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  members: Member[];
  showStatus?: boolean;
  sort: string;
  onSortChange: (sort: string) => void;
}

const PRIORITIES: IssuePriority[] = ["Low", "Medium", "High", "Urgent"];
const CATEGORIES: IssueCategory[] = ["Technical", "Managerial", "Decision"];
const STATUSES: IssueStatus[] = ["Open", "In Progress", "Done"];

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-0 border-b border-rule bg-transparent py-1 pr-4 pl-0.5 font-body text-[13px] text-ink outline-none focus:border-ink"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function IssueFilterBar({
  filters,
  onChange,
  members,
  showStatus = true,
  sort,
  onSortChange,
}: IssueFilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });

  const assigneeOptions = [
    { value: "", label: "All" },
    ...members.map((m) => ({ value: m.id, label: m.username })),
  ];
  const priorityOptions = [{ value: "", label: "All" }, ...PRIORITIES.map((p) => ({ value: p, label: p }))];
  const categoryOptions = [{ value: "", label: "All" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];
  const statusOptions = [{ value: "", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: s }))];

  return (
    <>
      <div className="hidden flex-wrap items-end gap-6 py-4 sm:flex">
        <Select label="Assignee" value={filters.assignee_id} onChange={(v) => set("assignee_id", v)} options={assigneeOptions} />
        <Select label="Priority" value={filters.priority} onChange={(v) => set("priority", v)} options={priorityOptions} />
        <Select label="Category" value={filters.category} onChange={(v) => set("category", v)} options={categoryOptions} />
        {showStatus && (
          <Select label="Status" value={filters.status} onChange={(v) => set("status", v)} options={statusOptions} />
        )}
        <div className="ml-auto flex max-w-[260px] flex-1 flex-col gap-1.5">
          <label className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase">Search</label>
          <input
            type="text"
            placeholder="Search tickets…"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className="border-0 border-b border-rule bg-transparent py-1 pr-0.5 pl-0.5 font-body text-sm text-ink outline-none placeholder:text-[#9AA6BB] focus:border-ink"
          />
        </div>
      </div>

      {/* Mobile: Filters toggle + sort indicator */}
      <div className="flex items-center justify-between py-3.5 sm:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 border border-ink px-4 py-2.5 font-body text-[13px] font-semibold text-ink"
        >
          <span className="font-mono text-[11px]">▤</span> Filters
        </button>
        <button
          onClick={() => onSortChange(sort === "-updated_at" ? "updated_at" : "-updated_at")}
          className="flex items-center gap-1 font-mono text-[11px] text-ink-soft"
        >
          Updated <span className="text-[9px]">{sort.startsWith("-") ? "▾" : "▴"}</span>
        </button>
      </div>
      {mobileOpen && (
        <div className="mb-2 flex flex-col gap-4 border border-rule p-4 sm:hidden">
          <Select label="Assignee" value={filters.assignee_id} onChange={(v) => set("assignee_id", v)} options={assigneeOptions} />
          <Select label="Priority" value={filters.priority} onChange={(v) => set("priority", v)} options={priorityOptions} />
          <Select label="Category" value={filters.category} onChange={(v) => set("category", v)} options={categoryOptions} />
          {showStatus && (
            <Select label="Status" value={filters.status} onChange={(v) => set("status", v)} options={statusOptions} />
          )}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase">Search</label>
            <input
              type="text"
              placeholder="Search tickets…"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              className="border-0 border-b border-rule bg-transparent py-1 pr-0.5 pl-0.5 font-body text-sm text-ink outline-none placeholder:text-[#9AA6BB] focus:border-ink"
            />
          </div>
        </div>
      )}
    </>
  );
}
