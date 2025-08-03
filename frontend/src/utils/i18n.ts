import { createContext, useContext, useMemo } from "react";

function t(data: any, language: string) {
  return (key: string) => {
    return data[language]?.["translation"]?.[key] || key;
  };
}

export const i18nContext = createContext<any>({});

export function useTranslation() {
  const data = useContext(i18nContext);
  const userLang = navigator.language;

  return useMemo(
    () => ({
      t: t(data, userLang),
    }),
    [data, userLang],
  );
}
