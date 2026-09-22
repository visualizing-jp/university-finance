import type { ViewId } from "../lib/permalink.ts";

const TABS: { id: ViewId; label: string; hint: string }[] = [
  { id: "income", label: "収支", hint: "どこからどこへ" },
  { id: "balance", label: "資産・負債", hint: "何を持っているか" },
  { id: "cash", label: "資金の流れ", hint: "期首から期末" },
  { id: "trend", label: "経年変化", hint: "折れ線" },
];

interface ViewNavProps {
  view: ViewId;
  onView: (view: ViewId) => void;
}

export function ViewNav({ view, onView }: ViewNavProps) {
  return (
    <nav className="view-nav" aria-label="ビュー">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={view === tab.id ? "page" : undefined}
          onClick={() => onView(tab.id)}
        >
          {tab.label}
          <span className="view-nav__hint">{tab.hint}</span>
        </button>
      ))}
    </nav>
  );
}
