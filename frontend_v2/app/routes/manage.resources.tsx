import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ErrorAlert } from "~/components/alert";
import Loading from "~/components/loading";
import Pagination from "~/components/pagination";
import showToast from "~/components/toast";
import { configFromMatches, isAdmin, useConfig } from "~/hook/config";
import { useTranslation } from "~/hook/i18n";
import type { ResourceStats } from "~/network/models";
import { network } from "~/network/network";
import type { Route } from "./+types/manage.resources";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: config.server_name },
    { name: "description", content: config.site_description },
  ];
}

export default function ManageResourcesPage() {
  const { t } = useTranslation();
  const config = useConfig();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rows, setRows] = useState<ResourceStats[] | null>(null);
  const [sort, setSort] = useState<
    "views_asc" | "views_desc" | "downloads_asc" | "downloads_desc" | undefined
  >();

  const fetchRows = useCallback(async () => {
    const res = await network.getAdminResourceStats(page, sort);
    if (!res.success) {
      showToast({ message: res.message, type: "error" });
      return;
    }
    setRows(res.data ?? []);
    setTotalPages(res.totalPages ?? 0);
  }, [page, sort]);

  const toggleSort = useCallback((kind: "views" | "downloads") => {
    setPage(1);
    setSort((prev) => {
      if (kind === "views") {
        if (prev === "views_desc") return "views_asc";
        return "views_desc";
      }
      if (prev === "downloads_desc") return "downloads_asc";
      return "downloads_desc";
    });
  }, []);

  const sortSuffix = useCallback(
    (kind: "views" | "downloads") => {
      if (kind === "views") {
        if (sort === "views_desc") return " ↓";
        if (sort === "views_asc") return " ↑";
      }
      if (sort === "downloads_desc") return " ↓";
      if (sort === "downloads_asc") return " ↑";
      return "";
    },
    [sort],
  );

  useEffect(() => {
    if (!config.user || !isAdmin(config)) {
      return;
    }
    setRows(null);
    fetchRows();
  }, [config.user, config, fetchRows]);

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

  if (rows === null) {
    return <Loading />;
  }

  return (
    <div className="mx-4 mb-4 flex flex-col gap-3">
      <div className="text-sm opacity-70">
        {t("Resources")}: {rows.length}
      </div>

      <div className="rounded-box border border-base-content/10 bg-base-100 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t("Resource ID")}</th>
              <th>{t("Title")}</th>
              <th>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => toggleSort("views")}
                >
                  {t("View Count")}
                  {sortSuffix("views")}
                </button>
              </th>
              <th>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => toggleSort("downloads")}
                >
                  {t("Download Count")}
                  {sortSuffix("downloads")}
                </button>
              </th>
              <th>{t("File Count")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="hover cursor-pointer"
                onClick={() => navigate(`/resources/${row.id}`)}
              >
                <td>{row.id}</td>
                <td>{row.title}</td>
                <td>{row.views}</td>
                <td>{row.downloads}</td>
                <td>{row.file_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 0 ? (
        <div className="flex flex-row justify-center items-center my-2">
          <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        </div>
      ) : null}
    </div>
  );
}
