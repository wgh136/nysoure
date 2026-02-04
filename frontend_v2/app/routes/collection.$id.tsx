import type { Route } from "./+types/collection.$id";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import showToast from "../components/toast";
import { network } from "../network/network";
import type { Collection } from "../network/models";
import Markdown from "react-markdown";
import ResourcesView from "../components/resources_view";
import Loading from "../components/loading";
import { MdOutlineDelete, MdOutlineEdit, MdOutlineLock } from "react-icons/md";
import { useTranslation } from "../hook/i18n";
import Button from "../components/button";
import Badge from "../components/badge";
import { configFromMatches, useConfig } from "../hook/config";
import removeMd from "remove-markdown";

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id ? parseInt(params.id, 10) : 0;
  
  if (isNaN(id) || id <= 0) {
    throw new Error("Invalid collection ID");
  }

  // Get cookie from request headers for SSR authentication
  const cookie = request.headers.get("Cookie");

  // Fetch collection data on server side
  const [collectionRes, firstPageResources] = await Promise.all([
    network.getCollection(id, cookie || undefined),
    network.listCollectionResources(id, 1, cookie || undefined),
  ]);
  
  if (!collectionRes.success) {
    throw new Error(collectionRes.message || "Failed to load collection");
  }

  return {
    collection: collectionRes.data,
    collectionId: id,
    firstPageResources: firstPageResources.success ? firstPageResources : undefined,
  };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  const title = loaderData?.collection?.title || "Collection";
  const article = loaderData?.collection?.article || "";
  const plainText = removeMd(article).replace(/\s+/g, ' ').trim();
  const description = plainText.length > 160 
    ? plainText.substring(0, 157) + '...' 
    : plainText;
  return [
    { title: `${title} - ${config.server_name}` },
    { name: "description", content: description },
  ];
}

