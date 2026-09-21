import { AssigneeAvatar } from "../components/AssigneeAvatar";
import { Button } from "../components/Button";
import { CategoryTag } from "../components/CategoryTag";
import { InputField } from "../components/InputField";
import { PriorityTag } from "../components/PriorityTag";
import { StatusPill } from "../components/StatusPill";
import { TicketCard } from "../components/TicketCard";
import type { IssueCategory, IssuePriority, IssueStatus } from "../api/types";

const PRIORITIES: IssuePriority[] = ["Urgent", "High", "Medium", "Low"];
const CATEGORIES: IssueCategory[] = ["Technical", "Managerial", "Decision"];
const STATUSES: IssueStatus[] = ["Open", "In Progress", "Done"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-8">
      <h2 className="font-mono text-xs uppercase tracking-wider text-ink-soft">{title}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">{children}</div>
    </section>
  );
}

export function ComponentsShowcase() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl text-ink">Component showcase</h1>

      <Section title="Button — 3 variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
      </Section>

      <Section title="PriorityTag — 4 levels">
        {PRIORITIES.map((level) => (
          <PriorityTag key={level} level={level} />
        ))}
      </Section>

      <Section title="CategoryTag — 3 categories">
        {CATEGORIES.map((category) => (
          <CategoryTag key={category} category={category} />
        ))}
      </Section>

      <Section title="StatusPill — 3 statuses">
        {STATUSES.map((status) => (
          <StatusPill key={status} status={status} />
        ))}
      </Section>

      <Section title="InputField — default vs. error">
        <div className="w-64">
          <InputField label="Username" placeholder="alice" />
        </div>
        <div className="w-64">
          <InputField label="Username" placeholder="alice" error="Username is required." />
        </div>
      </Section>

      <Section title="AssigneeAvatar — assigned vs. unassigned">
        <AssigneeAvatar username="alice" />
        <AssigneeAvatar username="bob" />
        <AssigneeAvatar username={null} />
      </Section>

      <Section title="TicketCard — priority-colored left border, per level">
        <div className="w-64">
          <TicketCard ticketId="ROC-1" title="Urgent + Decision" priority="Urgent" category="Decision" assigneeUsername="alice" />
        </div>
        <div className="w-64">
          <TicketCard ticketId="ROC-2" title="High + Technical" priority="High" category="Technical" assigneeUsername="bob" />
        </div>
        <div className="w-64">
          <TicketCard ticketId="ROC-3" title="Medium + Technical" priority="Medium" category="Technical" assigneeUsername={null} />
        </div>
        <div className="w-64">
          <TicketCard ticketId="ROC-4" title="Low + Managerial" priority="Low" category="Managerial" assigneeUsername="alice" />
        </div>
      </Section>
    </div>
  );
}
