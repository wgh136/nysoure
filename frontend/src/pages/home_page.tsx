import { useEffect, useState } from "react";
import ResourcesView from "../components/resources_view.tsx";
import { network } from "../network/network.ts";
import { app } from "../app.ts";
import { Resource, RSort } from "../network/models.ts";
import { useTranslation } from "../utils/i18n";
import { useAppContext } from "../components/AppContext.tsx";
import Select from "../components/select.tsx";
import { useNavigate } from "react-router";
import { useNavigator } from "../components/navigator.tsx";

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
      <PinnedResources />
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

let cachedPinnedResources: Resource[] | null = null;

function PinnedResources() {
  const [pinnedResources, setPinnedResources] = useState<Resource[]>([]);
  const navigator = useNavigator();

  useEffect(() => {
    if (cachedPinnedResources != null) {
      setPinnedResources(cachedPinnedResources);
      return;
    }
    const prefetchData = app.getPreFetchData();
    if (prefetchData && prefetchData.background) {
      navigator.setBackground(network.getResampledImageUrl(prefetchData.background));
    }
    if (prefetchData && prefetchData.pinned) {
      cachedPinnedResources = prefetchData.pinned;
      setPinnedResources(cachedPinnedResources!);
      return;
    }
    const fetchPinnedResources = async () => {
      const res = await network.getPinnedResources();
      if (res.success) {
        cachedPinnedResources = res.data ?? [];
        setPinnedResources(res.data ?? []);
      }
    };
    fetchPinnedResources();
  }, []);

  if (pinnedResources.length == 0) {
    return <></>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {pinnedResources.map((resource) => (
        <PinnedResourceItem key={resource.id} resource={resource} />
      ))}
    </div>
  );
}

function PinnedResourceItem({ resource }: { resource: Resource }) {
  const navigate = useNavigate();

  return (
    <a
      href={`/resources/${resource.id}`}
      className={"cursor-pointer block"}
      onClick={(e) => {
        e.preventDefault();
        navigate(`/resources/${resource.id}`);
      }}
    >
      <div
        className={
          "shadow hover:shadow-md transition-shadow rounded-2xl overflow-clip relative"
        }
      >
        {resource.image != null && (
          <figure>
            <img
              src={network.getResampledImageUrl(resource.image.id)}
              alt="cover"
              className="w-full aspect-[7/3] object-cover"
            />
          </figure>
        )}
        <div className="p-4 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent">
          <h2 className="break-all card-title text-white">{resource.title}</h2>
        </div>
      </div>
    </a>
  );
}
