import { Search } from 'lucide-react';

interface SearchHeroProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export function SearchHero({ value, onChange, onSearch }: SearchHeroProps) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-lg border border-[var(--gt-border)] bg-[var(--gt-panel)] px-4 transition-colors hover:border-[var(--grynd-border-2)]">
      <Search className="h-4 w-4 text-[var(--gt-muted)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSearch();
          }
        }}
        placeholder="Search lectures - e.g. NLM Class 11 Physics Wallah"
        className="flex-1 bg-transparent text-[14px] text-[var(--gt-text)] outline-none placeholder:text-[var(--gt-muted)]"
      />
      <kbd className="text-[11px] text-[var(--gt-muted)] font-mono">Enter to search</kbd>
    </div>
  );
}
