"use client";

import { forwardRef, useCallback } from "react";

type ToggleSwitchProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  checkedColor?: string;
  uncheckedColor?: string;
};

export const ToggleSwitch = forwardRef<HTMLInputElement, ToggleSwitchProps>(
  (
    {
      checked,
      onChange,
      disabled = false,
      name,
      id,
      className,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledby,
      checkedColor = "#432f21",
      uncheckedColor = "#d1d5db",
    },
    ref
  ) => {
    const handleToggle = useCallback(() => {
      if (disabled) return;
      onChange?.(!checked);
    }, [disabled, onChange, checked]);

    return (
      <label
        className={[
          "inline-flex items-center",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          className || "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={handleToggle}
          disabled={disabled}
          name={name}
          id={id}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          role="switch"
          aria-checked={checked}
        />
        <span
          className={[
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
            disabled ? "opacity-50" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ backgroundColor: checked ? checkedColor : uncheckedColor }}
          onClick={(event) => {
            event.preventDefault();
            handleToggle();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleToggle();
            }
          }}
          role="presentation"
        >
          <span
            className={[
              "absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform duration-200",
              checked ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </span>
      </label>
    );
  }
);

ToggleSwitch.displayName = "ToggleSwitch";
