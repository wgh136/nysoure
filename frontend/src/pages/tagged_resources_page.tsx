import {useParams} from "react-router";
import {ErrorAlert} from "../components/alert.tsx";
import ResourcesView from "../components/resources_view.tsx";
import {network} from "../network/network.ts";

export default function TaggedResourcesPage() {
  const {tag} = useParams()

  if (!tag) {
    return <div>
      <ErrorAlert message={"Tag not found"}/>
    </div>
  }

  return <div>
    <h1 className={"text-2xl pt-4 pb-2 px-4"}>
      {tag}
    </h1>
    <ResourcesView loader={(page) => {
      return network.getResourcesByTag(tag, page)
    }}></ResourcesView>
  </div>
}