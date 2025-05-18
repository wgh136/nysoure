import {useEffect, useState} from "react";
import ResourcesView from "../components/resources_view.tsx";
import {network} from "../network/network.ts";
import { app } from "../app.ts";
import Markdown from "react-markdown";
import {useTranslation} from "react-i18next";

export default function HomePage() {
  useEffect(() => {
    document.title = app.appName;
  }, [])

  const [isCollapsed, setIsCollapsed] = useState(false);

  const {t} = useTranslation()

  return <>
    {
      app.siteInfo && <div className={"mt-4 px-4"}>
        <div className="collapse collapse-arrow bg-base-100 border border-base-300" onClick={() => setIsCollapsed(!isCollapsed)}>
          <input type="radio" name="my-accordion-2" checked={isCollapsed} style={{
            "cursor": "pointer",
          }}/>
          <div className="collapse-title font-semibold cursor-pointer">{t("About this site")}</div>
          <article className="collapse-content text-sm cursor-auto" onClick={(e) => {
            e.stopPropagation();
          }}>
            <Markdown>
              {app.siteInfo}
            </Markdown>
          </article>
        </div>
      </div>
    }
    <ResourcesView loader={(page) => network.getResources(page)}></ResourcesView>
  </>
}