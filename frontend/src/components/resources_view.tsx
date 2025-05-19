import {PageResponse, Resource} from "../network/models.ts";
import {useCallback, useEffect, useRef, useState} from "react";
import showToast from "./toast.ts";
import ResourceCard from "./resource_card.tsx";
import {Masonry, useInfiniteLoader} from "masonic";
import Loading from "./loading.tsx";

export default function ResourcesView({loader}: {loader: (page: number) => Promise<PageResponse<Resource>>}) {
  const [data, setData] = useState<Resource[]>([])
  const pageRef = useRef(1)
  const totalPagesRef = useRef(1)
  const isLoadingRef = useRef(false)

  const loadPage = useCallback(async () => {
    if (pageRef.current > totalPagesRef.current) return
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    const res = await loader(pageRef.current)
    if (!res.success) {
      showToast({message: res.message, type: "error"})
    } else {
      isLoadingRef.current = false
      pageRef.current = pageRef.current + 1
      totalPagesRef.current = res.totalPages ?? 1
      setData((prev) => [...prev, ...res.data!])
    }
  }, [loader])

  useEffect(() => {
    loadPage()
  }, [loadPage]);

  const maybeLoadMore = useInfiniteLoader(loadPage)

  return <div className={"px-2 pt-2"}>
    <Masonry onRender={maybeLoadMore} columnWidth={300} items={data} render={(e) => {
      return <ResourceCard resource={e.data} key={e.data.id}/>
    } }></Masonry>
    {
      pageRef.current <= totalPagesRef.current && <Loading/>
    }
  </div>
}