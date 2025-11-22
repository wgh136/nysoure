import axios from "axios";
import { Response } from "./models.ts";

const KunApi = {
  isAvailable(): boolean {
    return (
      window.location.hostname === "res.nyne.dev" ||
      window.location.hostname.startsWith("localhost")
    );
  },

  async getPatch(id: string): Promise<Response<KunPatchResponse>> {
    try {
      const client = axios.create({
        validateStatus(status) {
          return status === 200 || status === 404; // Accept only 200 and 404 responses
        },
      });
      const uri = `https://www.moyu.moe/api/hikari?vndb_id=${id}`;
      const uriBase64 = btoa(uri);
      const res = await client.get(
        `/api/proxy?uri=${uriBase64}`,
      );
      if (res.status === 404) {
        return {
          success: false,
          message: "404",
        };
      }
      if (res.status !== 200) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return {
        success: true,
        message: "ok",
        data: res.data.data,
      };
    } catch (error) {
      console.error("Error fetching files:", error);
      return { success: false, message: "Failed to fetch files" };
    }
  },
};

export default KunApi;

export interface KunUser {
  id: number;
  name: string;
  avatar: string;
}

export interface KunPatchResponse {
  id: number;
  name: string;
  // e.g. "vndb_id": "v19658",
  vndb_id: string;
  banner: string;
  introduction: string;
  // e.g. "released": "2016-11-25",
  released: string;
  status: number;
  download: number;
  view: number;
  resource_update_time: Date;
  type: string[];
  language: string[];
  engine: string[];
  platform: string[];
  user_id: number;
  user: KunUser;
  created: Date;
  updated: Date;
  resource: KunPatchResourceResponse[];
}

export interface KunPatchResourceResponse {
  id: number;
  storage: "s3" | "user";
  name: string;
  model_name: string;
  size: string;
  code: string;
  password: string;
  note: string;
  hash: string;
  type: string[];
  language: string[];
  platform: string[];
  download: number;
  status: number;
  update_time: Date;
  user_id: number;
  patch_id: number;
  created: Date;
  user: KunUser;
}

export interface HikariResponse {
  success: boolean;
  message: string;
  data: KunPatchResponse | null;
}

const SUPPORTED_LANGUAGE_MAP: Record<string, string> = {
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  "ja": "日本語",
  "en": "English",
  "other": "其它",
};

export function kunLanguageToString(language: string): string {
  return SUPPORTED_LANGUAGE_MAP[language] || language;
}

const SUPPORTED_PLATFORM_MAP: Record<string, string> = {
  windows: "Windows",
  android: "Android",
  macos: "MacOS",
  ios: "iOS",
  linux: "Linux",
  other: "其它",
};

export function kunPlatformToString(platform: string): string {
  return SUPPORTED_PLATFORM_MAP[platform] || platform;
}

const resourceTypes = [
  {
    value: "manual",
    label: "人工翻译补丁",
  },
  {
    value: "ai",
    label: "AI 翻译补丁",
  },
  {
    value: "machine_polishing",
    label: "机翻润色",
  },
  {
    value: "machine",
    label: "机翻补丁",
  },
  {
    value: "save",
    label: "全 CG 存档",
  },
  {
    value: "crack",
    label: "破解补丁",
  },
  {
    value: "fix",
    label: "修正补丁",
  },
  {
    value: "mod",
    label: "魔改补丁",
  },
  {
    value: "other",
    label: "其它",
  },
];

export function kunResourceTypeToString(type: string): string {
  const resourceType = resourceTypes.find((t) => t.value === type);
  return resourceType ? resourceType.label : type;
}
