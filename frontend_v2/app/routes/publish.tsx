import type { Route } from "./+types/publish";
import { useState } from "react";
import { network } from "../network/network";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "../hook/i18n";
import { ErrorAlert } from "../components/alert";
import ResourceForm, { type ResourceFormData } from "../components/resource_form";
import { configFromMatches, useConfig, canUpload } from "../hook/config";
import type { VndbResourcePrefill } from "../network/models";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: `Publish Resource - ${config.server_name}` },
    { name: "description", content: config.site_description },
  ];
}

function emptyResourceFormData(): ResourceFormData {
  return {
    title: "",
    altTitles: [],
    releaseDate: undefined,
    tags: [],
    article: "",
    images: [],
    coverId: undefined,
    links: [],
    galleryImages: [],
    galleryNsfw: [],
    characters: [],
  };
}

function getInitialData(): ResourceFormData {
  const oldData = (typeof localStorage !== "undefined") && localStorage.getItem("publish_data");
  if (oldData) {
    try {
      const data = JSON.parse(oldData);
      return {
        title: data.title || "",
        altTitles: data.alternative_titles || [],
        releaseDate: data.release_date || undefined,
        tags: data.tags || [],
        article: data.article || "",
        images: data.images || [],
        coverId: data.cover_id || undefined,
        links: data.links || [],
        galleryImages: data.gallery || [],
        galleryNsfw: data.gallery_nsfw || [],
        characters: data.characters || [],
      };
    } catch (e) {
      console.error("Failed to parse publish_data from localStorage", e);
    }
  }
  return emptyResourceFormData();
}

function formDataFromVndbPrefill(data: VndbResourcePrefill): ResourceFormData {
  return {
    title: data.title || "",
    altTitles: data.alternative_titles || [],
    releaseDate: data.release_date || undefined,
    tags: data.tags || [],
    article: data.article || "",
    images: data.images || [],
    coverId: data.cover_id || undefined,
    links: data.links || [],
    galleryImages: data.gallery || [],
    galleryNsfw: data.gallery_nsfw || [],
    characters: data.characters || [],
  };
}

export default function Publish() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = useConfig();
  const [initialData, setInitialData] = useState<ResourceFormData>(() => getInitialData());
  const [formKey, setFormKey] = useState(0);
  const [vnID, setVNID] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setImporting] = useState(false);
  const isVNDBMode = searchParams.get("source") === "vndb";

  const handleSubmit = async (data: ResourceFormData) => {
    const res = await network.createResource({
      title: data.title,
      alternative_titles: data.altTitles,
      release_date: data.releaseDate,
      tags: data.tags.map((tag) => tag.id),
      article: data.article,
      images: data.images,
      cover_id: data.coverId,
      links: data.links,
      gallery: data.galleryImages,
      gallery_nsfw: data.galleryNsfw,
      characters: data.characters,
    });
    if (res.success) {
      navigate("/resources/" + res.data!, { replace: true });
    } else {
      throw new Error(res.message);
    }
  };

  const handleImportFromVNDB = async () => {
    if (!/^v\d+$/.test(vnID)) {
      setImportError(t("Invalid VNDB ID format"));
      return;
    }

    setImportError(null);
    setImporting(true);
    const res = await network.getResourcePrefillFromVNDB(vnID);
    setImporting(false);

    if (!res.success || !res.data) {
      setImportError(res.message || t("Failed to fetch resource params from VNDB"));
      return;
    }

    setInitialData(formDataFromVndbPrefill(res.data));
    setFormKey((prev) => prev + 1);
  };

  if (!config.isLoggedIn || !config.user) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not logged in. Please log in to access this page.")}
      />
    );
  }

  if (!config.allow_normal_user_upload && !canUpload(config)) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not authorized to access this page.")}
      />
    );
  }

  return (
    <>
      {isVNDBMode && (
        <div className="p-4 bg-base-100/80 backdrop-blur-sm rounded-box mt-4 shadow mb-4">
          <h2 className="text-lg font-bold">{t("Import Resource from VNDB")}</h2>
          <p className="mt-2 text-sm opacity-80">
            {t("Fill the form automatically from VNDB, then continue editing before publishing.")}
          </p>
          <div className="flex flex-col gap-2 mt-4 md:flex-row">
            <input
              type="text"
              className="input flex-1"
              placeholder="v12345"
              value={vnID}
              onChange={(e) => setVNID(e.target.value.trim())}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImportFromVNDB}
              disabled={isImporting}
            >
              {isImporting && <span className="loading loading-spinner loading-sm"></span>}
              <span>{t("Import from VNDB")}</span>
            </button>
          </div>
          {importError && (
            <ErrorAlert
              className="mt-3"
              message={importError}
            />
          )}
        </div>
      )}
      <ResourceForm
        key={formKey}
        initialData={initialData}
        onSubmit={handleSubmit}
        submitButtonText={t("Publish")}
        title={t("Publish Resource")}
        storageKey="publish_data"
      />
    </>
  );
}
