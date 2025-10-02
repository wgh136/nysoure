import { User } from "./network/models.ts";

interface MyWindow extends Window {
  serverName?: string;
  cloudflareTurnstileSiteKey?: string;
  siteInfo?: string;
  uploadPrompt?: string;
  allowNormalUserUpload?: string;
  siteDescription?: string;
}

class App {
  appName = "Nysoure";

  user: User | null = null;

  token: string | null = null;

  cloudflareTurnstileSiteKey: string | null = null;

  siteInfo = "";

  uploadPrompt = "";

  siteDescription = "";

  allowNormalUserUpload = true;

  constructor() {
    this.init();
  }

  init() {
    const userJson = localStorage.getItem("user");
    const tokenJson = localStorage.getItem("token");
    if (userJson) {
      this.user = JSON.parse(userJson);
    }
    if (tokenJson) {
      this.token = JSON.parse(tokenJson);
    }
    this.appName = (window as MyWindow).serverName || this.appName;
    this.cloudflareTurnstileSiteKey =
      (window as MyWindow).cloudflareTurnstileSiteKey || null;
    if (this.cloudflareTurnstileSiteKey === "{{CFTurnstileSiteKey}}") {
      this.cloudflareTurnstileSiteKey = null; // Placeholder value, set to null if not configured
    }
    this.siteInfo = (window as MyWindow).siteInfo || "";
    this.uploadPrompt = (window as MyWindow).uploadPrompt || "";
    this.siteDescription = (window as MyWindow).siteDescription || "";
    this.allowNormalUserUpload =
      (window as MyWindow).allowNormalUserUpload === "true";
  }

  saveData() {
    localStorage.setItem("user", JSON.stringify(this.user));
    localStorage.setItem("token", JSON.stringify(this.token));
  }

  isAdmin() {
    return this.user != null && this.user.is_admin;
  }

  isLoggedIn() {
    return this.user != null && this.token != null;
  }

  canUpload() {
    return this.isLoggedIn() && (this.user?.can_upload || this.isAdmin());
  }

  getPreFetchData() {
    const preFetchDataElement = document.getElementById("pre_fetch_data");
    if (preFetchDataElement) {
      let content = preFetchDataElement.textContent;
      if (!content) {
        return null;
      }
      content = decodeURIComponent(content);
      const res = JSON.parse(content);
      preFetchDataElement.remove();
      return res;
    }
    return null;
  }
}

export const app = new App();
