import { useParams } from "react-router";
import { ErrorAlert } from "../components/alert.tsx";
import ResourcesView from "../components/resources_view.tsx";
import { network } from "../network/network.ts";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tag } from "../network/models.ts";
import Button from "../components/button.tsx";
import Markdown from "react-markdown";
import { app } from "../app.ts";
import Input, { TextArea } from "../components/input.tsx";
import TagInput from "../components/tag_input.tsx";
import Badge from "../components/badge.tsx";
import { useAppContext } from "../components/AppContext.tsx";
import { MdAdd, MdClose, MdEdit } from "react-icons/md";

export default function TaggedResourcesPage() {
  const { tag: tagName } = useParams();

  const { t } = useTranslation();

  const [tag, setTag] = useState<Tag | null>(null);

  useEffect(() => {
    document.title = t("Tag: ") + tagName;
  }, [t, tagName]);

  useEffect(() => {
    if (!tagName) {
      return;
    }
    network.getTagByName(tagName).then((res) => {
      if (res.success) {
        setTag(res.data!);
      }
    });
  }, [tagName]);

  if (!tagName) {
    return (
      <div className={"m-4"}>
        <ErrorAlert message={t("Tag not found")} />
      </div>
    );
  }

  return (
    <div>
      <div className={"flex items-center px-4"}>
        <h1 className={"text-2xl pt-6 pb-2 font-bold flex-1"}>
          {tag?.name ?? tagName}
        </h1>
        {tag && app.canUpload() && (
          <EditTagButton
            tag={tag}
            onEdited={(t) => {
              setTag(t);
            }}
          />
        )}
      </div>
      {tag?.type && (
        <h2 className={"text-base-content/60 ml-2 text-lg pl-2 mb-2"}>
          {tag.type}
        </h2>
      )}
      <div className={"px-3"}>
        {(tag?.aliases ?? []).map((e) => {
          return <Badge className={"m-1 badge-primary badge-soft"}>{e}</Badge>;
        })}
        {app.canUpload() && tag && (
          <EditAliasDialog tag={tag} onEdited={setTag} />
        )}
      </div>
      {tag?.description && (
        <article className={"px-4 py-2"}>
          <Markdown>{tag.description}</Markdown>
        </article>
      )}
      <ResourcesView
        key={tag?.name ?? tagName}
        storageKey={`tagged-${tag?.name ?? tagName}`}
        loader={(page) => {
          return network.getResourcesByTag(tagName, page);
        }}
      ></ResourcesView>
    </div>
  );
}

function EditTagButton({
  tag,
  onEdited,
}: {
  tag: Tag;
  onEdited: (t: Tag) => void;
}) {
  const [description, setDescription] = useState(tag.description);
  const [isAlias, setIsAlias] = useState(false);
  const [aliasOf, setAliasOf] = useState<Tag | null>(null);
  const [type, setType] = useState(tag.type);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const context = useAppContext();

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
      if (aliasOf) {
        context.clear();
      }
      onEdited(res.data!);
    } else {
      setError(res.message || t("Unknown error"));
    }
  };

  return (
    <>
      <Button
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
      </Button>
      <dialog id="edit_tag_dialog" className="modal">
        <div
          className="modal-box"
          style={{
            overflowY: "initial",
          }}
        >
          <h3 className="font-bold text-lg">{t("Edit Tag")}</h3>
          <div className={"flex py-3"}>
            <p className={"flex-1"}>The tag is an alias of another tag</p>
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
                <div
                  className={
                    "py-2 border border-base-300 rounded-3xl mt-2 px-4 flex mb-4"
                  }
                >
                  <p className={"flex-1"}>Alias Of: </p>
                  <Badge>{aliasOf.name}</Badge>
                </div>
              )}
              <TagInput
                mainTag={true}
                onAdd={(tag: Tag) => {
                  setAliasOf(tag);
                }}
              />
            </>
          ) : (
            <>
              <Input
                value={type}
                onChange={(e) => setType(e.target.value)}
                label={"Type"}
              />
              <TextArea
                label={"Description"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </>
          )}

          {error && <ErrorAlert className={"mt-2"} message={error} />}
          <div className="modal-action">
            <form method="dialog">
              <Button className="btn">{t("Close")}</Button>
            </form>
            <Button
              isLoading={isLoading}
              className={"btn-primary"}
              onClick={submit}
            >
              {t("Save")}
            </Button>
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
  const { t } = useTranslation();
  const [alias, setAlias] = useState<string[]>(() => {
    return tag.aliases ?? [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

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
        className={
          "m-1 badge-accent badge-soft cursor-pointer hover:shadow-sm transition-shadow"
        }
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
            {alias.map((e) => {
              return (
                <Badge className={"m-1 badge-primary badge-soft"}>
                  <span className={"text-sm pt-0.5"}>{e}</span>
                  <span
                    className={
                      "inline-flex items-center justify-center cursor-pointer hover:bg-base-300 transition-colors rounded-full h-5 w-5"
                    }
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
          <div className={"flex"}>
            <input
              className={"input flex-1"}
              value={content}
              onInput={(e) => {
                setContent(e.currentTarget.value);
              }}
            />
            <span className={"w-4"}></span>
            <Button
              className={"btn-circle"}
              onClick={() => {
                if (content.trim() === "") {
                  return;
                }
                setAlias((prev) => [...prev, content.trim()]);
                setContent("");
              }}
            >
              <MdAdd size={20} />
            </Button>
          </div>
          {error && <ErrorAlert className={"mt-2"} message={error} />}
          <div className="modal-action">
            <form method="dialog">
              <Button className="btn btn-ghost">{t("Close")}</Button>
            </form>
            <Button
              onClick={submit}
              isLoading={isLoading}
              className={"btn-primary"}
            >
              {t("Submit")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
