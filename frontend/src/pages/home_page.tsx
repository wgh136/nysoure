import { useEffect, useState } from "react";
import ResourcesView from "../components/resources_view.tsx";
import { network } from "../network/network.ts";
import { app } from "../app.ts";
import { RSort } from "../network/models.ts";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../components/AppContext.tsx";

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
      <div className={"flex p-4 items-center"}>
        <select
          value={order}
          className="select w-52 select-primary"
          onInput={(e) => {
            const value = Number(e.currentTarget.value);
            setOrder(value as RSort);
          }}
        >
          <option disabled>{t("Select a Order")}</option>
          <option value="0">{t("Time Ascending")}</option>
          <option value="1">{t("Time Descending")}</option>
          <option value="2">{t("Views Ascending")}</option>
          <option value="3">{t("Views Descending")}</option>
          <option value="4">{t("Downloads Ascending")}</option>
          <option value="5">{t("Downloads Descending")}</option>
        </select>
      </div>
      <ResourcesView
        key={`home_page_${order}`}
        storageKey={`home_page_${order}`}
        loader={(page) => network.getResources(page, order)}
      />
    </>
  );
}
