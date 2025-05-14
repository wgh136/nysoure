import axios from 'axios';
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
  ServerConfig
} from "./models.ts";

class Network {
  baseUrl = ''

  apiBaseUrl = '/api'

  constructor() {
    this.init()
  }

  init() {
    if (import.meta.env.MODE === 'development') {
      this.baseUrl = 'http://localhost:3000';
      this.apiBaseUrl = 'http://localhost:3000/api';
    }
    axios.defaults.validateStatus = _ => true
    axios.interceptors.request.use((config) => {
      if (app.token) {
        config.headers['Authorization'] = app.token;
      }
      return config
    })
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
          return response
        }
      },
      (error) => {
        return Promise.reject(error);
      })
  }

  async login(username: string, password: string): Promise<Response<UserWithToken>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/user/login`, {
        username,
        password
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async register(username: string, password: string): Promise<Response<UserWithToken>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/user/register`, {
        username,
        password
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async getUserInfo(username: string): Promise<Response<User>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/user/info`, {
        params: {
          username
        }
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<Response<UserWithToken>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/user/password`, {
        old_password: oldPassword,
        new_password: newPassword
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async changeAvatar(file: File): Promise<Response<User>> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await axios.put(`${this.apiBaseUrl}/user/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async changeUsername(username: string): Promise<Response<User>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/user/username`, {
        username
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  getUserAvatar(user: User): string {
    return this.baseUrl + user.avatar_path
  }

  async setUserAdmin(userId: number, isAdmin: boolean): Promise<Response<User>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/user/set_admin`, {
        user_id: userId,
        is_admin: isAdmin ? 'true' : 'false'
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async setUserUploadPermission(userId: number, canUpload: boolean): Promise<Response<User>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/user/set_upload_permission`, {
        user_id: userId,
        can_upload: canUpload ? 'true' : 'false'
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async listUsers(page: number): Promise<PageResponse<User>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/user/list`, {
        params: { page }
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async searchUsers(username: string, page: number): Promise<PageResponse<User>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/user/search`, {
        params: {
          username,
          page
        }
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async deleteUser(userId: number): Promise<Response<void>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/user/delete`, {
        user_id: userId
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async searchTags(keyword: string): Promise<Response<Tag[]>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/tag/search`, {
        params: {
          keyword
        }
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async createTag(name: string): Promise<Response<Tag>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/tag`, {
        name
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  /**
   * Upload image and return the image id
   */
  async uploadImage(file: File): Promise<Response<number>> {
    try {
      const data = await file.arrayBuffer()
      const response = await axios.put(`${this.apiBaseUrl}/image`, data, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async deleteImage(id: number): Promise<Response<void>> {
    try {
      const response = await axios.delete(`${this.apiBaseUrl}/image/${id}`)
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  getImageUrl(id: number): string {
    return `${this.apiBaseUrl}/image/${id}`
  }

  async createResource(params: CreateResourceParams): Promise<Response<number>> {
    console.log(this)
    try {
      const response = await axios.post(`${this.apiBaseUrl}/resource`, params)
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async getResources(page: number): Promise<PageResponse<Resource>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/resource`, {
        params: {
          page
        }
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async getResourcesByTag(tag: string, page: number): Promise<PageResponse<Resource>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/resource/tag/${tag}`, {
        params: {
          page
        }
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async getResourcesByUser(username: string, page: number): Promise<PageResponse<Resource>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/resource/user/${username}`, {
        params: {
          page
        }
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async searchResources(keyword: string, page: number): Promise<PageResponse<Resource>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/resource/search`, {
        params: {
          keyword,
          page
        }
      })
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async getResourceDetails(id: number): Promise<Response<ResourceDetails>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/resource/${id}`)
      return response.data
    } catch (e: any) {
      console.error(e)
      return {
        success: false,
        message: e.toString(),
      }
    }
  }

  async createS3Storage(name: string, endPoint: string, accessKeyID: string,
    secretAccessKey: string, bucketName: string, maxSizeInMB: number): Promise<Response<any>> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/storage/s3`, {
        name,
        endPoint,
        accessKeyID,
        secretAccessKey,
        bucketName,
        maxSizeInMB
      });
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async createLocalStorage(name: string, path: string, maxSizeInMB: number): Promise<Response<any>> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/storage/local`, {
        name,
        path,
        maxSizeInMB
      });
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async listStorages(): Promise<Response<Storage[]>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/storage`);
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async deleteStorage(id: number): Promise<Response<void>> {
    try {
      const response = await axios.delete(`${this.apiBaseUrl}/storage/${id}`);
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async initFileUpload(filename: string, description: string, fileSize: number,
    resourceId: number, storageId: number): Promise<Response<UploadingFile>> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/files/upload/init`, {
        filename,
        description,
        file_size: fileSize,
        resource_id: resourceId,
        storage_id: storageId
      });
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async uploadFileBlock(fileId: number, index: number, blockData: ArrayBuffer): Promise<Response<any>> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/files/upload/block/${fileId}/${index}`,
        blockData,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          }
        }
      );
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async finishFileUpload(fileId: number): Promise<Response<RFile>> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/files/upload/finish/${fileId}`);
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async cancelFileUpload(fileId: number): Promise<Response<void>> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/files/upload/cancel/${fileId}`);
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async createRedirectFile(filename: string, description: string,
    resourceId: number, redirectUrl: string): Promise<Response<RFile>> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/files/redirect`, {
        filename,
        description,
        resource_id: resourceId,
        redirect_url: redirectUrl
      });
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async getFile(fileId: string): Promise<Response<RFile>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/files/${fileId}`);
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async updateFile(fileId: string, filename: string, description: string): Promise<Response<RFile>> {
    try {
      const response = await axios.put(`${this.apiBaseUrl}/files/${fileId}`, {
        filename,
        description
      });
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async deleteFile(fileId: number): Promise<Response<void>> {
    try {
      const response = await axios.delete(`${this.apiBaseUrl}/files/${fileId}`);
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  getFileDownloadLink(fileId: string): string {
    return `${this.apiBaseUrl}/files/download/${fileId}`;
  }

  async createComment(resourceID: number, content: string): Promise<Response<any>> {
    try {
      const response = await axios.postForm(`${this.apiBaseUrl}/comments/${resourceID}`, { content });
      return response.data;
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.toString() };
    }
  }

  async listComments(resourceID: number, page: number = 1): Promise<PageResponse<Comment>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/comments/${resourceID}`, {
        params: { page }
      });
      return response.data;
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.toString() };
    }
  }

  async listCommentsByUser(username: string, page: number = 1): Promise<PageResponse<CommentWithResource>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/comments/user/${username}`, {
        params: { page }
      });
      return response.data;
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.toString() };
    }
  }

  async getServerConfig(): Promise<Response<ServerConfig>> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/config`);
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }

  async setServerConfig(config: ServerConfig): Promise<Response<void>> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/config`, config);
      return response.data;
    } catch (e: any) {
      console.error(e);
      return {
        success: false,
        message: e.toString(),
      };
    }
  }
}

export const network = new Network();

