import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  suggestions?: string[];
}

export function TagInput({ value, onChange, placeholder = "Add tag…", className, suggestions }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions =
    inputValue.trim().length > 0 && suggestions
      ? suggestions
          .filter(
            (s) =>
              s.includes(inputValue.trim().toLowerCase()) &&
              !value.includes(s)
          )
          .slice(0, 5)
      : [];

  useEffect(() => {
    setShowDropdown(filteredSuggestions.length > 0);
  }, [filteredSuggestions.length]);

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/,/g, "");
    if (!tag) return;
    const deduped = Array.from(new Set([...value, tag]));
    if (deduped.length !== value.length) {
      onChange(deduped);
    }
    setInputValue("");
    setShowDropdown(false);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  function handleBlur() {
    // Delay so click on suggestion registers first
    setTimeout(() => {
      if (inputValue.trim()) {
        addTag(inputValue);
      }
      setShowDropdown(false);
    }, 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex flex-wrap gap-1.5 rounded-lg border border-border bg-white px-2 py-2 cursor-text min-h-[2.5rem]",
          "focus-within:border-primary/40 transition-colors",
          className
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] font-medium shrink-0"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="text-cyan-500/60 hover:text-cyan-400 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            if (filteredSuggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-foreground/80 placeholder:text-muted-foreground/40 outline-none border-none"
        />
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[140px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
