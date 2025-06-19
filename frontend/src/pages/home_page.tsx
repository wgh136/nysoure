import { useEffect, useState } from "react";
import ResourcesView from "../components/resources_view.tsx";
import { network } from "../network/network.ts";
import { app } from "../app.ts";
import { RSort } from "../network/models.ts";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../components/AppContext.tsx";
import Select from "../components/select.tsx";

export default function HomePage() {
  useEffect(() => {
    document.title = app.appName;
  }, []);

  const { t } = useTranslation();

  const appContext = useAppContext();

  const [order, setOrder] = useState(() => {
    if (appContext && appContext.get("home_page_order") !== undefined) {
      return appContext.get("home_page_order");
    }
    return RSort.TimeDesc;
  });

  useEffect(() => {
    if (appContext && order !== RSort.TimeDesc) {
      appContext.set("home_page_order", order);
    }
  }, [appContext, order]);

  return (
    <>
      <div className={"flex pt-4 px-4 items-center"}>
        <Select
          values={[
            t("Time Ascending"),
            t("Time Descending"),
            t("Views Ascending"),
            t("Views Descending"),
            t("Downloads Ascending"),
            t("Downloads Descending"),
          ]}
          current={order}
          onSelected={(index) => {
            setOrder(index);
            if (appContext) {
              appContext.set("home_page_order", index);
            }
          }}
        />
      </div>
      <ResourcesView
        key={`home_page_${order}`}
        storageKey={`home_page_${order}`}
        loader={(page) => network.getResources(page, order)}
      />
    </>
  );
}
