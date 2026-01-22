import type { PageResponse, Resource } from "../network/models.ts";
import { useCallback, useEffect, useRef, useState } from "react";
import showToast from "~/components/toast.ts";
import ResourceCard from "~/components/resource_card.tsx";
import { Masonry, useInfiniteLoader } from "masonic";
import Loading from "~/components/loading.tsx";

export default function ResourcesView({
  loader,
  storageKey,
  actionBuilder,
}: {
  loader: (page: number) => Promise<PageResponse<Resource>>;
  storageKey?: string;
  actionBuilder?: (resource: Resource) => React.ReactNode;
}) {
  const [data, setData] = useState<Resource[]>([]);
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const isLoadingRef = useRef(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadPage = useCallback(async () => {
    if (pageRef.current > totalPagesRef.current) return;
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    const res = await loader(pageRef.current);
    if (!res.success) {
      showToast({ message: res.message, type: "error" });
    } else {
      isLoadingRef.current = false;
      pageRef.current = pageRef.current + 1;
      totalPagesRef.current = res.totalPages ?? 1;
      let data = res.data ?? [];
      setData((prev) => [...prev, ...data]);
    }
  }, [loader]);

  useEffect(() => {
    if (isClient) {
      loadPage();
    }
  }, [loadPage, isClient]);

  const maybeLoadMore = useInfiniteLoader(loadPage);

  if (!isClient) {
    return (
      <div className={"pt-2"}>
        <Loading />
      </div>
    );
  }

  return (
    <div className={"pt-2"}>
      <Masonry
        onRender={maybeLoadMore}
        columnWidth={300}
        items={data}
        columnGutter={16}
        rowGutter={16}
        render={(e) => {
          return (
            <ResourceCard
              resource={e.data}
              key={e.data.id}
              action={actionBuilder?.(e.data)}
            />
          );
        }}
      ></Masonry>
      {pageRef.current <= totalPagesRef.current && <Loading />}
    </div>
  );
}
