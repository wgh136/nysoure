import type { Route } from "./+types/home";
import { useTranslation } from "../hook/i18n";
import { useEffect, useState } from "react";
import { RSort } from "~/network/models";
import type { Resource, Statistics } from "../network/models";
import ResourcesView from "~/components/resources_view.tsx";
import { network } from "../network/network";
import { useConfig } from "../hook/config";
import { useLoaderData, useNavigate } from "react-router";
import { MdOutlineClass, MdOutlineArchive, MdOutlineAccessTime, MdOutlineStorage } from "react-icons/md";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader() {
  const [pinnedResources, statistic] = await Promise.all([
    network.getPinnedResources(),
    network.getStatistic(),
  ]);
  if (!pinnedResources.success || !statistic.success) {
    throw new Error("Failed to load pinned resources or statistic");
  }
  return {
    pinnedResources: pinnedResources.data ?? [],
    statistic: statistic.data ?? null,
  };
}

export default function Home() {
  const { t } = useTranslation();

  const [order, setOrder] = useState(RSort.TimeDesc);

  return (
    <>
      <HomeHeader />
      <div className={"flex pt-4 items-center"}>
        <select
          value={order}
          className="select select-primary max-w-72"
          onChange={(e) => {
            const order = parseInt(e.target.value);
            setOrder(order);
          }}
        >
          {[
            t("Time Ascending"),
            t("Time Descending"),
            t("Views Ascending"),
            t("Views Descending"),
            t("Downloads Ascending"),
            t("Downloads Descending"),
            t("Release Date Ascending"),
            t("Release Date Descending"),
          ].map((label, idx) => (
            <option key={idx} value={idx}>
              {label}
            </option>
          ))}
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

function HomeHeader() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const config = useConfig();
  const { pinnedResources, statistic } = useLoaderData<typeof loader>();

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
    <div className="grid grid-cols-1 md:grid-cols-2 py-4 gap-4">
      <SiteCard />
      <div className={"hidden md:flex h-52 md:h-60 flex-col"}>
        <StatisticCard statistic={statistic} />
      </div>
    </div>
  );
}


function SiteCard() {
  const config = useConfig();

  return <div className="h-52 md:h-60 rounded-box shadow site-card relative">
    <div className="p-4 absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent">
      <h2 className="break-all card-title text-white">{config.server_name}</h2>
      <p className={"text-xs text-white"}>{config.site_description}</p>
    </div>
  </div>
}

function formatBytes(bytes: number) {
  if (bytes == 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, index)).toFixed(2) + " " + units[index];
}

function StatisticCard({ statistic }: { statistic: Statistics }) {
  const { t } = useTranslation();

  const now = new Date();
  const createdAt = new Date(statistic.start_time * 1000);
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const survivalTime = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const storage = formatBytes(statistic.storage ?? 0);

  return (
    <div className="grid grid-cols-2 shadow w-full h-full bg-base-100/60 backdrop-blur-sm rounded-box">
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

      <div className="stat">
        <div className="stat-figure text-accent pt-2">
          <MdOutlineStorage size={28} />
        </div>
        <div className="stat-title">{t("Storage")}</div>
        <div className="stat-value">{storage}</div>
      </div>
    </div>
  );
}
