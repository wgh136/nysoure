import { useTranslation } from "~/hook/i18n";
import { useConfig } from "~/hook/config";
import { ErrorAlert, InfoAlert } from "~/components/alert";
import { useEffect, useState, useCallback } from "react";
import type { ServerConfig } from "~/network/models";
import Loading from "~/components/loading";
import Input, { TextArea } from "~/components/input";
import { network } from "~/network/network";
import showToast from "~/components/toast";
import Button from "~/components/button";

export default function ManageServerConfigPage() {
  const { t } = useTranslation();
  const userConfig = useConfig();
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [pinnedResources, setPinnedResources] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    network.getServerConfig().then((res) => {
      if (res.success) {
        setConfig(res.data!);
        setPinnedResources(res.data!.pinned_resources.join(","));
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) {
      return;
    }
    function isPositiveInteger(str: string) {
      return /^[1-9]\d*$/.test(str);
    }
    for (const e of pinnedResources.split(",")) {
      if (!isPositiveInteger(e)) {
        showToast({
          message: "Pinned resources must be a comma separated list of numbers",
          type: "error",
        });
        return;
      }
    }
    if (!config) return;
    
    let pinned = pinnedResources.split(",").map((id) => parseInt(id));
    setConfig({ ...config, pinned_resources: pinned });
    setIsLoading(true);
    
    try {
      const res = await network.setServerConfig({
        ...config,
        pinned_resources: pinned,
      });
      if (res.success) {
        showToast({
          message: t("Update server config successfully"),
          type: "success",
        });
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, pinnedResources, config, t]);

  if (!userConfig.user) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not logged in. Please log in to access this page.")}
      />
    );
  }

  if (!userConfig.user?.is_admin) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not authorized to access this page.")}
      />
    );
  }

  if (config == null) {
    return <Loading />;
  }

  return (
    <form className="px-4 pb-4" onSubmit={handleSubmit}>
      <Input
        type="number"
        value={config.max_uploading_size_in_mb.toString()}
        label="Max uploading size (MB)"
        onChange={(e) => {
          setConfig({
            ...config,
            max_uploading_size_in_mb: parseInt(e.target.value),
          });
        }}
      ></Input>
      <Input
        type="number"
        value={config.max_file_size_in_mb.toString()}
        label="Max file size (MB)"
        onChange={(e) => {
          setConfig({
            ...config,
            max_file_size_in_mb: parseInt(e.target.value),
          });
        }}
      ></Input>
      <Input
        type="number"
        value={config.max_downloads_per_day_for_single_ip.toString()}
        label="Max downloads per day for single IP"
        onChange={(e) => {
          setConfig({
            ...config,
            max_downloads_per_day_for_single_ip: parseInt(e.target.value),
          });
        }}
      ></Input>
      <fieldset className="fieldset w-full">
        <legend className="fieldset-legend">Allow registration</legend>
        <input
          type="checkbox"
          checked={config.allow_register}
          className="toggle-primary toggle"
          onChange={(e) => {
            setConfig({ ...config, allow_register: e.target.checked });
          }}
        />
      </fieldset>
      <Input
        type="text"
        value={config.server_name}
        label="Server name"
        onChange={(e) => {
          setConfig({ ...config, server_name: e.target.value });
        }}
      ></Input>
      <Input
        type="text"
        value={config.server_description}
        label="Server description"
        onChange={(e) => {
          setConfig({ ...config, server_description: e.target.value });
        }}
      ></Input>
      <Input
        type="text"
        value={config.cloudflare_turnstile_site_key}
        label="Cloudflare Turnstile Site Key"
        onChange={(e) => {
          setConfig({
            ...config,
            cloudflare_turnstile_site_key: e.target.value,
          });
        }}
      ></Input>
      <Input
        type="text"
        value={config.cloudflare_turnstile_secret_key}
        label="Cloudflare Turnstile Secret Key"
        onChange={(e) => {
          setConfig({
            ...config,
            cloudflare_turnstile_secret_key: e.target.value,
          });
        }}
      ></Input>
      <TextArea
        value={config.site_info}
        onChange={(e) => {
          setConfig({ ...config, site_info: e.target.value });
        }}
        label="Site info (Markdown)"
        height={180}
      />
      <fieldset className="fieldset w-full">
        <legend className="fieldset-legend">Allow normal user upload</legend>
        <input
          type="checkbox"
          checked={config.allow_normal_user_upload}
          className="toggle-primary toggle"
          onChange={(e) => {
            setConfig({
              ...config,
              allow_normal_user_upload: e.target.checked,
            });
          }}
        />
      </fieldset>
      <Input
        type="number"
        value={config.max_normal_user_upload_size_in_mb.toString()}
        label="Max normal user upload size (MB)"
        onChange={(e) => {
          setConfig({
            ...config,
            max_normal_user_upload_size_in_mb: parseInt(e.target.value),
          });
        }}
      ></Input>
      <Input
        type="text"
        value={config.upload_prompt}
        label="Upload prompt"
        onChange={(e) => {
          setConfig({ ...config, upload_prompt: e.target.value });
        }}
      ></Input>
      <Input
        type="text"
        value={pinnedResources}
        label="Pinned resources"
        onChange={(e) => {
          setPinnedResources(e.target.value);
        }}
      ></Input>
      <InfoAlert
        className="my-2"
        message="If the cloudflare turnstile keys are not empty, the turnstile will be used for register and download."
      />
      <div className="flex justify-end">
        <Button className="btn-accent shadow" isLoading={isLoading}>
          {t("Submit")}
        </Button>
      </div>
    </form>
  );
}
