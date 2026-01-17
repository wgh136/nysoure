import axios from "axios";
import { app } from "../app.ts";
import {
  CreateResourceParams,
  RFile,
  PageResponse,
  Resource,
  ResourceDetails,
  Response,
  Storage,
  Tag,
  UploadingFile,
  User,
  UserWithToken,
  Comment,
  CommentWithResource,
  ServerConfig,
  RSort,
  TagWithCount,
  Activity,
  CommentWithRef,
  Collection,
  Statistics,
  VndbInfo,
} from "./models.ts";

class Network {
  baseUrl = "";

  apiBaseUrl = "/api";

  constructor() {
    this.init();
  }

  private async _callApi<T>(request: () => Promise<{ data: T }>): Promise<T> {
    try {
      const response = await request();
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      } as any;
    }
  }

  init() {
    axios.defaults.validateStatus = (_) => true;
    axios.interceptors.request.use((config) => {
      if (app.token) {
        config.headers["Authorization"] = app.token;
      }
      return config;
    });
    axios.interceptors.response.use(
      (response) => {
        if (response.status >= 400 && response.status < 500) {
          const data = response.data;
          if (data.message) {
            throw new Error(data.message);
          } else {
            throw new Error(`Invalid response: ${response.status}`);
          }
        } else if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        } else {
          return response;
        }
      },
      (error) => {
        return Promise.reject(error);
      },
    );
    this.testToken();
  }

  async testToken(): Promise<void> {
    if (!app.token) {
      return;
    }
    const res = await this.getMe();
    if (
      !res.success &&
      (res.message.includes("Invalid token") ||
        res.message.includes("User not found"))
    ) {
      app.token = null;
      app.user = null;
      app.saveData();
      window.location.reload();
    } else {
      app.user = res.data!;
      app.token = res.data!.token;
      app.saveData();
    }
  }

  async login(
    username: string,
    password: string,
  ): Promise<Response<UserWithToken>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/login`, {
        username,
        password,
      }),
    );
  }

  async register(
    username: string,
    password: string,
    cfToken: string,
  ): Promise<Response<UserWithToken>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/register`, {
        username,
        password,
        cf_token: cfToken,
      }),
    );
  }

  async getMe(): Promise<Response<UserWithToken>> {
    return this._callApi(() => axios.get(`${this.apiBaseUrl}/user/me`));
  }

  async getUserInfo(username: string): Promise<Response<User>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/user/info`, {
        params: {
          username,
        },
      }),
    );
  }

  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<Response<UserWithToken>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/password`, {
        old_password: oldPassword,
        new_password: newPassword,
      }),
    );
  }

  async changeAvatar(file: File): Promise<Response<User>> {
    const formData = new FormData();
    formData.append("avatar", file);
    return this._callApi(() =>
      axios.put(`${this.apiBaseUrl}/user/avatar`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
    );
  }

  async changeUsername(username: string): Promise<Response<User>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/username`, {
        username,
      }),
    );
  }

  async changeBio(bio: string): Promise<Response<User>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/bio`, {
        bio,
      }),
    );
  }

  getUserAvatar(user: User): string {
    return this.baseUrl + user.avatar_path;
  }

  async setUserAdmin(
    userId: number,
    isAdmin: boolean,
  ): Promise<Response<User>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/set_admin`, {
        user_id: userId,
        is_admin: isAdmin ? "true" : "false",
      }),
    );
  }

  async setUserUploadPermission(
    userId: number,
    canUpload: boolean,
  ): Promise<Response<User>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/set_upload_permission`, {
        user_id: userId,
        can_upload: canUpload ? "true" : "false",
      }),
    );
  }

  async listUsers(page: number): Promise<PageResponse<User>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/user/list`, {
        params: { page },
      }),
    );
  }

  async searchUsers(
    username: string,
    page: number,
  ): Promise<PageResponse<User>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/user/search`, {
        params: {
          username,
          page,
        },
      }),
    );
  }

  async deleteUser(userId: number): Promise<Response<void>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/delete`, {
        user_id: userId,
      }),
    );
  }

  async listBannedUsers(page: number): Promise<PageResponse<User>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/user/banned`, {
        params: { page },
      }),
    );
  }

  async unbanUser(userId: number): Promise<Response<User>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/user/unban`, {
        user_id: userId,
      }),
    );
  }

  async getAllTags(): Promise<Response<TagWithCount[]>> {
    return this._callApi(() => axios.get(`${this.apiBaseUrl}/tag`));
  }

  async searchTags(
    keyword: string,
    mainTag?: boolean,
  ): Promise<Response<Tag[]>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/tag/search`, {
        params: {
          keyword,
          mainTag,
        },
      }),
    );
  }

  async createTag(name: string): Promise<Response<Tag>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/tag`, {
        name,
      }),
    );
  }

  async getOrCreateTags(
    names: string[],
    tagType: string,
  ): Promise<Response<Tag[]>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/tag/batch`, {
        names,
        type: tagType,
      }),
    );
  }

  async getTagByName(name: string): Promise<Response<Tag>> {
    return this._callApi(() => axios.get(`${this.apiBaseUrl}/tag/${name}`));
  }

  async setTagInfo(
    tagId: number,
    description: string,
    aliasOf: number | null,
    type: string,
  ): Promise<Response<Tag>> {
    return this._callApi(() =>
      axios.putForm(`${this.apiBaseUrl}/tag/${tagId}/info`, {
        description,
        alias_of: aliasOf,
        type,
      }),
    );
  }

  async setTagAlias(tagID: number, aliases: string[]): Promise<Response<Tag>> {
    return this._callApi(() =>
      axios.put(`${this.apiBaseUrl}/tag/${tagID}/alias`, {
        aliases,
      }),
    );
  }

  /**
   * Upload image and return the image id
   */
  async uploadImage(file: File): Promise<Response<number>> {
    const data = await file.arrayBuffer();
    return this._callApi(() =>
      axios.put(`${this.apiBaseUrl}/image`, data, {
        headers: {
          "Content-Type": "application/octet-stream",
        },
      }),
    );
  }

  async deleteImage(id: number): Promise<Response<void>> {
    return this._callApi(() => axios.delete(`${this.apiBaseUrl}/image/${id}`));
  }

  getImageUrl(id: number): string {
    return `${this.apiBaseUrl}/image/${id}`;
  }

  getResampledImageUrl(id: number): string {
    return `${this.apiBaseUrl}/image/resampled/${id}`;
  }

  async createResource(
    params: CreateResourceParams,
  ): Promise<Response<number>> {
    console.log(this);
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/resource`, params),
    );
  }

  async editResource(
    id: number,
    params: CreateResourceParams,
  ): Promise<Response<void>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/resource/${id}`, params),
    );
  }

  async getResources(
    page: number,
    sort: RSort,
  ): Promise<PageResponse<Resource>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/resource`, {
        params: {
          page,
          sort,
        },
      }),
    );
  }

  async getResourcesByTag(
    tag: string,
    page: number,
  ): Promise<PageResponse<Resource>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/resource/tag/${encodeURIComponent(tag)}`, {
        params: {
          page,
        },
      }),
    );
  }

  async getResourcesByUser(
    username: string,
    page: number,
  ): Promise<PageResponse<Resource>> {
    return this._callApi(() =>
      axios.get(
        `${this.apiBaseUrl}/resource/user/${encodeURIComponent(username)}`,
        {
          params: {
            page,
          },
        },
      ),
    );
  }

  async searchResources(
    keyword: string,
    page: number,
  ): Promise<PageResponse<Resource>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/resource/search`, {
        params: {
          keyword,
          page,
        },
      }),
    );
  }

  async getResourceDetails(id: number): Promise<Response<ResourceDetails>> {
    return this._callApi<Response<ResourceDetails>>(() =>
      axios.get(`${this.apiBaseUrl}/resource/${id}`),
    );
  }

  async getRandomResource(): Promise<Response<Resource>> {
    return this._callApi(() => axios.get(`${this.apiBaseUrl}/resource/random`));
  }

  async deleteResource(id: number): Promise<Response<void>> {
    return this._callApi(() =>
      axios.delete(`${this.apiBaseUrl}/resource/${id}`),
    );
  }

  async getPinnedResources(): Promise<Response<Resource[]>> {
    return this._callApi(() => axios.get(`${this.apiBaseUrl}/resource/pinned`));
  }

  async createS3Storage(
    name: string,
    endPoint: string,
    accessKeyID: string,
    secretAccessKey: string,
    bucketName: string,
    maxSizeInMB: number,
    domain: string,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/storage/s3`, {
        name,
        endPoint,
        accessKeyID,
        secretAccessKey,
        bucketName,
        maxSizeInMB,
        domain,
      }),
    );
  }

  async createLocalStorage(
    name: string,
    path: string,
    maxSizeInMB: number,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/storage/local`, {
        name,
        path,
        maxSizeInMB,
      }),
    );
  }

  async createFTPStorage(
    name: string,
    host: string,
    username: string,
    password: string,
    basePath: string,
    domain: string,
    maxSizeInMB: number,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/storage/ftp`, {
        name,
        host,
        username,
        password,
        basePath,
        domain,
        maxSizeInMB,
      }),
    );
  }

  async listStorages(): Promise<Response<Storage[]>> {
    return this._callApi(() => axios.get(`${this.apiBaseUrl}/storage`));
  }

  async deleteStorage(id: number): Promise<Response<void>> {
    return this._callApi(() =>
      axios.delete(`${this.apiBaseUrl}/storage/${id}`),
    );
  }

  async setDefaultStorage(id: number): Promise<Response<Storage>> {
    return this._callApi(() =>
      axios.put(`${this.apiBaseUrl}/storage/${id}/default`),
    );
  }

  async initFileUpload(
    filename: string,
    description: string,
    fileSize: number,
    resourceId: number,
    storageId: number,
    tag: string,
  ): Promise<Response<UploadingFile>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/files/upload/init`, {
        filename,
        description,
        file_size: fileSize,
        resource_id: resourceId,
        storage_id: storageId,
        tag,
      }),
    );
  }

  async uploadFileBlock(
    fileId: number,
    index: number,
    blockData: ArrayBuffer,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.post(
        `${this.apiBaseUrl}/files/upload/block/${fileId}/${index}`,
        blockData,
        {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        },
      ),
    );
  }

  async finishFileUpload(
    fileId: number,
    md5: string,
  ): Promise<Response<RFile>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/files/upload/finish/${fileId}?md5=${md5}`),
    );
  }

  async cancelFileUpload(fileId: number): Promise<Response<void>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/files/upload/cancel/${fileId}`),
    );
  }

  async createRedirectFile(
    filename: string,
    description: string,
    resourceId: number,
    redirectUrl: string,
    fileSize: number,
    md5: string,
    tag: string,
  ): Promise<Response<RFile>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/files/redirect`, {
        filename,
        description,
        resource_id: resourceId,
        redirect_url: redirectUrl,
        file_size: fileSize,
        md5,
        tag,
      }),
    );
  }

  async createServerDownloadTask(
    url: string,
    filename: string,
    description: string,
    resourceId: number,
    storageId: number,
    tag: string,
  ): Promise<Response<RFile>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/files/upload/url`, {
        url,
        filename,
        description,
        resource_id: resourceId,
        storage_id: storageId,
        tag,
      }),
    );
  }

  async getFile(fileId: string): Promise<Response<RFile>> {
    return this._callApi(() => axios.get(`${this.apiBaseUrl}/files/${fileId}`));
  }

  async updateFile(
    fileId: string,
    filename: string,
    description: string,
    tag: string,
  ): Promise<Response<RFile>> {
    return this._callApi(() =>
      axios.put(`${this.apiBaseUrl}/files/${fileId}`, {
        filename,
        description,
        tag,
      }),
    );
  }

  async deleteFile(fileId: string): Promise<Response<void>> {
    return this._callApi(() =>
      axios.delete(`${this.apiBaseUrl}/files/${fileId}`),
    );
  }

  async getUserFiles(
    username: string,
    page: number = 1,
  ): Promise<PageResponse<RFile>> {
    return this._callApi(() =>
      axios.get(
        `${this.apiBaseUrl}/files/user/${encodeURIComponent(username)}`,
        {
          params: { page },
        },
      ),
    );
  }

  getFileDownloadLink(fileId: string, cfToken: string): string {
    return `${this.apiBaseUrl}/files/download/${fileId}?cf_token=${cfToken}`;
  }

  async createResourceComment(
    resourceID: number,
    content: string,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/comments/resource/${resourceID}`, {
        content,
      }),
    );
  }

  async updateComment(
    commentID: number,
    content: string,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.put(`${this.apiBaseUrl}/comments/${commentID}`, {
        content,
      }),
    );
  }

  async replyToComment(
    commentID: number,
    content: string,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/comments/reply/${commentID}`, {
        content,
      }),
    );
  }

  async listResourceComments(
    resourceID: number,
    page: number = 1,
  ): Promise<PageResponse<Comment>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/comments/resource/${resourceID}`, {
        params: { page },
      }),
    );
  }

  async listCommentsByUser(
    username: string,
    page: number = 1,
  ): Promise<PageResponse<CommentWithResource>> {
    return this._callApi(() =>
      axios.get(
        `${this.apiBaseUrl}/comments/user/${encodeURIComponent(username)}`,
        {
          params: { page },
        },
      ),
    );
  }

  async listCommentReplies(
    commentID: number,
    page: number = 1,
  ): Promise<PageResponse<Comment>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/comments/reply/${commentID}`, {
        params: { page },
      }),
    );
  }

  async getComment(commentID: number): Promise<Response<CommentWithRef>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/comments/${commentID}`),
    );
  }

  async deleteComment(commentID: number): Promise<Response<void>> {
    return this._callApi(() =>
      axios.delete(`${this.apiBaseUrl}/comments/${commentID}`),
    );
  }

  async getServerConfig(): Promise<Response<ServerConfig>> {
    return this._callApi(() => axios.get(`${this.apiBaseUrl}/config`));
  }

  async setServerConfig(config: ServerConfig): Promise<Response<void>> {
    return this._callApi(() => axios.post(`${this.apiBaseUrl}/config`, config));
  }

  async getActivities(page: number = 1): Promise<PageResponse<Activity>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/activity`, {
        params: { page },
      }),
    );
  }

  async getUserNotifications(page: number = 1): Promise<PageResponse<Activity>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/notification`, {
        params: { page },
      }),
    );
  }

  async resetUserNotificationsCount(): Promise<Response<void>> {
    return this._callApi(() =>
      axios.post(`${this.apiBaseUrl}/notification/reset`),
    );
  }

  async getUserNotificationsCount(): Promise<Response<number>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/notification/count`),
    );
  }

  async createCollection(
    title: string,
    article: string,
    isPublic: boolean,
  ): Promise<Response<Collection>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/collection/create`, {
        title,
        article,
        public: isPublic,
      }),
    );
  }

  async updateCollection(
    id: number,
    title: string,
    article: string,
    isPublic: boolean,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/collection/update`, {
        id,
        title,
        article,
        public: isPublic,
      }),
    );
  }

  async deleteCollection(id: number): Promise<Response<any>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/collection/delete`, {
        id,
      }),
    );
  }

  async getCollection(id: number): Promise<Response<Collection>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/collection/${id}`),
    );
  }

  async listUserCollections(
    username: string,
    page: number = 1,
  ): Promise<PageResponse<Collection>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/collection/list`, {
        params: { username, page },
      }),
    );
  }

  async listCollectionResources(
    collectionId: number,
    page: number = 1,
  ): Promise<PageResponse<Resource>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/collection/${collectionId}/resources`, {
        params: { page },
      }),
    );
  }

  async addResourceToCollection(
    collectionId: number,
    resourceId: number,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/collection/add_resource`, {
        collection_id: collectionId,
        resource_id: resourceId,
      }),
    );
  }

  async removeResourceFromCollection(
    collectionId: number,
    resourceId: number,
  ): Promise<Response<any>> {
    return this._callApi(() =>
      axios.postForm(`${this.apiBaseUrl}/collection/remove_resource`, {
        collection_id: collectionId,
        resource_id: resourceId,
      }),
    );
  }

  async searchUserCollections(
    username: string,
    keyword: string,
    excludedRID?: number,
  ): Promise<Response<Collection[]>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/collection/search`, {
        params: { username, keyword, excludedRID },
      }),
    );
  }

  async getStatistic(): Promise<Response<Statistics>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/config/statistics`),
    );
  }

  async getInfoFromVNDB(vnID: string): Promise<Response<VndbInfo>> {
    return this._callApi(() =>
      axios.get(`${this.apiBaseUrl}/resource/vndb/info`, {
        params: { vnid: vnID },
      }),
    );
  }
}

export const network = new Network();
