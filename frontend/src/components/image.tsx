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
