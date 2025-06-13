import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ActivityType } from "../network/models.ts";
import { network } from "../network/network.ts";
import showToast from "../components/toast.ts";
import { useTranslation } from "react-i18next";
import { MdArrowRight } from "react-icons/md";
import { useNavigate } from "react-router";
import Loading from "../components/loading.tsx";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const pageRef = useRef(0);
  const maxPageRef = useRef(1);
  const isLoadingRef = useRef(false);

  const fetchNextPage = useCallback(async () => {
    if (isLoadingRef.current || pageRef.current >= maxPageRef.current) return;
    isLoadingRef.current = true;
    const response = await network.getActivities(pageRef.current);
    if (response.success) {
      setActivities((prev) => [...prev, ...response.data!]);
      pageRef.current += 1;
      maxPageRef.current = response.totalPages!;
    } else {
      showToast({
        type: "error",
        message: response.message || "Failed to load activities",
      });
    }
    isLoadingRef.current = false;
  }, []);

  useEffect(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 100 &&
        !isLoadingRef.current &&
        pageRef.current < maxPageRef.current
      ) {
        fetchNextPage();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchNextPage]);

  return (
    <div className={"pb-2"}>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
      {pageRef.current < maxPageRef.current && <Loading />}
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const { t } = useTranslation();

  const messages = [
    "Unknown activity",
    t("Published a resource"),
    t("Updated a resource"),
    t("Commented on a resource"),
  ];

  const navigate = useNavigate();

  let content = <></>;

  if (
    activity.type === ActivityType.ResourcePublished ||
    activity.type === ActivityType.ResourceUpdated
  ) {
    content = (
      <div className={"mx-1"}>
        <div className={"font-bold my-4"}>{activity.resource?.title}</div>
        {activity.resource?.image && (
          <div>
            <img
              className={"object-contain max-h-52 mt-2 rounded-lg"}
              src={network.getImageUrl(activity.resource.image.id)}
              alt={activity.resource.title}
            />
          </div>
        )}
      </div>
    );
  } else if (activity.type === ActivityType.ResourceCommented) {
    content = (
      <div className={"mt-2"}>
        <div className={"text-sm mx-1"}>{activity.comment?.content}</div>
        <div className={"flex items-center mt-1"}>
          <MdArrowRight />
          <span className={"text-sm text-base-content/80"}>
            {activity.comment?.resource?.title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "card shadow m-4 p-4 hover:shadow-md transition-shadow cursor-pointer"
      }
      onClick={() => {
        if (
          activity.type === ActivityType.ResourcePublished ||
          activity.type === ActivityType.ResourceUpdated
        ) {
          navigate(`/resources/${activity.resource?.id}`);
        } else if (activity.type === ActivityType.ResourceCommented) {
          navigate(`/resources/${activity.comment?.resource.id}#comments`);
        }
      }}
    >
      <div className={"flex items-center"}>
        <div className={"avatar w-9 h-9 rounded-full"}>
          <img
            className={"rounded-full"}
            alt={"avatar"}
            src={network.getUserAvatar(activity.user!)}
          />
        </div>
        <span className={"mx-2 font-bold"}>{activity.user?.username}</span>
        <span className={"ml-2 badge badge-primary badge-soft"}>
          {messages[activity.type]}
        </span>
      </div>
      {content}
    </div>
  );
}
