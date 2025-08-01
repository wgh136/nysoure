import { useTranslation } from "../utils/i18n";

export default function Loading() {
  const { t } = useTranslation();

  return (
    <div className={"flex justify-center py-4"}>
      <span className="loading loading-spinner progress-primary loading-lg mr-2"></span>
      <span>{t("Loading")}</span>
    </div>
  );
}
