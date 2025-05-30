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
import Input, {TextArea} from "../components/input.tsx";
import TagInput from "../components/tag_input.tsx";
import Badge from "../components/badge.tsx";

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
        {tag?.name ?? tagName}
      </h1>
      {
        (tag && app.canUpload()) && <EditTagButton tag={tag} onEdited={(t) => {
          setTag(t)
        }} />
      }
    </div>
    {tag?.type && <h2 className={"text-base-content/60 ml-2 text-lg pl-2 mb-2"}>{tag.type}</h2>}
    <div className={"px-3"}>
      {
        (tag?.aliases ?? []).map((e) => {
          return <Badge className={"m-1 badge-primary badge-soft"}>{e}</Badge>
        })
      }
    </div>
    {
      tag?.description && <article className={"px-4 py-2"}>
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
  const [isAlias, setIsAlias] = useState(false);
  const [aliasOf, setAliasOf] = useState<Tag | null>(null);
  const [type, setType] = useState(tag.type);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setDescription(tag.description)
  }, [tag.description]);

  const submit = async () => {
    if (description && description.length > 256) {
      setError(t("Description is too long"));
      return;
    }
    setIsLoading(true);
    setError(null);
    const res = await network.setTagInfo(tag.id, description, aliasOf?.id ?? null, type);
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
      <div className="modal-box" style={{
        overflowY: "initial"
      }}>
        <h3 className="font-bold text-lg">{t("Edit Tag")}</h3>
        <div className={"flex py-3"}>
          <p className={"flex-1"}>The tag is an alias of another tag</p>
          <input type="checkbox" className="toggle toggle-primary" checked={isAlias} onChange={(e) => {
            setIsAlias(e.target.checked);
          }}/>
        </div>

        {
          isAlias ? <>
              {
                aliasOf && <div className={"py-2 border border-base-300 rounded-3xl mt-2 px-4 flex mb-4"}>
                  <p className={"flex-1"}>Alias Of: </p>
                  <Badge>{aliasOf.name}</Badge>
                </div>
              }
            <TagInput mainTag={true} onAdd={(tag: Tag) => {
              setAliasOf(tag);
            }}/>
          </> : <>
            <Input value={type} onChange={(e) => setType(e.target.value)} label={"Type"}/>
            <TextArea label={"Description"} value={description} onChange={(e) => setDescription(e.target.value)}/>
          </>
        }

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
