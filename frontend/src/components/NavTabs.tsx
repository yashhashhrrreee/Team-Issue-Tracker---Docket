import { NavLink } from "react-router-dom";

interface NavTabsProps {
  projectId: string;
}

const TABS = [
  { label: "Home", to: "" },
  { label: "Board", to: "/board" },
  { label: "Backlog", to: "/backlog" },
  { label: "Team", to: "/team" },
  { label: "Closed", to: "/closed" },
  { label: "Solved", to: "/solved" },
];

export function NavTabs({ projectId }: NavTabsProps) {
  return (
    <div className="flex gap-4 overflow-x-auto border-b border-rule sm:gap-8">
      {TABS.map((tab) => (
        <NavLink
          key={tab.label}
          to={`/projects/${projectId}${tab.to}`}
          end={tab.to === ""}
          className={({ isActive }) =>
            `whitespace-nowrap px-0.5 py-2.5 font-body text-[13px] sm:text-sm ${
              isActive
                ? "border-b-2 border-ink font-semibold text-ink"
                : "text-ink-soft"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
