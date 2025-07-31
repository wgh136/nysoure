import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router"; // 新增 useNavigate
import showToast from "../components/toast";
import { network } from "../network/network";
import { Collection } from "../network/models";
import Markdown from "react-markdown";
import ResourcesView from "../components/resources_view";
import Loading from "../components/loading";
import { MdOutlineDelete, MdOutlineEdit } from "react-icons/md";
import { app } from "../app";
import { useTranslation } from "../utils/i18n";
import Button from "../components/button";

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [resourcesKey, setResourcesKey] = useState(0);
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const idInt = parseInt(id || "0", 10);
    if (isNaN(idInt)) {
      showToast({
        type: "error",
        message: "Invalid collection ID",
      });
      return;
    }

    network.getCollection(idInt).then((res) => {
      if (res.success) {
        setCollection(res.data!);
      } else {
        showToast({
          type: "error",
          message: res.message || "Failed to load collection",
        });
      }
    });
  }, [resourcesKey]);

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

  const isOwner = collection?.user?.id === app?.user?.id;

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
      <div className="mx-4 mt-4 p-4 bg-base-100-tr82 shadow rounded-xl">
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
        </div>
      </div>
      <ResourcesView
        loader={() => {
          return network.listCollectionResources(collection!.id);
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
    );
    setEditLoading(false);
    if (res.success) {
      showToast({ type: "success", message: t("Edit successful") });
      const getRes = await network.getCollection(collection.id);
      if (getRes.success) {
        onSaved(getRes.data!);
      } else {
        onSaved({ ...collection, title: editTitle, article: editArticle });
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
          className="textarea w-full min-h-32"
          value={editArticle}
          onChange={(e) => setEditArticle(e.target.value)}
          disabled={editLoading}
        />
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
