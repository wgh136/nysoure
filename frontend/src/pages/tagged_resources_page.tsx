import { useParams } from "react-router";
import { ErrorAlert } from "../components/alert.tsx";
import ResourcesView from "../components/resources_view.tsx";
import { network } from "../network/network.ts";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function TaggedResourcesPage() {
  const { tag } = useParams()

  const { t } = useTranslation();

  if (!tag) {
    return <div>
      <ErrorAlert message={"Tag not found"} />
    </div>
  }

  useEffect(() => {
    document.title = t("Tag: " + tag);
  }, [tag])

  return <div>
    <h1 className={"text-2xl pt-6 pb-2 px-4 font-bold"}>
      Tag: {tag}
    </h1>
    <ResourcesView loader={(page) => {
      return network.getResourcesByTag(tag, page)
    }}></ResourcesView>
  </div>
}