export default function CollectionPage({ loaderData }: Route.ComponentProps) {
  const { collection: initialCollection, collectionId, firstPageResources } = loaderData;
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(initialCollection ?? null);
  const [resourcesKey, setResourcesKey] = useState(0);
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  const config = useConfig();
  const isOwner = collection?.user?.id === config.user?.id;

  useEffect(() => {
    if (collection) {
      document.title = collection.title;
    }
  }, [collection]);

  const toBeDeletedRID = useRef<number | null>(null);

  const handleDeleteResource = (resourceId: number) => {
    toBeDeletedRID.current = resourceId;
    const dialog = document.getElementById(
      "deleteResourceDialog",
    ) as HTMLDialogElement | null;
    if (dialog) {
      dialog.showModal();
    }
  };

  const handleDeletedResourceConfirmed = () => {
    if (toBeDeletedRID.current === null) return;
    network
      .removeResourceFromCollection(collection!.id, toBeDeletedRID.current)
      .then((res) => {
        if (res.success) {
          showToast({
            type: "success",
            message: "Resource deleted successfully",
          });
          setResourcesKey((prev) => prev + 1); // Trigger re-render of ResourcesView
        } else {
          showToast({
            type: "error",
            message: res.message || "Failed to delete resource",
          });
        }
      });
    toBeDeletedRID.current = null;
    const dialog = document.getElementById(
      "deleteResourceDialog",
    ) as HTMLDialogElement | null;
    if (dialog) {
      dialog.close();
    }
  };

  const handleDeleteCollection = () => setDeleteOpen(true);
  const handleDeleteCollectionConfirmed = async () => {
    if (!collection) return;
    setIsDeleting(true);
    const res = await network.deleteCollection(collection.id);
    setIsDeleting(false);
    if (res.success) {
      showToast({
        type: "success",
        message: "Collection deleted successfully",
      });
      setDeleteOpen(false);
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    } else {
      showToast({
        type: "error",
        message: res.message || "Failed to delete collection",
      });
      setDeleteOpen(false);
    }
  };

  const openEditDialog = () => setEditOpen(true);

  const handleEditSaved = (newCollection: Collection) => {
    setCollection(newCollection);
    setEditOpen(false);
  };

  if (!collection) {
    return <Loading />;
  }

  return (
    <>
      <div className="my-4 p-4 bg-base-100/80 backdrop-blur-xs shadow rounded-box">
        <h1 className="text-2xl font-bold">{collection?.title}</h1>
        <article>
          <CollectionContent content={collection?.article || ""} />
        </article>
        <div className="flex items-center flex-row-reverse">
          {isOwner && (
            <>
              <button
                className="btn btn-sm btn-ghost ml-2"
                onClick={openEditDialog}
              >
                <MdOutlineEdit size={16} />
                {t("Edit")}
              </button>
              <button
                className="btn btn-sm btn-error btn-ghost ml-2"
                onClick={handleDeleteCollection}
              >
                <MdOutlineDelete size={16} />
                {t("Delete")}
              </button>
            </>
          )}
          <span className="flex-1" />
          {!collection.isPublic && (
            <Badge className="badge-soft badge-error text-xs mr-2 shadow-xs">
              <MdOutlineLock size={16} className="inline-block" />{" "}
              {t("Private")}
            </Badge>
          )}
        </div>
      </div>
      <ResourcesView
        loader={(page) => {
          return network.listCollectionResources(collection!.id, page);
        }}
        actionBuilder={
          isOwner
            ? (r) => {
                return (
                  <button
                    className="btn btn-sm btn-rounded btn-error btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteResource(r.id);
                    }}
                  >
                    <MdOutlineDelete size={16} />
                  </button>
                );
              }
            : undefined
        }
        key={resourcesKey}
        initialData={resourcesKey === 0 ? firstPageResources : undefined}
      />
      <dialog id="deleteResourceDialog" className="modal">
        <div className="modal-box">
          <h2 className="font-bold text-lg">Remove Resource</h2>
          <p>Are you sure you want to remove this resource?</p>
          <div className="modal-action">
            <Button
              onClick={() => {
                const dialog = document.getElementById(
                  "deleteResourceDialog",
                ) as HTMLDialogElement | null;
                if (dialog) {
                  dialog.close();
                }
              }}
            >
              Cancel
            </Button>
            <Button
              className="btn-error"
              onClick={handleDeletedResourceConfirmed}
            >
              Delete
            </Button>
          </div>
        </div>
      </dialog>
      {deleteOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="font-bold text-lg mb-2">{t("Delete Collection")}</h2>
            <p>
              {t(
                "Are you sure you want to delete this collection? This action cannot be undone.",
              )}
            </p>
            <div className="modal-action">
              <Button className="btn" onClick={() => setDeleteOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button
                className="btn btn-error"
                onClick={handleDeleteCollectionConfirmed}
                isLoading={isDeleting}
              >
                {t("Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {editOpen && collection && (
        <EditCollectionDialog
          open={editOpen}
          collection={collection}
          onClose={() => setEditOpen(false)}
          onSaved={handleEditSaved}
        />
      )}
    </>
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

function EditCollectionDialog({
  open,
  collection,
  onClose,
  onSaved,
}: {
  open: boolean;
  collection: Collection;
  onClose: () => void;
  onSaved: (newCollection: Collection) => void;
}) {
  const [editTitle, setEditTitle] = useState(collection.title);
  const [editArticle, setEditArticle] = useState(collection.article);
  const [editIsPublic, setEditIsPublic] = useState(collection.isPublic);
  const [editLoading, setEditLoading] = useState(false);

  const { t } = useTranslation();

  const handleEditSave = async () => {
    if (editTitle.trim() === "" || editArticle.trim() === "") {
      showToast({
        type: "error",
        message: t("Title and description cannot be empty"),
      });
      return;
    }
    setEditLoading(true);
    const res = await network.updateCollection(
      collection.id,
      editTitle,
      editArticle,
      editIsPublic,
    );
    setEditLoading(false);
    if (res.success) {
      showToast({ type: "success", message: t("Edit successful") });
      const getRes = await network.getCollection(collection.id);
      if (getRes.success) {
        onSaved(getRes.data!);
      } else {
        onSaved({
          ...collection,
          title: editTitle,
          article: editArticle,
          isPublic: editIsPublic,
        });
      }
    } else {
      showToast({
        type: "error",
        message: res.message || t("Failed to save changes"),
      });
    }
  };

  if (!open) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h2 className="font-bold text-lg mb-2">{t("Edit Collection")}</h2>
        <label className="block mb-1">{t("Title")}</label>
        <input
          className="input w-full mb-2"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          disabled={editLoading}
        />
        <label className="block mb-1">{t("Description")}</label>
        <textarea
          className="textarea w-full min-h-32 mb-2"
          value={editArticle}
          onChange={(e) => setEditArticle(e.target.value)}
          disabled={editLoading}
        />
        <label className="flex items-center mb-4 mt-2">
          <input
            type="checkbox"
            checked={!editIsPublic}
            onChange={(e) => setEditIsPublic(!e.target.checked)}
            className="checkbox mr-2"
            disabled={editLoading}
          />
          {t("Private")}
        </label>
        <div className="modal-action">
          <button className="btn" onClick={onClose} disabled={editLoading}>
            {t("Cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleEditSave}
            disabled={editLoading}
          >
            {editLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              t("Save")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
