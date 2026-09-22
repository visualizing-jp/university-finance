import type { ModeId } from "../lib/permalink.ts";

const TABS: { id: ModeId; label: string; hint: string }[] = [
  { id: "compare", label: "比べる", hint: "指標" },
  { id: "look", label: "見る", hint: "一校" },
];

interface ModeNavProps {
  mode: ModeId;
  onMode: (mode: ModeId) => void;
}

export function ModeNav({ mode, onMode }: ModeNavProps) {
  return (
    <nav className="view-nav" aria-label="モード">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={mode === tab.id ? "page" : undefined}
          onClick={() => onMode(tab.id)}
        >
          {tab.label}
          <span className="view-nav__hint">{tab.hint}</span>
        </button>
      ))}
    </nav>
  );
}
