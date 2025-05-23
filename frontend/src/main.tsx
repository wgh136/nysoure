import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from "./app.tsx";
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import {i18nData} from "./i18n.ts";
import AppContext from "./components/AppContext.tsx";

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: i18nData,
    debug: true,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  }).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppContext>
        <App/>
      </AppContext>
    </StrictMode>,
  )
})
