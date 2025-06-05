import { useSearchParams } from "react-router";
import { network } from "../network/network.ts";
import ResourcesView from "../components/resources_view.tsx";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function SearchPage() {
  const [params, _] = useSearchParams();
  const { t } = useTranslation();

  const keyword = params.get("keyword");

  useEffect(() => {
    document.title = t("Search") + ": " + (keyword || "");
  }, []);

  if (keyword === null || keyword === "") {
    return (
      <div role="alert" className="alert alert-info alert-dash">
        <span>{t("Enter a search keyword to continue")}</span>
      </div>
    );
  }

  return (
    <div key={keyword}>
      <h1 className={"text-2xl px-4 pt-4 font-bold my-2"}>
        {t("Search")}: {keyword}
      </h1>
      <ResourcesView
        storageKey={`search-${keyword}`}
        loader={(page) => network.searchResources(keyword, page)}
      ></ResourcesView>
    </div>
  );
}
