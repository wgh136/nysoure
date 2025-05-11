import {User} from "./network/models.ts";

class App {
  appName = "资源库"

  user: User | null = null;

  token: string | null = null;

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
}

export const app = new App();