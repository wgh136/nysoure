import React from "react";
import { createRoot } from "react-dom/client";

export default function showPopup(
  content: React.ReactNode,
  element: HTMLElement,
) {
  const eRect = element.getBoundingClientRect();

  const div = document.createElement("div");
  div.style.position = "fixed";
  if (window.innerWidth > 400) {
    if (eRect.x > window.innerWidth / 2) {
      div.style.right = `${window.innerWidth - eRect.x}px`;
    } else {
      div.style.left = `${eRect.x}px`;
    }
  } else {
    if (eRect.x > window.innerWidth / 2) {
      div.style.right = `8px`;
    } else {
      div.style.left = `8px`;
    }
  }
  if (eRect.y > window.innerHeight / 2) {
    div.style.bottom = `${window.innerHeight - eRect.y}px`;
  } else {
    div.style.top = `${eRect.y}px`;
  }

  div.style.zIndex = "9999";
  div.className = "animate-appearance-in";

  document.body.appendChild(div);

  const mask = document.createElement("div");

  const close = () => {
    document.body.removeChild(div);
    document.body.removeChild(mask);
  };

  mask.style.position = "fixed";
  mask.style.top = "0";
  mask.style.left = "0";
  mask.style.width = "100%";
  mask.style.height = "100%";
  mask.style.zIndex = "9998";
  mask.onclick = close;
  document.body.appendChild(mask);

  createRoot(div).render(
    <context.Provider value={close}>
      {content}
    </context.Provider>,
  );
}

const context = React.createContext<() => void>(() => {});

export function useClosePopup() {
  return React.useContext(context);
}

export function PopupMenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  const close = useClosePopup();
  return (
    <li
      onClick={() => {
        close();
        onClick();
      }}
    >
      {children}
    </li>
  );
}
