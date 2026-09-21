import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createIssue } from "../api/issues";
import { listMembers } from "../api/members";
import { getProject } from "../api/projects";
import { BrandMark } from "../components/BrandMark";
import type { IssueCategory, IssuePriority } from "../api/types";
import { formatTicketId } from "../lib/ticketId";

const CATEGORIES: { value: IssueCategory; color: string }[] = [
  { value: "Technical", color: "#2C4A7C" },
  { value: "Managerial", color: "#7C93B3" },
  { value: "Decision", color: "#B3352B" },
];

const PRIORITIES: { value: IssuePriority; color: string }[] = [
  { value: "Low", color: "#7C93B3" },
  { value: "Medium", color: "#2C4A7C" },
  { value: "High", color: "#B3352B" },
  { value: "Urgent", color: "#B3352B" },
];

export function RaiseTicketPage() {
  const params = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const projectId = params.projectId ?? searchParams.get("projectId") ?? undefined;
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  });
  const { data: members } = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => listMembers(projectId!),
    enabled: Boolean(projectId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IssueCategory>("Technical");
  const [priority, setPriority] = useState<IssuePriority>("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ number: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setSubmitting(true);
    try {
      const issue = await createIssue(projectId!, {
        title,
        description,
        category,
        priority,
        assignee_id: assigneeId || null,
      });
      setSuccess({ number: issue.number });
      setTimeout(() => navigate(`/issues/${issue.id}`), 900);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="flex w-full max-w-[540px] flex-col items-center gap-8">
        <BrandMark />

        <form
          onSubmit={handleSubmit}
          className="w-full border border-rule bg-paper-raised px-6 pt-8 pb-8 sm:px-11 sm:pt-11"
        >
          <h1 className="mb-6 font-heading text-2xl font-semibold text-ink sm:mb-7 sm:text-[28px]">
            Raise a ticket
          </h1>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="raise-title"
                className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase"
              >
                Title
              </label>
              <input
                id="raise-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setTitleError(false);
                }}
                aria-invalid={titleError}
                className={`border-0 border-b bg-transparent px-0.5 pt-1.5 pb-2.5 font-body text-base text-ink outline-none ${
                  titleError ? "border-red focus:border-red" : "border-rule focus:border-ink"
                }`}
              />
              {titleError && <span className="text-xs text-red">Title is required.</span>}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="raise-description"
                className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase"
              >
                Description
              </label>
              <textarea
                id="raise-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What's going on?"
                className="resize-none border-0 border-b border-rule bg-transparent px-0.5 pt-1.5 pb-2.5 font-body text-sm text-ink outline-none placeholder:text-[#9AA6BB] focus:border-ink"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {CATEGORIES.map((c) => {
                  const selected = category === c.value;
                  return (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      style={{
                        borderColor: c.color,
                        backgroundColor: selected ? c.color : "#FFFFFF",
                        color: selected ? "#FFFFFF" : c.color,
                        borderWidth: selected ? "1.5px" : "1px",
                      }}
                      className="px-2.5 py-3.5 text-center font-body text-sm font-semibold"
                    >
                      {c.value}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">
                Priority
              </label>
              <div className="flex border border-rule">
                {PRIORITIES.map((p, i) => {
                  const selected = priority === p.value;
                  return (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      style={{
                        backgroundColor: selected ? p.color : "transparent",
                        color: selected ? "#FFFFFF" : p.color,
                      }}
                      className={`flex-1 border-rule py-2.5 text-center font-body text-[13px] ${
                        selected ? "font-semibold" : ""
                      } ${i < PRIORITIES.length - 1 ? "border-r" : ""}`}
                    >
                      {p.value}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="raise-assignee"
                className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase"
              >
                Assignee
              </label>
              <select
                id="raise-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="border-0 border-b border-rule bg-transparent px-0.5 pt-1.5 pb-2.5 font-body text-[15px] text-ink outline-none focus:border-ink"
              >
                <option value="">Unassigned</option>
                {members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-8 w-full bg-ink py-[13px] font-body text-[15px] font-semibold text-paper hover:bg-[#15213A] disabled:opacity-60"
          >
            {submitting ? "Raising…" : "Raise ticket"}
          </button>

          <div className="mt-[18px] text-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="font-body text-sm font-semibold text-ink hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-10 flex items-center justify-center bg-paper"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex w-full max-w-[420px] flex-col items-center gap-6 px-6"
            >
              <BrandMark />
              <div className="w-full border-2 border-ink bg-paper-raised px-10 py-14 text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink">
                  <span className="text-2xl font-bold text-ink">✓</span>
                </div>
                <div className="mb-2.5 font-heading text-2xl font-semibold text-ink">
                  Ticket stamped
                </div>
                <div className="mb-1.5 font-mono text-base tracking-[0.1em] text-ink">
                  {project ? formatTicketId(project.key, success.number) : ""}
                </div>
                <div className="font-body text-sm text-ink-soft">Redirecting to the ticket…</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
