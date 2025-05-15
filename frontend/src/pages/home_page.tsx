import { useEffect } from "react";
import ResourcesView from "../components/resources_view.tsx";
import {network} from "../network/network.ts";
import { app } from "../app.ts";

export default function HomePage() {
  useEffect(() => {
    document.title = app.appName;
  }, [])

  return <ResourcesView loader={(page) => network.getResources(page)}></ResourcesView>
}