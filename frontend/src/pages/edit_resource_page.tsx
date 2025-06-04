import { useEffect, useState } from "react";
import { MdAdd, MdClose, MdDelete, MdOutlineInfo } from "react-icons/md";
import { Tag } from "../network/models.ts";
import { network } from "../network/network.ts";
import { useNavigate, useParams } from "react-router";
import showToast from "../components/toast.ts";
import { useTranslation } from "react-i18next";
import { app } from "../app.ts";
import { ErrorAlert } from "../components/alert.tsx";
import Loading from "../components/loading.tsx";
import TagInput, { QuickAddTagDialog } from "../components/tag_input.tsx";
import {
  ImageDrapArea,
  SelectAndUploadImageButton,
  UploadClipboardImageButton,
} from "../components/image_selector.tsx";

export default function EditResourcePage() {
  const [title, setTitle] = useState<string>("");
  const [altTitles, setAltTitles] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [article, setArticle] = useState<string>("");
  const [images, setImages] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isLoading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("Edit Resource");
  }, [t]);

  const { rid } = useParams();
  const id = parseInt(rid || "");

  useEffect(() => {
    if (isNaN(id)) {
      return;
    }
    network.getResourceDetails(id).then((res) => {
      if (res.success) {
        const data = res.data!;
        setTitle(data.title);
        setAltTitles(data.alternativeTitles);
        setTags(data.tags);
        setArticle(data.article);
        setImages(data.images.map((i) => i.id));
        setLoading(false);
      } else {
        showToast({ message: t("Failed to load resource"), type: "error" });
      }
    });
  }, [id, t]);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    if (!title) {
      setError(t("Title cannot be empty"));
      return;
    }
    for (let i = 0; i < altTitles.length; i++) {
      if (!altTitles[i]) {
        setError(t("Alternative title cannot be empty"));
        return;
      }
    }
    if (!tags || tags.length === 0) {
      setError(t("At least one tag required"));
      return;
    }
    if (!article) {
      setError(t("Description cannot be empty"));
      return;
    }
    setSubmitting(true);
    const res = await network.editResource(id, {
      title: title,
      alternative_titles: altTitles,
      tags: tags.map((tag) => tag.id),
      article: article,
      images: images,
    });
    if (res.success) {
      setSubmitting(false);
      navigate("/resources/" + id.toString(), { replace: true });
    } else {
      setSubmitting(false);
      setError(res.message);
    }
  };

  if (isNaN(id)) {
    return <ErrorAlert className={"m-4"} message={t("Invalid resource ID")} />;
  }

  if (!app.user) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not logged in. Please log in to access this page.")}
      />
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <ImageDrapArea
      onUploaded={(images) => {
        setImages((prev) => [...prev, ...images]);
      }}
    >
      <div className={"p-4"}>
        <h1 className={"text-2xl font-bold my-4"}>{t("Edit Resource")}</h1>
        <div role="alert" className="alert alert-info mb-2 alert-dash">
          <MdOutlineInfo size={24} />
          <span>{t("All information can be modified after publishing")}</span>
        </div>
        <p className={"my-1"}>{t("Title")}</p>
        <input
          type="text"
          className="input w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={"h-4"}></div>
        <p className={"my-1"}>{t("Alternative Titles")}</p>
        {altTitles.map((title, index) => {
          return (
            <div key={index} className={"flex items-center my-2"}>
              <input
                type="text"
                className="input w-full"
                value={title}
                onChange={(e) => {
                  const newAltTitles = [...altTitles];
                  newAltTitles[index] = e.target.value;
                  setAltTitles(newAltTitles);
                }}
              />
              <button
                className={"btn btn-square btn-error ml-2"}
                type={"button"}
                onClick={() => {
                  const newAltTitles = [...altTitles];
                  newAltTitles.splice(index, 1);
                  setAltTitles(newAltTitles);
                }}
              >
                <MdDelete size={24} />
              </button>
            </div>
          );
        })}
        <button
          className={"btn my-2"}
          type={"button"}
          onClick={() => {
            setAltTitles([...altTitles, ""]);
          }}
        >
          <MdAdd />
          {t("Add Alternative Title")}
        </button>
        <div className={"h-2"}></div>
        <p className={"my-1"}>{t("Tags")}</p>
        <p className={"my-1 pb-1"}>
          {tags.map((tag, index) => {
            return (
              <span key={index} className={"badge badge-primary mr-2 text-sm"}>
                {tag.name}
                <span
                  onClick={() => {
                    const newTags = [...tags];
                    newTags.splice(index, 1);
                    setTags(newTags);
                  }}
                >
                  <MdClose size={18} />
                </span>
              </span>
            );
          })}
        </p>
        <div className={"flex items-center"}>
          <TagInput
            onAdd={(tag) => {
              setTags((prev) => {
                const existingTag = prev.find((t) => t.id === tag.id);
                if (existingTag) {
                  return prev; // If the tag already exists, do not add it again
                }
                return [...prev, tag];
              });
            }}
          />
          <span className={"w-4"} />
          <QuickAddTagDialog
            onAdded={(tags) => {
              setTags((prev) => {
                const newTags = [...prev];
                for (const tag of tags) {
                  const existingTag = newTags.find((t) => t.id === tag.id);
                  if (!existingTag) {
                    newTags.push(tag);
                  }
                }
                return newTags;
              });
            }}
          />
        </div>
        <div className={"h-4"}></div>
        <p className={"my-1"}>{t("Description")}</p>
        <textarea
          className="textarea w-full min-h-80 p-4"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
        />
        <div className={"flex items-center py-1 "}>
          <MdOutlineInfo className={"inline mr-1"} />
          <span className={"text-sm"}>{t("Use Markdown format")}</span>
        </div>
        <div className={"h-4"}></div>
        <p className={"my-1"}>{t("Images")}</p>
        <div role="alert" className="alert alert-info alert-soft my-2">
          <MdOutlineInfo size={24} />
          <div>
            <p>
              {t(
                "Images will not be displayed automatically, you need to reference them in the description",
              )}
            </p>
            <p>{t("The first image will be used as the cover image")}</p>
          </div>
        </div>
        <div
          className={`rounded-box border border-base-content/5 bg-base-100 ${images.length === 0 ? "hidden" : ""}`}
        >
          <table className={"table"}>
            <thead>
              <tr>
                <td>{t("Preview")}</td>
                <td>{t("Link")}</td>
                <td>{t("Action")}</td>
              </tr>
            </thead>
            <tbody>
              {images.map((image, index) => {
                return (
                  <tr key={index} className={"hover"}>
                    <td>
                      <img
                        src={network.getImageUrl(image)}
                        className={"w-16 h-16 object-cover card"}
                        alt={"image"}
                      />
                    </td>
                    <td>{network.getImageUrl(image)}</td>
                    <td>
                      <button
                        className={"btn btn-square"}
                        type={"button"}
                        onClick={() => {
                          const id = images[index];
                          const newImages = [...images];
                          newImages.splice(index, 1);
                          setImages(newImages);
                          network.deleteImage(id);
                        }}
                      >
                        <MdDelete size={24} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={"flex"}>
          <SelectAndUploadImageButton
            onUploaded={(images) => {
              setImages((prev) => [...prev, ...images]);
            }}
          />
          <span className={"w-4"}></span>
          <UploadClipboardImageButton
            onUploaded={(images) => {
              setImages((prev) => [...prev, ...images]);
            }}
          />
        </div>
        <div className={"h-4"}></div>
        {error && (
          <div role="alert" className="alert alert-error my-2 shadow">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {t("Error")}: {error}
            </span>
          </div>
        )}
        <div className={"flex flex-row-reverse mt-4"}>
          <button className={"btn btn-accent shadow"} onClick={handleSubmit}>
            {isSubmitting && <span className="loading loading-spinner"></span>}
            {t("Publish")}
          </button>
        </div>
      </div>
    </ImageDrapArea>
  );
}
