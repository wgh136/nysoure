import { Image } from "../network/models.ts";
import { network } from "../network/network.ts";

export function SquareImage({ image }: { image: Image }) {
  let cover = false;
  const imgAspectRatio = image.width / image.height;
  if (imgAspectRatio > 0.8 && imgAspectRatio < 1.2) {
    cover = true;
  }

  return (
    <>
      <div
        className="aspect-square bg-base-200 rounded-lg cursor-pointer"
        onClick={() => {
          const dialog = document.getElementById(
            `image-dialog-${image.id}`,
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <img
          src={network.getImageUrl(image.id)}
          alt={"image"}
          className={`w-full h-full rounded-lg ${cover ? "object-cover" : "object-contain"}`}
        />
      </div>
      <dialog id={`image-dialog-${image.id}`} className="modal">
        <div
          className={"w-screen h-screen flex items-center justify-center"}
          onClick={() => {
            const dialog = document.getElementById(
              `image-dialog-${image.id}`,
            ) as HTMLDialogElement;
            dialog.close();
          }}
        >
          <img
            src={network.getImageUrl(image.id)}
            alt={"image"}
            className={`object-contain max-w-screen max-h-screen modal-box`}
            style={{
              padding: 0,
              margin: 0,
              backgroundColor: "transparent",
              boxShadow: "none",
            }}
          />
        </div>
      </dialog>
    </>
  );
}

export function VerticalImage({ image }: { image: Image }) {
  let cover = false;
  const imgAspectRatio = image.width / image.height;
  if (imgAspectRatio < 0.8 && imgAspectRatio > 0.5) {
    cover = true;
  }

  return (
    <>
      <div
        className="w-full bg-base-200 rounded-lg cursor-pointer aspect-[9/16]"
        onClick={() => {
          const dialog = document.getElementById(
            `image-dialog-${image.id}`,
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <img
          src={network.getImageUrl(image.id)}
          alt={"image"}
          className={`w-full h-full rounded-lg ${cover ? "object-cover" : "object-contain"}`}
        />
      </div>
      <dialog id={`image-dialog-${image.id}`} className="modal">
        <div
          className={"w-screen h-screen flex items-center justify-center"}
          onClick={() => {
            const dialog = document.getElementById(
              `image-dialog-${image.id}`,
            ) as HTMLDialogElement;
            dialog.close();
          }}
        >
          <img
            src={network.getImageUrl(image.id)}
            alt={"image"}
            className={`object-contain max-w-screen max-h-screen modal-box`}
            style={{
              padding: 0,
              margin: 0,
              backgroundColor: "transparent",
              boxShadow: "none",
            }}
          />
        </div>
      </dialog>
    </>
  );
}

export function HorizontalImage({ image }: { image: Image }) {
  let cover = false;
  const imgAspectRatio = image.width / image.height;
  if (imgAspectRatio > 1.2 && imgAspectRatio < 2) {
    cover = true;
  }

  return (
    <>
      <div
        className="w-full aspect-video bg-base-200 rounded-lg cursor-pointer"
        onClick={() => {
          const dialog = document.getElementById(
            `image-dialog-${image.id}`,
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <img
          src={network.getImageUrl(image.id)}
          alt={"image"}
          className={`w-full h-full rounded-lg ${cover ? "object-cover" : "object-contain"}`}
        />
      </div>
      <dialog id={`image-dialog-${image.id}`} className="modal">
        <div
          className={"w-screen h-screen flex items-center justify-center"}
          onClick={() => {
            const dialog = document.getElementById(
              `image-dialog-${image.id}`,
            ) as HTMLDialogElement;
            dialog.close();
          }}
        >
          <img
            src={network.getImageUrl(image.id)}
            alt={"image"}
            className={`object-contain max-w-screen max-h-screen modal-box`}
            style={{
              padding: 0,
              margin: 0,
              backgroundColor: "transparent",
              boxShadow: "none",
            }}
          />
        </div>
      </dialog>
    </>
  );
}

export function ImageGrid({ images }: { images: Image[] }) {
  let verticalCount = 0;
  let horizontalCount = 0;
  for (const image of images) {
    const imgAspectRatio = image.width / image.height;
    if (imgAspectRatio < 0.8) {
      verticalCount++;
    } else if (imgAspectRatio > 1.2) {
      horizontalCount++;
    }
  }

  if (verticalCount / images.length > 0.5) {
    return (
      <div
        className={
          "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2 px-1 py-2"
        }
      >
        {images.map((image) => (
          <VerticalImage key={image.id} image={image} />
        ))}
      </div>
    );
  } else if (horizontalCount / images.length > 0.5) {
    return (
      <div
        className={
          "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 px-1 py-2"
        }
      >
        {images.map((image) => (
          <HorizontalImage key={image.id} image={image} />
        ))}
      </div>
    );
  } else {
    return (
      <div
        className={
          "grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 px-1 py-2"
        }
      >
        {images.map((image) => (
          <SquareImage key={image.id} image={image} />
        ))}
      </div>
    );
  }
}
