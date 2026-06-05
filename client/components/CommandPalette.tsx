"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type Command = {
  id: string;
  label: string;
  section: string;
  action: () => void;
};

type CommandPaletteProps = {
  isOpen: boolean;
  commands: Command[];
  onClose: () => void;
};

export function CommandPalette({ isOpen, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const visibleCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    return commands.filter((command) => command.label.toLowerCase().includes(normalized));
  }, [commands, query]);

  if (!isOpen) return null;

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="command-palette" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-search">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands"
          />
        </div>
        <div className="command-list">
          {visibleCommands.map((command) => (
            <button
              key={command.id}
              type="button"
              onClick={() => {
                command.action();
                onClose();
              }}
            >
              <span>{command.label}</span>
              <small>{command.section}</small>
            </button>
          ))}
          {!visibleCommands.length ? <p>No commands found</p> : null}
        </div>
      </div>
    </div>
  );
}
