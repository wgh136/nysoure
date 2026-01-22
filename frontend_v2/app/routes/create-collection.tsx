import type { Route } from "./+types/create-collection";
import { useState } from "react";
import { useTranslation } from "../hook/i18n";
import { MdOutlineImage, MdOutlineInfo } from "react-icons/md";
import showToast from "../components/toast";
import { network } from "../network/network";
import { useNavigate } from "react-router";
import { configFromMatches } from "../hook/config";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: `Create Collection - ${config.server_name}` },
    { name: "description", content: "Create a new collection" },
  ];
}

export default function CreateCollectionPage() {
  const [title, setTitle] = useState<string>("");
  const [article, setArticle] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [isLoading, setLoading] = useState(false);
  const [isUploadingimage, setUploadingImage] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleAddImage = () => {
    if (isUploadingimage) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].size > 8 * 1024 * 1024) {
            showToast({
              message: t("Image size exceeds 5MB limit"),
              type: "error",
            });
            return;
          }
        }
        setUploadingImage(true);
        const imageIds: number[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const res = await network.uploadImage(file);
          if (res.success) {
            imageIds.push(res.data!);
          } else {
            showToast({ message: res.message, type: "error" });
            setUploadingImage(false);
            return;
          }
        }
        if (imageIds.length > 0) {
          setArticle((prev) => {
            return (
              prev +
              "\n" +
              imageIds.map((id) => `![Image](/api/image/${id})`).join(" ")
            );
          });
        }
        setUploadingImage(false);
      }
    };
    input.click();
  };

  const createCollection = async () => {
    if (isLoading) {
      return;
    }
    if (title.trim() === "" || article.trim() === "") {
      showToast({
        message: t("Title and description cannot be empty"),
        type: "error",
      });
      return;
    }
    setLoading(true);
    const res = await network.createCollection(title, article, isPublic);
    if (res.success) {
      showToast({
        message: t("Collection created successfully"),
        type: "success",
      });
      navigate(`/collection/${res.data?.id}`, { replace: true });
    } else {
      showToast({ message: res.message, type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="bg-base-100-tr82 shadow m-4 p-4 rounded-lg">
      <h1 className="text-xl font-bold">{t("Create Collection")}</h1>
      <div className="mt-4">
        <label className="block">{t("Title")}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input mt-1 w-full"
        />
        <label className="mt-8 flex items-center">
          {t("Description")}
          <span className="w-2"></span>
          <div className="badge badge-info badge-soft badge-sm">
            <MdOutlineInfo className="inline-block" size={16} />
            <span className="text-sm">Markdown</span>
          </div>
        </label>
        <textarea
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          className="textarea mt-1 w-full min-h-80"
        />
        <div className="mt-4 mx-1">
          <label className="flex items-center py-2">
            <input
              type="checkbox"
              checked={!isPublic}
              onChange={(e) => setIsPublic(!e.target.checked)}
              className="checkbox mr-2 checkbox-primary"
            />
            {t("Private")}
          </label>
        </div>
      </div>
      <div className={"flex items-center mt-4"}>
        <button
          className={"btn btn-sm btn-circle mr-2"}
          onClick={handleAddImage}
        >
          {isUploadingimage ? (
            <span className={"loading loading-spinner loading-sm"}></span>
          ) : (
            <MdOutlineImage size={18} />
          )}
        </button>
        <span className={"grow"} />
        <button
          onClick={createCollection}
          className={`btn btn-primary h-8 text-sm mx-2 ${article === "" && "btn-disabled"}`}
        >
          {isLoading ? (
            <span className={"loading loading-spinner loading-sm"}></span>
          ) : null}
          {t("Submit")}
        </button>
      </div>
    </div>
  );
}
