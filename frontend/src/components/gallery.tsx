import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MdOutlineChevronLeft,
  MdOutlineChevronRight,
  MdOutlineClose,
} from "react-icons/md";
import { network } from "../network/network.ts";
import Badge from "./badge.tsx";

export default function Gallery({
  images,
  nsfw,
}: {
  images: number[];
  nsfw: number[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 方向：1=向右，-1=向左
  const [isHovered, setIsHovered] = useState(false);
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  // 预加载下一张图片
  useEffect(() => {
    if (!images || images.length <= 1) return;

    const nextIndex = (currentIndex + 1) % images.length;
    const nextImageUrl = network.getImageUrl(images[nextIndex]);

    const img = new Image();
    img.src = nextImageUrl;
  }, [currentIndex, images]);

  if (!images || images.length === 0) {
    return <></>;
  }

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToIndex = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  if (nsfw == null) {
    nsfw = [];
  }

  // 如果图片数量超过8张，显示数字而不是圆点
  const showDots = images.length <= 8;

  return (
    <>
      <GalleryFullscreen
        dialogRef={dialogRef}
        images={images}
        nsfw={nsfw}
        currentIndex={currentIndex}
        direction={direction}
        goToPrevious={goToPrevious}
        goToNext={goToNext}
        setDirection={setDirection}
        setCurrentIndex={setCurrentIndex}
      />
      <div
        className="relative w-full overflow-hidden rounded-xl bg-base-100-tr82 shadow-sm"
        style={{ aspectRatio: "16/9" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 图片区域 */}
        <div
          ref={containerRef}
          className="w-full h-full relative"
          onClick={() => {
            dialogRef.current?.showModal();
          }}
        >
          {width > 0 && (
            <AnimatePresence initial={false} custom={direction} mode="sync">
              <motion.div
                key={currentIndex}
                className="absolute inset-0 w-full h-full"
                variants={{
                  enter: (dir: number) => ({
                    x: dir > 0 ? width : -width,
                  }),
                  center: {
                    x: 0,
                    transition: { duration: 0.3, ease: "linear" },
                  },
                  exit: (dir: number) => ({
                    x: dir > 0 ? -width : width,
                    transition: { duration: 0.3, ease: "linear" },
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                custom={direction}
              >
                <GalleryImage
                  src={network.getImageUrl(images[currentIndex])}
                  nfsw={nsfw.includes(images[currentIndex])}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* 左右按钮 */}
        {images.length > 1 && (
          <>
            <button
              className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity hover:cursor-pointer ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              onClick={goToPrevious}
            >
              <MdOutlineChevronLeft size={28} />
            </button>
            <button
              className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity hover:cursor-pointer ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              onClick={goToNext}
            >
              <MdOutlineChevronRight size={28} />
            </button>
          </>
        )}

        {/* 底部指示器 */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            {showDots ? (
              /* 圆点指示器 */
              <div className="flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? "bg-primary w-4"
                        : "bg-base-content/30 hover:bg-base-content/50"
                    }`}
                    onClick={() => goToIndex(index)}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            ) : (
              /* 数字指示器 */
              <div className="bg-base-100/20 px-2 py-1 rounded-full text-xs">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function GalleryFullscreen({
  dialogRef,
  images,
  nsfw,
  currentIndex,
  direction,
  goToPrevious,
  goToNext,
  setDirection,
  setCurrentIndex,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  images: number[];
  nsfw: number[];
  currentIndex: number;
  direction: number;
  goToPrevious: () => void;
  goToNext: () => void;
  setDirection: (direction: number) => void;
  setCurrentIndex: (index: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(true);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        console.log(containerRef.current.clientWidth);
        setWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = () => {
      setIsHovered(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 2000);
    };

    if (dialogRef.current?.open) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("touchstart", handleMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [dialogRef.current?.open, setIsHovered]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialogRef.current?.open) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goToPrevious();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          goToNext();
        } else if (e.key === "Escape") {
          dialogRef.current?.close();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogRef, goToPrevious, goToNext]);

  useEffect(() => {
    if (thumbnailContainerRef.current && dialogRef.current?.open) {
      const thumbnail = thumbnailContainerRef.current.children[currentIndex] as HTMLElement;
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentIndex, dialogRef]);

  return (
    <dialog
      ref={dialogRef}
      onClick={() => {
        dialogRef.current?.close();
      }}
      className="modal"
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={containerRef}
        className="modal-box w-full h-full max-h-screen max-w-screen p-4 bg-transparent shadow-none relative overflow-clip"
      >
        {width > 0 && (
          <AnimatePresence initial={false} custom={direction} mode="sync">
            <motion.div
              key={`fullscreen-${currentIndex}`}
              className="absolute inset-0 w-full h-full"
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? width : -width,
                }),
                center: {
                  x: 0,
                  transition: { duration: 0.3, ease: "linear" },
                },
                exit: (dir: number) => ({
                  x: dir > 0 ? -width : width,
                  transition: { duration: 0.3, ease: "linear" },
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
            >
              <img
                src={network.getImageUrl(images[currentIndex])}
                alt=""
                className="w-full h-full object-contain rounded-xl select-none"
              />
            </motion.div>
          </AnimatePresence>
        )}

        {/* 全屏模式下的左右切换按钮 */}
        {images.length > 1 && (
          <>
            <button
              className={`absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer hover:bg-base-100/60 rounded-full p-2 transition-colors focus:border-none focus:outline-none`}
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <MdOutlineChevronLeft size={24} />
            </button>
            <button
              className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer hover:bg-base-100/60 rounded-full p-2 transition-colors focus:border-none focus:outline-none`}
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <MdOutlineChevronRight size={24} />
            </button>

            {/* 图片缩略图列表 */}
            <div
              className={`absolute bottom-4 left-1/2 -translate-x-1/2 transition-opacity ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                ref={thumbnailContainerRef}
                className="flex gap-2 overflow-x-auto max-w-[80vw] px-2 py-2 bg-base-100/60 rounded-xl scrollbar-thin scrollbar-thumb-base-content/30 scrollbar-track-transparent"
              >
                {images.map((imageId, index) => (
                  <button
                    key={index}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                      index === currentIndex
                        ? "ring-2 ring-primary scale-110 "
                        : `${nsfw.includes(imageId) ? "blur-sm hover:blur-none" : "opacity-60 hover:opacity-100"}`
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newDirection = index > currentIndex ? 1 : -1;
                      setDirection(newDirection);
                      setCurrentIndex(index);
                    }}
                  >
                    <img
                      src={network.getResampledImageUrl(imageId)}
                      alt={`Thumbnail ${index + 1}`}
                      className={`w-full h-full object-cover select-none`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 关闭按钮 */}
            <button
              className={`absolute top-4 right-4 cursor-pointer hover:bg-base-100/60 rounded-full p-2 transition-colors`}
              onClick={(e) => {
                e.stopPropagation();
                dialogRef.current?.close();
              }}
            >
              <MdOutlineClose size={24} />
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}

function GalleryImage({ src, nfsw }: { src: string; nfsw: boolean }) {
  const [show, setShow] = useState(!nfsw);

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt=""
        className={`w-full h-full object-contain transition-all duration-300 ${!show ? "blur-xl" : ""}`}
      />
      {!show && (
        <>
          <div
            className="absolute inset-0 bg-base-content/20 cursor-pointer"
            onClick={(event) => {
              setShow(true);
              event.stopPropagation();
            }}
          />
          <div className="absolute top-4 left-4">
            <Badge className="badge-error shadow-lg">NSFW</Badge>
          </div>
        </>
      )}
    </div>
  );
}
