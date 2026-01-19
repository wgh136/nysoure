import { i18nData } from "~/i18n";
import { useLoaderData, useRouteLoaderData } from "react-router";

export function getI18nData(acceptLanguage?: string | null) {
  if (!acceptLanguage) {
    return {};
  }
  let language = acceptLanguage.split(",")[0];
  if (language !== "zh-CN" && language.startsWith("zh-")) {
    language = "zh-TW";
  }
  if (!language.startsWith("zh-")) {
    return {}
  }
  return i18nData[language as keyof typeof i18nData]["translation"];
}

function t(key: string) {
  const { i18n } = useRouteLoaderData("app");
  return i18n[key] || key;
}

export function useTranslation() {
  return {
    t: t,
  }
}