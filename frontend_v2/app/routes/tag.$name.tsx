import type { Route } from "./+types/tag.$name";
import { useTranslation } from "../hook/i18n";
import { useState, useEffect } from "react";
import type { Tag } from "../network/models";
import Badge from "~/components/badge";
import showToast from "~/components/toast";
import { network } from "../network/network";
import ResourcesView from "~/components/resources_view";
import Markdown from "react-markdown";
import { MdAdd, MdClose, MdEdit, MdOutlineLink } from "react-icons/md";
import { configFromMatches, useConfig, canUpload } from "../hook/config";
import { useLoaderData, useNavigate } from "react-router";

export function meta({ matches, params }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  const tagName = params.name;
  return [
    { title: `${tagName} - ${config.server_name}` },
    { name: "description", content: `Resources tagged with ${tagName}` },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const tagName = params.name;
  if (!tagName) {
    throw new Error("Tag name is required");
  }

  const [tagResponse, firstPageResources] = await Promise.all([
    network.getTagByName(tagName),
    network.getResourcesByTag(tagName, 1),
  ]);

  return {
    tagName,
    tag: tagResponse.success ? tagResponse.data : null,
    firstPageResources: firstPageResources.success ? firstPageResources : undefined,
  };
}

export default function TaggedResourcesPage() {
  const { t } = useTranslation();
  const { tagName, tag: initialTag, firstPageResources } = useLoaderData<typeof loader>();
  const [tag, setTag] = useState<Tag | null>(initialTag ?? null);
  const navigate = useNavigate();

  if (!tagName) {
    return (
      <div className="m-4">
        <div role="alert" className="alert alert-error">
          <span>{t("Tag not found")}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="my-4 px-1 bg-base-100/80 backdrop-blur-xs shadow rounded-box">
        <div className="flex items-center px-4">
          <h1 className="text-2xl pt-6 pb-2 font-bold flex-1">
            {tag?.name ?? tagName}
          </h1>
          <div className="flex items-center gap-2">
            {tag && (
              <MergeTagButton
                tag={tag}
                onMerged={(mergedTag) => {
                  showToast({
                    message: t("Tag merged successfully"),
                    type: "success",
                  });
                  setTag(mergedTag);
                  navigate(`/tag/${encodeURIComponent(mergedTag.name)}`);
                }}
              />
            )}
            {tag && <EditTagButton tag={tag} onEdited={setTag} />}
          </div>
        </div>
        {tag?.type && (
          <h2 className="text-base-content/60 ml-2 text-lg pl-2 mb-2">
            {tag.type}
          </h2>
        )}
        <div className="px-3">
          {(tag?.aliases ?? []).map((e, idx) => {
            return (
              <Badge key={idx} className="m-1 badge-primary badge-soft">
                {e}
              </Badge>
            );
          })}
          {tag && <EditAliasDialog tag={tag} onEdited={setTag} />}
        </div>
        {tag?.description ? (
          <article className="px-4 py-2">
            <Markdown>{tag.description}</Markdown>
          </article>
        ) : <div className="h-2" />}
        {tag?.vnid ? (
          <a
            href={"https://vndb.org/" + tag.vnid}
            target="_blank"
            rel="noreferrer"
            className="badge badge-soft badge-secondary mb-4 mx-4"
          >
            <MdOutlineLink className="inline-block text-lg" />
            VNDB
          </a>
        ) : null}
      </div>
      <ResourcesView
        key={tag?.name ?? tagName}
        storageKey={`tagged-${tag?.name ?? tagName}`}
        loader={(page) => network.getResourcesByTag(tagName, page)}
        initialData={firstPageResources}
      />
    </div>
  );
}

function MergeTagButton({
  tag,
  onMerged,
}: {
  tag: Tag;
  onMerged: (tag: Tag) => void;
}) {
  const config = useConfig();
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState("");
  const [targetTag, setTargetTag] = useState<Tag | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!config.isLoggedIn || !canUpload(config)) {
    return null;
  }

  const submit = async () => {
    if (!targetTag) {
      setError(t("Please select a target tag"));
      return;
    }
    if (targetTag.id === tag.id) {
      setError(t("Cannot merge a tag into itself"));
      return;
    }

    setIsLoading(true);
    setError(null);
    const res = await network.mergeTag(tag.id, targetTag.id);
    setIsLoading(false);
    if (res.success && res.data) {
      const dialog = document.getElementById(
        "merge_tag_dialog",
      ) as HTMLDialogElement;
      dialog.close();
      onMerged(res.data);
      return;
    }
    setError(res.message || t("Unknown error"));
  };

  const searchTarget = async (value: string) => {
    setKeyword(value);
    setTargetTag(null);
    setError(null);
    const trimmedValue = value.trim();
    if (trimmedValue === "") {
      return;
    }

    setIsSearching(true);
    const res = await network.searchTags(trimmedValue, true);
    setIsSearching(false);
    if (!res.success || !res.data) {
      setError(res.message || t("Unknown error"));
      return;
    }

    const matchedTag = res.data.find((item) => item.id !== tag.id) ?? null;
    setTargetTag(matchedTag);
    if (!matchedTag) {
      setError(t("No target tag found"));
    }
  };

  return (
    <>
      <button
        className="btn btn-outline btn-error"
        onClick={() => {
          setKeyword("");
          setTargetTag(null);
          setError(null);
          const dialog = document.getElementById(
            "merge_tag_dialog",
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        {t("Merge")}
      </button>
      <dialog id="merge_tag_dialog" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Merge Tag")}</h3>
          <p className="text-sm text-base-content/70 mt-2 mb-4">
            {t("Merge this tag into another tag. Existing resources will be moved and this tag will be deleted permanently.")}
          </p>
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend">{t("Target Tag")}</legend>
            <input
              type="text"
              className="input input-primary w-full"
              placeholder={t("Search Tags")}
              value={keyword}
              onChange={(e) => {
                void searchTarget(e.target.value);
              }}
            />
          </fieldset>
          {targetTag && (
            <div className="py-2 border border-base-300 rounded-3xl mt-4 px-4 flex items-center gap-2">
              <span className="text-sm text-base-content/70">{t("Target Tag")}</span>
              <Badge>{targetTag.name}</Badge>
            </div>
          )}
          {isSearching && (
            <p className="text-sm text-base-content/70 mt-3">{t("Searching...")}</p>
          )}
          {error && (
            <div role="alert" className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost">{t("Close")}</button>
            </form>
            <button
              onClick={submit}
              className="btn btn-error"
              disabled={isLoading}
            >
              {isLoading && <span className="loading loading-spinner"></span>}
              {t("Merge")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function EditTagButton({
  tag,
  onEdited,
}: {
  tag: Tag;
  onEdited: (t: Tag) => void;
}) {
  const config = useConfig();
  const [description, setDescription] = useState(tag.description);
  const [isAlias, setIsAlias] = useState(false);
  const [aliasOf, setAliasOf] = useState<Tag | null>(null);
  const [type, setType] = useState(tag.type);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Only show edit button if user can upload
  if (!config.isLoggedIn || !canUpload(config)) {
    return null;
  }

  useEffect(() => {
    setDescription(tag.description);
  }, [tag.description]);

  const submit = async () => {
    if (description && description.length > 256) {
      setError(t("Description is too long"));
      return;
    }
    setIsLoading(true);
    setError(null);
    const res = await network.setTagInfo(
      tag.id,
      description,
      aliasOf?.id ?? null,
      type,
    );
    setIsLoading(false);
    if (res.success) {
      const dialog = document.getElementById(
        "edit_tag_dialog",
      ) as HTMLDialogElement;
      dialog.close();
      onEdited(res.data!);
    } else {
      setError(res.message || t("Unknown error"));
    }
  };

  return (
    <>
      <button
        className="btn btn-primary"
        onClick={() => {
          setDescription(tag.description);
          setType(tag.type);
          setAliasOf(null);
          setIsAlias(false);
          setError(null);
          const dialog = document.getElementById(
            "edit_tag_dialog",
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        {t("Edit")}
      </button>
      <dialog id="edit_tag_dialog" className="modal">
        <div
          className="modal-box"
          style={{
            overflowY: "initial",
          }}
        >
          <h3 className="font-bold text-lg">{t("Edit Tag")}</h3>
          <div className="flex py-3">
            <p className="flex-1">The tag is an alias of another tag</p>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={isAlias}
              onChange={(e) => {
                setIsAlias(e.target.checked);
              }}
            />
          </div>

          {isAlias ? (
            <>
              {aliasOf && (
                <div className="py-2 border border-base-300 rounded-3xl mt-2 px-4 flex mb-4">
                  <p className="flex-1">Alias Of: </p>
                  <Badge>{aliasOf.name}</Badge>
                </div>
              )}
              <p className="text-sm text-base-content/70 mb-2">
                {t("Search Tags")}
              </p>
              <input
                type="text"
                className="input input-primary w-full"
                placeholder={t("Search Tags")}
                onInput={async (e) => {
                  const keyword = e.currentTarget.value;
                  if (keyword.length > 0) {
                    const res = await network.searchTags(keyword, true);
                    if (res.success && res.data && res.data.length > 0) {
                      setAliasOf(res.data[0]);
                    }
                  }
                }}
              />
            </>
          ) : (
            <>
              <fieldset className="fieldset w-full">
                <legend className="fieldset-legend">Type</legend>
                <input
                  type="text"
                  className="input w-full"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />
              </fieldset>
              <fieldset className="fieldset w-full">
                <legend className="fieldset-legend">Description</legend>
                <textarea
                  className="textarea w-full"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </fieldset>
            </>
          )}

          {error && (
            <div role="alert" className="alert alert-error mt-2">
              <span>{error}</span>
            </div>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">{t("Close")}</button>
            </form>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={isLoading}
            >
              {isLoading && <span className="loading loading-spinner"></span>}
              {t("Save")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function EditAliasDialog({
  tag,
  onEdited,
}: {
  tag: Tag;
  onEdited?: (t: Tag) => void;
}) {
  const config = useConfig();
  const { t } = useTranslation();
  const [alias, setAlias] = useState<string[]>(() => {
    return tag.aliases ?? [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Only show edit button if user can upload
  if (!config.isLoggedIn || !canUpload(config)) {
    return null;
  }

  const submit = async () => {
    if (isLoading) {
      return;
    }
    setError(null);

    // compare alias and tag.aliases
    let isModified = false;
    if (alias.length !== tag.aliases?.length) {
      isModified = true;
    } else {
      for (let i = 0; i < alias.length; i++) {
        if (alias[i] !== tag.aliases![i]) {
          isModified = true;
          break;
        }
      }
    }
    if (!isModified) {
      setError(t("No changes made"));
      return;
    }

    setIsLoading(true);
    const res = await network.setTagAlias(tag.id, alias);
    setIsLoading(false);
    if (res.success) {
      const dialog = document.getElementById(
        "edit_alias_dialog",
      ) as HTMLDialogElement;
      dialog.close();
      if (onEdited) {
        onEdited(res.data!);
      }
    } else {
      setError(res.message || t("Unknown error"));
    }
  };

  return (
    <>
      <Badge
        className="m-1 badge-accent badge-soft cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => {
          setError(null);
          setAlias(tag.aliases ?? []);
          const dialog = document.getElementById(
            "edit_alias_dialog",
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <MdEdit />
        <span>{t("Edit")}</span>
      </Badge>
      <dialog id="edit_alias_dialog" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Edit Alias")}</h3>
          <p className="py-4">
            {alias.map((e, idx) => {
              return (
                <Badge key={idx} className="m-1 badge-primary badge-soft">
                  <span className="text-sm pt-0.5">{e}</span>
                  <span
                    className="inline-flex items-center justify-center cursor-pointer hover:bg-base-300 transition-colors rounded-full h-5 w-5"
                    onClick={() => {
                      setAlias((prev) => prev.filter((x) => x !== e));
                    }}
                  >
                    <MdClose />
                  </span>
                </Badge>
              );
            })}
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={content}
              onInput={(e) => {
                setContent(e.currentTarget.value);
              }}
            />
            <button
              className="btn btn-circle"
              onClick={() => {
                if (content.trim() === "") {
                  return;
                }
                setAlias((prev) => [...prev, content.trim()]);
                setContent("");
              }}
            >
              <MdAdd size={20} />
            </button>
          </div>
          {error && (
            <div role="alert" className="alert alert-error mt-2">
              <span>{error}</span>
            </div>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost">{t("Close")}</button>
            </form>
            <button
              onClick={submit}
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading && <span className="loading loading-spinner"></span>}
              {t("Submit")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
