import type { Route } from "./+types/search";
import { useTranslation } from "../hook/i18n";
import { useSearchParams } from "react-router";
import { network } from "../network/network";
import ResourcesView from "~/components/resources_view";
import { configFromMatches } from "../hook/config";

export function meta({ matches, location }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  const searchParams = new URLSearchParams(location.search);
  const keyword = searchParams.get("keyword") || "";
  
  return [
    { title: keyword ? `${keyword} - Search - ${config.server_name}` : `Search - ${config.server_name}` },
    { name: "description", content: `Search results for: ${keyword}` },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword") || "";
  
  return {
    keyword,
  };
}

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword");

  if (!keyword || keyword === "") {
    return (
      <div className="p-4">
        <div role="alert" className="alert alert-info alert-dash">
          <span>{t("Enter a search keyword to continue")}</span>
        </div>
      </div>
    );
  }

  return (
    <div key={keyword}>
      <h1 className="text-2xl px-4 pt-4 font-bold my-2">
        {t("Search")}: {keyword}
      </h1>
      <ResourcesView
        storageKey={`search-${keyword}`}
        loader={(page) => network.searchResources(keyword, page)}
      />
    </div>
  );
}
