import React from "react";
import { createRoot } from "react-dom/client";
import { i18nContext } from "../utils/i18n";
import { i18nData } from "../i18n.ts";

export default function showPopup(
  content: React.ReactNode,
  element: HTMLElement,
) {
  const eRect = element.getBoundingClientRect();

  const div = document.createElement("div");
  div.style.position = "fixed";
  if (eRect.x > window.innerWidth / 2) {
    div.style.right = `${window.innerWidth - eRect.x}px`;
  } else {
    div.style.left = `${eRect.x}px`;
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
    console.log("close popup");
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
      <i18nContext.Provider value={i18nData}>{content}</i18nContext.Provider>
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
