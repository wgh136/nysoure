import { useEffect, useState } from "react";
import { useTranslation } from "../hook/i18n";
import { MdPalette } from "react-icons/md";

interface ThemeOption {
  name: string;
  displayName: string;
  displayColor: string;
}

const themeOptions: ThemeOption[] = [
  {
    name: "pink",
    displayName: "Light Pink",
    displayColor: "oklch(65% 0.241 354.308)",
  },
  {
    name: "ocean",
    displayName: "Ocean Breeze",
    displayColor: "oklch(70% 0.18 220)",
  },
  {
    name: "mint",
    displayName: "Mint Leaf",
    displayColor: "oklch(65% 0.16 160)",
  },
  {
    name: "glow",
    displayName: "Golden Glow",
    displayColor: "oklch(70% 0.16 70)",
  },
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState("pink");

  const { t } = useTranslation();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "pink";
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeName: string) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", themeName);
  };

  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName);
    applyTheme(themeName);
    localStorage.setItem("theme", themeName);
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-circle btn-ghost">
        <MdPalette size={24} />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-[1] w-max min-w-35 p-2 shadow"
      >
        {themeOptions.map((theme) => (
          <li key={theme.name}>
            <a
              className={`flex items-center justify-between${
                currentTheme === theme.name ? "active" : ""
              }`}
              onClick={() => handleThemeChange(theme.name)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full border-2 border-base-content/20"
                  style={{ backgroundColor: theme.displayColor }}
                />
                <span className="mr-1">{t(theme.displayName)}</span>
              </div>
              {currentTheme === theme.name && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
