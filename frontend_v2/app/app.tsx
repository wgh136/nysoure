import { Outlet } from "react-router";
import { getI18nData } from "./hook/i18n";
import type { Route } from "./+types/app";
import { network } from "./network/network";

export async function loader({ params, request }: Route.LoaderArgs) {
    const config = await network.getFrontendConfig();
    return {
      ...config.data,
      i18n: getI18nData(request.headers.get("accept-language")),
    }
  }

export default function App() {
  return <Outlet />;
}