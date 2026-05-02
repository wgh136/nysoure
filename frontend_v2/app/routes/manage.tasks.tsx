import { useCallback, useEffect, useMemo, useState } from "react";
import { MdRefresh } from "react-icons/md";
import { ErrorAlert } from "~/components/alert";
import Button from "~/components/button";
import Loading from "~/components/loading";
import showToast from "~/components/toast";
import { configFromMatches, isAdmin, useConfig } from "~/hook/config";
import { useTranslation } from "~/hook/i18n";
import type { ServerTask } from "~/network/models";
import { network } from "~/network/network";
import type { Route } from "./+types/manage.tasks";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: config.server_name },
    { name: "description", content: config.site_description },
  ];
}

export default function ManageTasksPage() {
  const { t } = useTranslation();
  const config = useConfig();
  const [tasks, setTasks] = useState<ServerTask[] | null>(null);
  const [stoppingTaskId, setStoppingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const res = await network.listServerTasks();
    if (!res.success) {
      showToast({ message: res.message, type: "error" });
      return;
    }
    setTasks(res.data ?? []);
  }, []);

  useEffect(() => {
    if (!config.user || !isAdmin(config)) {
      return;
    }

    fetchTasks();
    const timer = setInterval(fetchTasks, 5000);
    return () => clearInterval(timer);
  }, [config.user, config, fetchTasks]);

  const sortedTasks = useMemo(() => {
    if (!tasks) {
      return [];
    }

    const statusPriority: Record<string, number> = {
      running: 0,
      pending: 1,
      failed: 2,
      completed: 3,
    };

    return [...tasks].sort((a, b) => {
      const pa = statusPriority[a.status] ?? 99;
      const pb = statusPriority[b.status] ?? 99;
      if (pa !== pb) {
        return pa - pb;
      }
      const ta = a.finish_time ? new Date(a.finish_time).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.finish_time ? new Date(b.finish_time).getTime() : Number.MAX_SAFE_INTEGER;
      return tb - ta;
    });
  }, [tasks]);

  const stopTask = useCallback(async (taskId: string) => {
    setStoppingTaskId(taskId);
    try {
      const res = await network.stopServerTask(taskId);
      if (!res.success) {
        showToast({ message: res.message, type: "error" });
        return;
      }
      showToast({ message: t("Task stopped") });
      await fetchTasks();
    } finally {
      setStoppingTaskId(null);
    }
  }, [fetchTasks, t]);

  if (!config.user) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not logged in. Please log in to access this page.")}
      />
    );
  }

  if (!isAdmin(config)) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not authorized to access this page.")}
      />
    );
  }

  if (tasks == null) {
    return <Loading />;
  }

  return (
    <div className="mx-4 mb-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70">
          {t("Total tasks")}: {sortedTasks.length}
        </div>
        <Button className="btn-outline" onClick={fetchTasks}>
          <span className="flex items-center gap-1">
            <MdRefresh size={16} />
            {t("Refresh")}
          </span>
        </Button>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="alert alert-info alert-outline">{t("No tasks found")}</div>
      ) : (
        <div className="rounded-box border border-base-content/10 bg-base-100 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t("Task ID")}</th>
                <th>{t("Status")}</th>
                <th>{t("Progress")}</th>
                <th>{t("Error")}</th>
                <th>{t("Finished At")}</th>
                <th>{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => {
                const isTerminal = task.status === "completed" || task.status === "failed";
                return (
                  <tr key={task.id} className="hover">
                    <td className="max-w-64 truncate" title={task.id}>{task.id}</td>
                    <td>{task.status}</td>
                    <td>{(task.progress * 100).toFixed(1)}%</td>
                    <td className="max-w-80 truncate" title={task.error}>{task.error || "-"}</td>
                    <td>{task.finish_time ? new Date(task.finish_time).toLocaleString() : "-"}</td>
                    <td>
                      <Button
                        className="btn-error btn-outline"
                        disabled={isTerminal || stoppingTaskId === task.id}
                        isLoading={stoppingTaskId === task.id}
                        onClick={() => stopTask(task.id)}
                      >
                        {t("Stop")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
