import { useParams } from "react-router";
import { ErrorAlert } from "../components/alert.tsx";
import ResourcesView from "../components/resources_view.tsx";
import { network } from "../network/network.ts";
import {useEffect, useState} from "react";
import { useTranslation } from "react-i18next";
import {Tag} from "../network/models.ts";
import Button from "../components/button.tsx";
import Markdown from "react-markdown";
import {app} from "../app.ts";

export default function TaggedResourcesPage() {
  const { tag: tagName } = useParams()

  const { t } = useTranslation();

  const [tag, setTag] = useState<Tag | null>(null);

  useEffect(() => {
    document.title = t("Tag: ") + tagName;
  }, [t, tagName])

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
    return <div className={"m-4"}>
      <ErrorAlert message={t("Tag not found")} />
    </div>
  }

  return <div>
    <div className={"flex items-center"}>
      <h1 className={"text-2xl pt-6 pb-2 px-4 font-bold flex-1"}>
        {tagName}
      </h1>
      {
        tag && <EditTagButton tag={tag} onEdited={(t) => {
          setTag(t)
        }} />
      }
    </div>
    {
      (tag?.description && app.canUpload()) && <article className={"px-4 py-2"}>
        <Markdown>
          {tag.description}
        </Markdown>
      </article>
    }
    <ResourcesView loader={(page) => {
      return network.getResourcesByTag(tagName, page)
    }}></ResourcesView>
  </div>
}

function EditTagButton({tag, onEdited}: { tag: Tag, onEdited: (t: Tag) => void }) {
  const [description, setDescription] = useState(tag.description);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setDescription(tag.description)
  }, [tag.description]);

  const submit = async () => {
    if (description === tag.description) {
      return;
    }
    if (description && description.length > 256) {
      setError(t("Description is too long"));
      return;
    }
    setIsLoading(true);
    setError(null);
    const res = await network.setTagDescription(tag.id, description);
    setIsLoading(false);
    if (res.success) {
      const dialog = document.getElementById("edit_tag_dialog") as HTMLDialogElement;
      dialog.close();
      onEdited(res.data!);
    } else {
      setError(res.message || t("Unknown error"));
    }
  };

  return <>
    <Button onClick={()=> {
    const dialog = document.getElementById("edit_tag_dialog") as HTMLDialogElement;
    dialog.showModal();
    }}>{t("Edit")}</Button>
    <dialog id="edit_tag_dialog" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{t("Edit Tag")}</h3>
        <p className="py-2 text-sm">{t("Set the description of the tag.")}</p>
        <p className="pb-3 text-sm">{t("Use markdown format.")}</p>
        <textarea className="textarea h-24 w-full resize-none" value={description} onChange={(e) => setDescription(e.target.value)}/>
        {error && <ErrorAlert className={"mt-2"} message={error} />}
        <div className="modal-action">
          <form method="dialog">
            <Button className="btn">{t("Close")}</Button>
          </form>
          <Button isLoading={isLoading} className={"btn-primary"} onClick={submit}>
            {t("Save")}
          </Button>
        </div>
      </div>
    </dialog>
  </>
}
