import { MdAdd } from "react-icons/md";
import { useTranslation } from "../hook/i18n";
import { network } from "../network/network";
import showToast from "./toast";
import { useState } from "react";

async function uploadImages(files: File[]): Promise<number[]> {
  const images: number[] = [];

  for (const file of files) {
    const res = await network.uploadImage(file);
    if (res.success) {
      images.push(res.data!);
    } else {
      showToast({
        type: "error",
        message: `Failed to upload image: ${res.message}`,
      });
    }
  }

  return images;
}

export function SelectAndUploadImageButton({
  onUploaded,
}: {
  onUploaded: (image: number[]) => void;
}) {
  const [isUploading, setUploading] = useState(false);

  const { t } = useTranslation();

  const addImage = () => {
    if (isUploading) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) {
        return;
      }
      setUploading(true);
      const files = Array.from(input.files);
      const uploadedImages = await uploadImages(files);
      setUploading(false);
      if (uploadedImages.length > 0) {
        onUploaded(uploadedImages);
      }
    };
    input.click();
  };

  return (
    <button className={"btn my-2"} type={"button"} onClick={addImage}>
      {isUploading ? (
        <span className="loading loading-spinner"></span>
      ) : (
        <MdAdd />
      )}
      {t("Upload Image")}
    </button>
  );
}

export function UploadClipboardImageButton({
  onUploaded,
}: {
  onUploaded: (image: number[]) => void;
}) {
  const [isUploading, setUploading] = useState(false);

  const { t } = useTranslation();

  const addClipboardImage = async () => {
    if (isUploading) {
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of clipboardItems) {
        console.log(item);
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            files.push(
              new File([blob], `clipboard-image.${type.split("/")[1]}`, {
                type,
              }),
            );
          }
        }
      }
      if (files.length > 0) {
        setUploading(true);
        const uploadedImages = await uploadImages(files);
        setUploading(false);
        if (uploadedImages.length > 0) {
          onUploaded(uploadedImages);
        }
      } else {
        showToast({
          type: "error",
          message: t("No image found in clipboard"),
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        message: t("Failed to read clipboard image"),
      });
    }
  };

  return (
    <button className={"btn my-2"} type={"button"} onClick={addClipboardImage}>
      {isUploading ? (
        <span className="loading loading-spinner"></span>
      ) : (
        <MdAdd />
      )}
      {t("Upload Clipboard Image")}
    </button>
  );
}

export function ImageDropArea({
  children,
  onUploaded,
}: {
  children: React.ReactNode;
  onUploaded: (image: number[]) => void;
}) {
  const [isUploading, setUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUploading) {
      return;
    }

    if (e.dataTransfer.files.length > 0) {
      setUploading(true);
      let files = Array.from(e.dataTransfer.files);
      files = files.filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) {
        setUploading(false);
        return;
      }
      const uploadedImages = await uploadImages(files);
      if (uploadedImages.length > 0) {
        onUploaded(uploadedImages);
      }
      setUploading(false);
    }
  };

  return (
    <>
      <dialog id="uploading_image_dialog" className="modal" open={isUploading}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Uploading Image</h3>
          <div className={"flex items-center justify-center w-full h-40"}>
            <span className="loading loading-spinner progress-primary loading-lg mr-2"></span>
          </div>
        </div>
      </dialog>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {children}
      </div>
    </>
  );
}
