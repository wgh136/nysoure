import {Response} from "./models.ts";
import {network} from "./network.ts";

enum UploadingStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  DONE = "done",
  ERROR = "error",
}

class Listenable {
  listeners: (() => void)[] = [];

  addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export class UploadingTask extends Listenable {
  id: number;
  file: File;
  blocks: boolean[];
  blockSize: number;

  status: UploadingStatus = UploadingStatus.PENDING;
  errorMessage: string | null = null;
  uploadingBlocks: number[] = [];
  finishedBlocksCount: number = 0;

  onFinished: (() => void);

  get filename() {
    return this.file.name;
  }

  get progress() {
    if (this.blocks.length === 0) {
      return 0;
    }
    return this.finishedBlocksCount / this.blocks.length;
  }

  constructor(id: number, file: File, blocksCount: number, blockSize: number, onFinished: () => void) {
    super();
    this.id = id;
    this.file = file;
    this.blocks = new Array(blocksCount).fill(false);
    this.blockSize = blockSize;
    this.onFinished = onFinished;
  }

  async upload(id: number) {
    let index = 0;
    while (index < this.blocks.length) {
      if (this.blocks[index] || this.uploadingBlocks.includes(index)) {
        index++;
        continue;
      }
      if (this.status !== UploadingStatus.UPLOADING) {
        return;
      }
      console.log(`${id}: uploading block ${index}`);
      this.uploadingBlocks.push(index);
      const start = index * this.blockSize;
      const end = Math.min(start + this.blockSize, this.file.size);
      const block = this.file.slice(start, end);
      const data = await block.arrayBuffer();
      let retries = 3;
      while (true) {
        const res = await network.uploadFileBlock(this.id, index, data);
        if (!res.success) {
          retries--;
          if (retries === 0) {
            this.status = UploadingStatus.ERROR;
            this.errorMessage = res.message;
            this.notifyListeners();
            return;
          }
        } else {
          break;
        }
      }
      console.log(`${id}: uploaded block ${index}`);
      this.blocks[index] = true;
      this.finishedBlocksCount++;
      this.uploadingBlocks = this.uploadingBlocks.filter(i => i !== index);
      index++;
      this.notifyListeners();
    }
  }

  async start() {
    this.status = UploadingStatus.UPLOADING;
    this.notifyListeners();
    await Promise.all([
      this.upload(0),
      this.upload(1),
      this.upload(2),
      this.upload(3),
    ])
    if (this.status !== UploadingStatus.UPLOADING) {
      return;
    }
    const res = await network.finishFileUpload(this.id);
    if (res.success) {
      this.status = UploadingStatus.DONE;
      this.notifyListeners();
      this.onFinished();
    } else {
      this.status = UploadingStatus.ERROR;
      this.errorMessage = res.message;
      this.notifyListeners();
    }
  }

  cancel() {
    this.status = UploadingStatus.ERROR;
    this.errorMessage = "Cancelled";
    this.notifyListeners();
    network.cancelFileUpload(this.id);
  }
}

class UploadingManager extends Listenable {
  tasks: UploadingTask[] = [];

  onTaskStatusChanged = () =>  {
    if (this.tasks.length === 0) {
      return;
    }
    if (this.tasks[0].status === UploadingStatus.PENDING) {
      this.tasks[0].start();
    } else if (this.tasks[0].status === UploadingStatus.DONE) {
      this.tasks[0].removeListener(this.onTaskStatusChanged);
      this.tasks.shift();
      this.onTaskStatusChanged();
    } else if (this.tasks[0].status === UploadingStatus.ERROR && this.tasks[0].errorMessage === "Cancelled") {
      this.tasks[0].removeListener(this.onTaskStatusChanged);
      this.tasks.shift();
      this.onTaskStatusChanged();
    }
    this.notifyListeners();
  }

  async addTask(file: File, resourceID: number, storageID: number, description: string, onFinished: () => void): Promise<Response<void>> {
    const res = await network.initFileUpload(
      file.name,
      description,
      file.size,
      resourceID,
      storageID
    )
    if (!res.success) {
      return {
        success: false,
        message: res.message,
      };
    }
    const task = new UploadingTask(res.data!.id, file, res.data!.blocksCount, res.data!.blockSize, onFinished);
    task.addListener(this.onTaskStatusChanged);
    this.tasks.push(task);
    this.onTaskStatusChanged();
    return  {
      success: true,
      message: "ok",
    }
  }

  getTasks() {
    return this.tasks
  }

  removeTask(task: UploadingTask) {
    task.cancel();
    task.removeListener(this.onTaskStatusChanged);
    this.tasks = this.tasks.filter(t => t !== task);
  }

  hasTasks() {
    return this.tasks.length > 0;
  }
}

export const uploadingManager = new UploadingManager();