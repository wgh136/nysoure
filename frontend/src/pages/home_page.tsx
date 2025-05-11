import ResourcesView from "../components/resources_view.tsx";
import {network} from "../network/network.ts";

export default function HomePage() {
  return <ResourcesView loader={(page) => network.getResources(page)}></ResourcesView>
}