import type { Route } from "./+types/user.$username";
import { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import type {
  Collection,
  CommentWithResource,
  RFile,
  User,
} from "../network/models";
import { network } from "../network/network";
import showToast from "../components/toast";
import ResourcesView from "../components/resources_view";
import Loading from "../components/loading";
import Pagination from "../components/pagination";
import { CommentContent } from "../components/comment_tile";
import Badge from "../components/badge";
import {
  MdOutlineAdd,
  MdOutlineArchive,
  MdOutlineComment,
  MdOutlineLock,
  MdOutlinePhotoAlbum,
} from "react-icons/md";
import { useTranslation } from "../hook/i18n";
import Markdown from "react-markdown";
import { configFromMatches, useConfig } from "../hook/config";

export async function loader({ params, request }: Route.LoaderArgs) {
  const username = params.username ? decodeURIComponent(params.username) : "";
  
  // Get cookie from request headers for SSR
  const cookie = request.headers.get("Cookie");
  
  // Get hash from URL to determine which tab
  const url = new URL(request.url);
  const hash = url.hash.slice(1);
  
  // Fetch user info on server side
  const [userRes, firstPageResources] = await Promise.all([
    network.getUserInfo(username),
    // Only fetch resources if on resources tab or no hash (default tab)
    (hash === "resources" || hash === "") 
      ? network.getResourcesByUser(username, 1)
      : Promise.resolve({ success: false, message: "Not on resources tab" }),
  ]);
  
  return {
    user: userRes.success ? userRes.data : null,
    username,
    error: !userRes.success ? userRes.message : null,
    firstPageResources: firstPageResources.success ? firstPageResources : undefined,
  };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  const username = data?.username || "User";
  return [
    { title: `${username} - ${config.server_name}` },
    { name: "description", content: `${username}'s profile on ${config.server_name}` },
  ];
}

export default function UserPage({ loaderData }: Route.ComponentProps) {
  const { user: initialUser, username, error, firstPageResources } = loaderData;
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Get current page from hash
  const getPageFromHash = useCallback(() => {
    const hash = location.hash.slice(1);
    const hashs = ["collections", "resources", "comments", "files"];
    const index = hashs.indexOf(hash);
    return index !== -1 ? index : 0;
  }, [location.hash]);

  const [page, setPage] = useState(getPageFromHash());

  // Listen to hash changes
  useEffect(() => {
    setPage(getPageFromHash());
  }, [location.hash, getPageFromHash]);

  // Update hash function
  const updateHash = (newPage: number) => {
    const hashs = ["collections", "resources", "comments", "files"];
    const newHash = hashs[newPage] || "collections";
    if (location.hash.slice(1) !== newHash) {
      navigate(`/user/${username}#${newHash}`, { replace: true });
    }
  };

  useEffect(() => {
    document.title = username || "User";
  }, [username]);

  if (error) {
    return (
      <div className="w-full m-4">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full">
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <UserCard user={user} />
      <div className="bg-base-100/80 backdrop-blur-sm rounded-box mt-4 shadow mb-4 p-4">
      <div
        role="tablist"
        className="border-b border-base-300 mx-2 flex tabs tabs-border"
      >
        <div
          role="tab"
          className={`tab ${page === 0 ? "tab-active" : ""} `}
          onClick={() => updateHash(0)}
        >
          {t("Collections")}
        </div>
        <div
          role="tab"
          className={`tab ${page === 1 ? "tab-active" : ""} `}
          onClick={() => updateHash(1)}
        >
          {t("Resources")}
        </div>
        <div
          role="tab"
          className={`tab ${page === 2 ? "tab-active" : ""}`}
          onClick={() => updateHash(2)}
        >
          {t("Comments")}
        </div>
        <div
          role="tab"
          className={`tab ${page === 3 ? "tab-active" : ""}`}
          onClick={() => updateHash(3)}
        >
          {t("Files")}
        </div>
      </div>
      <div className="w-full">
        {page === 0 && <Collections username={username} />}
        {page === 1 && <UserResources user={user} initialData={firstPageResources} />}
        {page === 2 && <UserComments user={user} />}
        {page === 3 && <UserFiles user={user} />}
      </div>
      <div className="h-4"></div>
      </div>
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  const { t } = useTranslation();

  const statistics = (
    <p className="mt-2">
      <Badge className="badge-soft badge-primary badge-lg m-1">
        <MdOutlinePhotoAlbum size={18} />
        <span className="ml-1 text-sm">
          {t("Resources")} {user.resources_count}
        </span>
      </Badge>
      <Badge className="badge-soft badge-secondary badge-lg m-1">
        <MdOutlineArchive size={18} />
        <span className="ml-1 text-sm">
          {t("Files")} {user.files_count}
        </span>
      </Badge>
      <Badge className="badge-soft badge-accent badge-lg m-1">
        <MdOutlineComment size={18} />
        <span className="ml-1 text-sm">
          {t("Comments")} {user.comments_count}
        </span>
      </Badge>
    </p>
  );

  const haveBio = user.bio.trim() !== "";

  return (
    <div className="bg-base-100/80 backdrop-blur-sm rounded-box mt-4 shadow mb-4 p-2">
      <div className={"flex m-4 items-center"}>
        <div className={"avatar py-2"}>
          <div className="w-24 rounded-full ring-2 ring-offset-2 ring-primary ring-offset-base-100">
            <img alt={"avatar"} src={network.getUserAvatar(user)} />
          </div>
        </div>
        <div className="w-6"></div>
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <div className="h-4"></div>
          {haveBio ? (
            <p className="text-sm text-base-content/80">{user.bio.trim()}</p>
          ) : (
            statistics
          )}
        </div>
      </div>
      {haveBio && <div className="mb-2 mx-2">{statistics}</div>}
    </div>
  );
}

function UserResources({ user, initialData }: { user: User; initialData?: any }) {
  return (
    <ResourcesView
      storageKey={`user-${user.username}`}
      loader={(page) => {
        return network.getResourcesByUser(user.username, page);
      }}
      initialData={initialData}
    ></ResourcesView>
  );
}

function UserComments({ user }: { user: User }) {
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(0);

  return (
    <div className="px-2">
      <CommentsList
        username={user.username}
        page={page}
        maxPageCallback={setMaxPage}
        key={`user-comments-${user.username}-${page}`}
      />
      {maxPage ? (
        <div className={"w-full flex justify-center"}>
          <Pagination page={page} setPage={setPage} totalPages={maxPage} />
        </div>
      ) : null}
    </div>
  );
}

function CommentsList({
  username,
  page,
  maxPageCallback,
}: {
  username: string;
  page: number;
  maxPageCallback: (maxPage: number) => void;
}) {
  const [comments, setComments] = useState<CommentWithResource[] | null>(null);

  useEffect(() => {
    network.listCommentsByUser(username, page).then((res) => {
      if (res.success) {
        setComments(res.data!);
        maxPageCallback(res.totalPages || 1);
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    });
  }, [maxPageCallback, page, username]);

  if (comments == null) {
    return (
      <div className={"w-full"}>
        <Loading />
      </div>
    );
  }

  return (
    <>
      {comments.map((comment) => {
        return (
          <CommentTileWithResource
            elevation="high"
            comment={comment}
            key={comment.id}
          />
        );
      })}
    </>
  );
}

function CommentTileWithResource({
  comment,
  elevation,
}: {
  comment: CommentWithResource;
  elevation?: "normal" | "high";
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const link = `/comments/${comment.id}`;
  const userLink = `/user/${encodeURIComponent(comment.user.username)}`;
  const resourceLink = `/resources/${comment.resource.id}`;

  return (
    <NavLink
      to={link}
      className={
        "block card bg-base-100-tr82 p-2 my-3 transition-shadow cursor-pointer" +
        (!elevation || elevation == "normal"
          ? " shadow-xs hover:shadow"
          : " shadow hover:shadow-md")
      }
    >
      <div className={"flex flex-row items-center my-1 mx-1"}>
        <NavLink
          to={userLink}
          className="flex flex-row items-center avatar cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <span className="w-8 h-8 rounded-full overflow-clip">
            <img src={network.getUserAvatar(comment.user)} alt={"avatar"} />
          </span>
          <span className={"w-2"}></span>
          <span className={"text-sm font-bold"}>{comment.user.username}</span>
        </NavLink>

        <div className={"grow"}></div>
        <Badge className={"badge-ghost badge-sm"}>
          {new Date(comment.created_at).toLocaleDateString()}
        </Badge>
      </div>
      <div className={"px-2 pt-2 comment_tile"}>
        <CommentContent content={comment.content} />
      </div>
      {comment.content_truncated ? (
        <div className={"pl-2 pb-2"}>
          <Badge className={"badge-soft badge-info badge-sm"}>
            {t("Click to view more")}
          </Badge>
        </div>
      ) : (
        <div className={"h-2"} />
      )}
      {comment.resource && (
        <div className={"mx-2 mb-2"}>
          <NavLink
            to={resourceLink}
            className="text-sm text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MdOutlinePhotoAlbum size={16} className="inline-block mr-1" />
            {comment.resource.title}
          </NavLink>
        </div>
      )}
    </NavLink>
  );
}

function UserFiles({ user }: { user: User }) {
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(0);

  return (
    <div className="px-2">
      <FilesList
        username={user.username}
        page={page}
        maxPageCallback={setMaxPage}
        key={`${user.username}-files-${page}`}
      />
      {maxPage ? (
        <div className={"w-full flex justify-center"}>
          <Pagination page={page} setPage={setPage} totalPages={maxPage} />
        </div>
      ) : null}
    </div>
  );
}

function fileSizeToString(size: number) {
  if (size < 1024) {
    return size + "B";
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + "KB";
  } else if (size < 1024 * 1024 * 1024) {
    return (size / 1024 / 1024).toFixed(2) + "MB";
  } else {
    return (size / 1024 / 1024 / 1024).toFixed(2) + "GB";
  }
}

function FilesList({
  username,
  page,
  maxPageCallback,
}: {
  username: string;
  page: number;
  maxPageCallback: (maxPage: number) => void;
}) {
  const [files, setFiles] = useState<RFile[] | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    network.getUserFiles(username, page).then((res) => {
      if (res.success) {
        setFiles(res.data!);
        maxPageCallback(res.totalPages || 1);
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    });
  }, [maxPageCallback, page, username]);

  if (files == null) {
    return (
      <div className={"w-full"}>
        <Loading />
      </div>
    );
  }

  return (
    <>
      {files.map((file) => {
        return (
          <NavLink
            key={file.id}
            to={`/resources/${file.resource!.id}#files`}
          >
            <div
              className={
                "card shadow p-4 my-2 hover:shadow-md transition-shadow bg-base-100-tr82"
              }
            >
              <h4 className={"font-bold pb-2"}>{file!.filename}</h4>
              <div className={"text-sm comment_tile"}>
                <Markdown>{file.description.replaceAll("\n", "  \n")}</Markdown>
              </div>
              <p className={"pt-1"}>
                <Badge className={"badge-soft badge-secondary text-xs mr-2"}>
                  <MdOutlineArchive size={16} className={"inline-block"} />
                  {file!.is_redirect
                    ? t("Redirect")
                    : fileSizeToString(file!.size)}
                </Badge>
                <Badge className={"badge-soft badge-accent text-xs mr-2"}>
                  <MdOutlinePhotoAlbum size={16} className={"inline-block"} />
                  {(() => {
                    let title = file.resource!.title;
                    if (title.length > 20) {
                      title = title.slice(0, 20) + "...";
                    }
                    return title;
                  })()}
                </Badge>
              </p>
            </div>
          </NavLink>
        );
      })}
    </>
  );
}

function Collections({ username }: { username?: string }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [realSearchKeyword, setRealSearchKeyword] = useState("");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = useConfig();

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  const delayedSetSearchKeyword = (keyword: string) => {
    setSearchKeyword(keyword);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const timer = setTimeout(() => {
      setRealSearchKeyword(keyword);
    }, 500);
    setDebounceTimer(timer);
  };

  return (
    <>
      <div className="flex m-4">
        <input
          type="text"
          placeholder="Search"
          className="input input-bordered w-full max-w-2xs mr-2"
          value={searchKeyword}
          onChange={(e) => delayedSetSearchKeyword(e.target.value)}
        />
        <span className="flex-1" />
        {username == config.user?.username && (
          <button
            className="btn btn-primary btn-soft"
            onClick={() => {
              navigate("/create-collection");
            }}
          >
            <MdOutlineAdd size={20} className="inline-block mr-1" />
            {t("Create")}
          </button>
        )}
      </div>
      <CollectionsList
        username={username}
        keyword={realSearchKeyword}
        key={realSearchKeyword}
      />
    </>
  );
}

async function getOrSearchUserCollections(
  username: string,
  keyword: string,
  page: number,
) {
  if (keyword.trim() === "") {
    return network.listUserCollections(username, page);
  } else {
    let res = await network.searchUserCollections(username, keyword);
    return {
      success: res.success,
      data: res.data || [],
      totalPages: 1,
      message: res.message || "",
    };
  }
}

function CollectionsList({
  username,
  keyword,
}: {
  username?: string;
  keyword: string;
}) {
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);
  const [collections, setCollections] = useState<Collection[] | null>(null);

  useEffect(() => {
    if (!username) return;
    setCollections(null);
    getOrSearchUserCollections(username, keyword, page).then((res) => {
      if (res.success) {
        setCollections(res.data! || []);
        setMaxPage(res.totalPages || 1);
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    });
  }, [username, keyword, page]);

  if (collections == null) {
    return (
      <div className={"w-full"}>
        <Loading />
      </div>
    );
  }

  return (
    <>
      {collections.map((collection) => {
        return <CollectionCard collection={collection} key={collection.id} />;
      })}
      {maxPage > 1 ? (
        <div className={"w-full flex justify-center"}>
          <Pagination page={page} setPage={setPage} totalPages={maxPage} />
        </div>
      ) : null}
    </>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div
      className={
        "card m-4 p-2 bg-base-100-tr82 shadow hover:shadow-md transition-shadow cursor-pointer"
      }
      onClick={() => {
        navigate(`/collection/${collection.id}`);
      }}
    >
      <h3 className={"card-title mx-2 mt-2"}>{collection.title}</h3>
      <div className={"p-2 comment_tile"}>
        <CollectionContent content={collection.article} />
      </div>
      <div className="flex">
        <Badge className="badge-soft badge-primary text-xs mr-2">
          <MdOutlinePhotoAlbum size={16} className="inline-block" />
          {collection.resources_count} {t("Resources")}
        </Badge>
        <span className="flex-1" />
        {!collection.isPublic && (
          <Badge className="badge-soft badge-error text-xs mr-2 shadow-xs">
            <MdOutlineLock size={16} className="inline-block" /> {t("Private")}
          </Badge>
        )}
      </div>
    </div>
  );
}

function CollectionContent({ content }: { content: string }) {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.endsWith("  ")) {
      // Ensure that each line ends with two spaces for Markdown to recognize it as a line break
      lines[i] = line + "  ";
    }
  }
  content = lines.join("\n");

  return <Markdown>{content}</Markdown>;
}
