import { MagnifyingGlass } from "@phosphor-icons/react";

export default function ToolSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="tool-search">
      <MagnifyingGlass size={17} aria-hidden="true" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search tools..." aria-label="Search tools" />
    </label>
  );
}
