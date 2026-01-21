import type { Route } from "./+types/publish";
import { useMemo } from "react";
import { network } from "../network/network";
import { useNavigate } from "react-router";
import { useTranslation } from "../hook/i18n";
import { ErrorAlert } from "../components/alert";
import ResourceForm, { type ResourceFormData } from "../components/resource_form";
import { configFromMatches, useConfig } from "../hook/config";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: `Publish Resource - ${config.server_name}` },
    { name: "description", content: config.site_description },
  ];
}

// Load from localStorage - only runs once
function getInitialData(): ResourceFormData {
  const oldData = localStorage.getItem("publish_data");
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

export default function Publish() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = useConfig();
  
  // Only load initial data once
  const initialData = useMemo(() => getInitialData(), []);

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

  if (!config.isLoggedIn || !config.user) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not logged in. Please log in to access this page.")}
      />
    );
  }

  if (!config.allow_normal_user_upload && !config.user.can_upload) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not authorized to access this page.")}
      />
    );
  }

  return (
    <ResourceForm
      initialData={initialData}
      onSubmit={handleSubmit}
      submitButtonText={t("Publish")}
      title={t("Publish Resource")}
      storageKey="publish_data"
    />
  );
}
