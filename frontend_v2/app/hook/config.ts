import { useRouteLoaderData } from "react-router";
import type { Config } from "~/network/models";

export function useConfig() {
  return useRouteLoaderData("app") as Config;
}