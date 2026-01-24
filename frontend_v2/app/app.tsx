import { Outlet, useNavigation } from "react-router";
import { getI18nData } from "./hook/i18n";
import type { Route } from "./+types/app";
import { network } from "./network/network";
import { useEffect } from "react";
import NProgress from "nprogress";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.server_name },
    { name: "description", content: loaderData?.site_description },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("cookie");
  const config = await network.getFrontendConfig(cookie || undefined);
  return {
    ...config.data,
    isLoggedIn: config.data?.user !== null,
    i18n: getI18nData(request.headers.get("accept-language")),
  }
}

export default function App() {
  const navigation = useNavigation();

  useEffect(() => {
    console.log(navigation.state);
    if (navigation.state === "loading") {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [navigation.state]);

  return <Outlet />;
}