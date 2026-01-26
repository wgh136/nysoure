import { useRouteLoaderData } from "react-router";
import type { Config } from "~/network/models";
import { Permission } from "~/network/models";

export function useConfig() {
  return useRouteLoaderData("app") as Config;
}

export function configFromMatches(matches: any[]) {
  const match = matches.find((m) => m.id === "app");
  return match!.loaderData as Config;
}

// Helper functions to check permissions
export function isAdmin(config: Config): boolean {
  return config.user?.permission === Permission.Admin;
}

export function canUpload(config: Config): boolean {
  if (!config.user) return false;
  // Uploader and Admin can upload
  return config.user.permission >= Permission.Uploader;
}