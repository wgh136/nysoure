import { useEffect, useState } from "react";
import ResourcesView from "../components/resources_view.tsx";
import { network } from "../network/network.ts";
import { app } from "../app.ts";
import { Resource, RSort, Statistics } from "../network/models.ts";
import { useTranslation } from "../utils/i18n";
import { useAppContext } from "../components/AppContext.tsx";
import Select from "../components/select.tsx";
import { useNavigate } from "react-router";
import { useNavigator } from "../components/navigator.tsx";
import {
  MdOutlineAccessTime,
  MdOutlineArchive,
  MdOutlineClass,
} from "react-icons/md";

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
      <HomeHeader />
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

function HomeHeader() {
  const [pinnedResources, setPinnedResources] = useState<Resource[]>([]);
  const [statistic, setStatistic] = useState<Statistics | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigator = useNavigator();
  const appContext = useAppContext();

  useEffect(() => {
    const pinned = appContext.get("pinned_resources");
    const stats = appContext.get("site_statistics");
    if (pinned) {
      setPinnedResources(pinned);
    }
    if (stats) {
      setStatistic(stats);
    }
    if (pinned && stats) {
      return;
    }

    const prefetchData = app.getPreFetchData();
    if (prefetchData && prefetchData.background) {
      navigator.setBackground(
        network.getResampledImageUrl(prefetchData.background),
      );
    }
    let ok1 = false;
    let ok2 = false;
    if (prefetchData && prefetchData.statistics) {
      setStatistic(prefetchData.statistics);
      appContext.set("site_statistics", prefetchData.statistics);
      ok1 = true;
    }
    if (prefetchData && prefetchData.pinned) {
      const r = prefetchData.pinned;
      appContext.set("pinned_resources", r);
      setPinnedResources(r!);
      ok2 = true;
    }
    if (ok1 && ok2) {
      return;
    }

    const fetchPinnedResources = async () => {
      const res = await network.getPinnedResources();
      if (res.success) {
        appContext.set("pinned_resources", res.data);
        setPinnedResources(res.data ?? []);
      }
    };
    const fetchStatistics = async () => {
      const res = await network.getStatistic();
      if (res.success) {
        appContext.set("site_statistics", res.data);
        setStatistic(res.data!);
      }
    };
    fetchPinnedResources();
    fetchStatistics();
  }, [appContext, navigator]);

  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (pinnedResources.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % pinnedResources.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [pinnedResources.length, currentIndex]);

  if (pinnedResources.length == 0 || statistic == null) {
    return <></>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 p-4 gap-4">
      <PinnedResourcesCarousel
        resources={pinnedResources}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
      />
      <div className={"hidden md:flex h-52 md:h-60 flex-col"}>
        <div className={"card w-full shadow p-4 mb-4 bg-base-100-tr82 flex-1"}>
          <h2 className={"text-lg font-bold pb-2"}>{app.appName}</h2>
          <p className={"text-xs"}>{app.siteDescription}</p>
        </div>
        <StatisticCard statistic={statistic} />
      </div>
    </div>
  );
}

function PinnedResourcesCarousel({
  resources,
  currentIndex,
  onIndexChange,
}: {
  resources: Resource[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}) {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {resources.map((resource) => (
            <div key={resource.id} className="w-full flex-shrink-0">
              <PinnedResourceItem resource={resource} />
            </div>
          ))}
        </div>
      </div>
      {resources.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {resources.map((_, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
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
              className="w-full h-52 md:h-60 object-cover"
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

function StatisticCard({ statistic }: { statistic: Statistics }) {
  const { t } = useTranslation();

  const now = new Date();
  const createdAt = new Date(statistic.start_time * 1000);
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const survivalTime = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="stats shadow w-full  bg-base-100-tr82">
      <div className="stat">
        <div className="stat-figure text-secondary pt-2">
          <MdOutlineClass size={28} />
        </div>
        <div className="stat-title">{t("Resources")}</div>
        <div className="stat-value">{statistic.total_resources}</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-secondary pt-2">
          <MdOutlineArchive size={28} />
        </div>
        <div className="stat-title">{t("Files")}</div>
        <div className="stat-value">{statistic.total_files}</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-accent pt-2">
          <MdOutlineAccessTime size={28} />
        </div>
        <div className="stat-title">{t("Survival time")}</div>
        <div className="stat-value">{survivalTime}</div>
      </div>
    </div>
  );
}
