import {Response} from "./models.ts";

class UploadingManager {
  async addTask(file: File, resourceID: number, storageID: number, description: string): Promise<Response<void>> {
    // TODO: implement this
    throw new Error("Not implemented");
  }
}

export const uploadingManager = new UploadingManager();