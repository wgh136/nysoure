import { useRouteLoaderData } from "react-router";
import type { Config } from "~/network/models";

export function useConfig() {
  return useRouteLoaderData("app") as Config;
}

export function configFromMatches(matches: any[]) {
  const match = matches.find((m) => m.id === "app");
  return match!.loaderData as Config;
}