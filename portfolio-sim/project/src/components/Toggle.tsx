import { type ReactNode } from "react"

export interface ToggleOption {
  value: string
  label: ReactNode
}

export interface ToggleProps {
  options: ToggleOption[]
  selected: string
  onChange: (value: string) => void
  ariaLabel?: string
  compact?: boolean
}

export function Toggle({ options, selected, onChange, ariaLabel, compact = false }: ToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "flex",
        gap: compact ? 12 : 16,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {options.map((option) => {
        const isSelected = option.value === selected
        return (
          <button
            key={option.value}
            type="button"
            className="pxtab"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            style={
              compact
                ? { padding: "2px 10px", fontSize: 17 }
                : undefined
            }
          >
            <span>{isSelected ? "💠 " : ""}{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
