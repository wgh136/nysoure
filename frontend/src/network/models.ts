export interface User {
  id: number;
  username: string;
  created_at: string;
  avatar_path: string;
  is_admin: boolean;
  can_upload: boolean;
  uploads_count: number;
  comments_count: number;
}

export interface UserWithToken extends User {
  token: string;
}

export interface Response<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PageResponse<T> {
  success: boolean;
  message: string;
  data?: T[];
  totalPages?: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface CreateResourceParams {
  title: string;
  alternative_titles: string[];
  tags: number[];
  article: string;
  images: number[];
}

export interface Image {
  id: number;
  width: number;
  height: number;
}

export interface Resource {
  id: number;
  title: string;
  created_at: string;
  tags: Tag[];
  image?: Image;
  author: User;
}

export interface ResourceDetails {
  id: number;
  title: string;
  alternativeTitles: string[];
  article: string;
  createdAt: string;
  tags: Tag[];
  images: Image[];
  files: RFile[];
  author: User;
  views: number;
  downloads: number;
}

export interface Storage {
  id: number;
  name: string;
  type: string;
  maxSize: number;
  currentSize: number;
  createdAt: string;
}

export interface RFile {
  id: string;
  filename: string;
  description: string;
}

export interface UploadingFile {
  id: number;
  filename: string;
  description: string;
  totalSize?: number;
  blockSize: number;
  blocksCount: number;
  storageId: number;
  resourceId: number;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: User;
}
