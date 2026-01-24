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
  initialData,
}: {
  loader: (page: number) => Promise<PageResponse<Resource>>;
  storageKey?: string;
  actionBuilder?: (resource: Resource) => React.ReactNode;
  initialData?: PageResponse<Resource>;
}) {
  const [data, setData] = useState<Resource[]>(initialData?.data ?? []);
  const pageRef = useRef(initialData ? 2 : 1);
  const totalPagesRef = useRef(initialData?.totalPages ?? 1);
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
    if (isClient && !initialData) {
      loadPage();
    }
  }, [loadPage, isClient, initialData]);

  const maybeLoadMore = useInfiniteLoader(loadPage);

  if (!isClient) {
    return (
      <></>
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
