import {useEffect, useState} from "react";
import ResourcesView from "../components/resources_view.tsx";
import {network} from "../network/network.ts";
import { app } from "../app.ts";
import {RSort} from "../network/models.ts";
import Button from "../components/button.tsx";
import {MdInfoOutline} from "react-icons/md";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router";

export default function HomePage() {
  useEffect(() => {
    document.title = app.appName;
  }, [])

  const [order, setOrder] = useState(RSort.TimeDesc)

  const {t} = useTranslation()

  const navigate = useNavigate()

  return <>
    <div className={"flex p-4 items-center"}>
      <select value={order} className="select w-52 select-info" onInput={(e) => {
        const value = e.currentTarget.value;
        if (value === "0") {
          setOrder(RSort.TimeAsc);
        } else if (value === "1") {
          setOrder(RSort.TimeDesc);
        } else if (value === "2") {
          setOrder(RSort.ViewsAsc);
        } else if (value === "3") {
          setOrder(RSort.ViewsDesc);
        } else if (value === "4") {
          setOrder(RSort.DownloadsAsc);
        } else if (value === "5") {
          setOrder(RSort.DownloadsDesc);
        }
      }}>
        <option disabled>{t("Select a Order")}</option>
        <option value="0">{t("Time Ascending")}</option>
        <option value="1">{t("Time Descending")}</option>
        <option value="2">{t("Views Ascending")}</option>
        <option value="3">{t("Views Descending")}</option>
        <option value="4">{t("Downloads Ascending")}</option>
        <option value="5">{t("Downloads Descending")}</option>
      </select>
      <span className={"flex-1"}/>
      <Button onClick={() => {
        navigate("/about");
      }}>
        <div className={"flex items-center"}>
          <MdInfoOutline size={24} className={"inline-block mr-2"}/>
          <span>{t("About this site")}</span>
        </div>
      </Button>
    </div>
    <ResourcesView
      key={`home_page_${order}`}
      storageKey={`home_page_${order}`}
      loader={(page) => network.getResources(page, order)}
    />
  </>
}