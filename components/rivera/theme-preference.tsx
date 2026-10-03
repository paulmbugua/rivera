"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

const choices = [
  {
    value: "system",
    label: "Device",
    copy: "Follow this device",
    icon: Monitor,
  },
  { value: "light", label: "Light", copy: "Soft and airy", icon: Sun },
  { value: "dark", label: "Dark", copy: "Calm in low light", icon: Moon },
] as const;

export function ThemePreference() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <section className="theme-preference" aria-labelledby="theme-heading">
      <div className="settings-section-heading">
        <div>
          <p className="settings-kicker">Appearance</p>
          <h2 id="theme-heading">Make Rivera feel like yours</h2>
          <p>
            Use your device preference automatically, or choose a look for this
            browser.
          </p>
        </div>
        <span className="theme-orb" aria-hidden="true">
          {mounted && theme === "dark" ? <Moon /> : <Sun />}
        </span>
      </div>
      <div className="theme-options" aria-label="Color theme">
        {choices.map(({ value, label, copy, icon: Icon }) => {
          const selected = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              className={selected ? "theme-option selected" : "theme-option"}
              aria-pressed={selected}
              onClick={() => setTheme(value)}
            >
              <Icon aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{copy}</small>
              </span>
              <i aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
