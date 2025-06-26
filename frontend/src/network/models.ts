export interface User {
  id: number;
  username: string;
  created_at: string;
  avatar_path: string;
  is_admin: boolean;
  can_upload: boolean;
  uploads_count: number;
  comments_count: number;
  bio: string;
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
  description: string;
  type: string;
  aliases: string[];
}

export interface TagWithCount extends Tag {
  resources_count: number;
}

export interface CreateResourceParams {
  title: string;
  alternative_titles: string[];
  links: RLink[];
  tags: number[];
  article: string;
  images: number[];
}

export interface Image {
  id: number;
  width: number;
  height: number;
}

export interface RLink {
  label: string;
  url: string;
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
  links: RLink[];
  article: string;
  createdAt: string;
  tags: Tag[];
  images: Image[];
  files: RFile[];
  author: User;
  views: number;
  downloads: number;
  comments: number;
  related: Resource[];
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
  size: number;
  is_redirect: boolean;
  user_id: number;
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
  images: Image[];
}

export interface CommentWithResource {
  id: number;
  content: string;
  created_at: string;
  user: User;
  images: Image[];
  resource: Resource;
}

export interface ServerConfig {
  max_uploading_size_in_mb: number;
  max_file_size_in_mb: number;
  max_downloads_per_day_for_single_ip: number;
  allow_register: boolean;
  cloudflare_turnstile_site_key: string;
  cloudflare_turnstile_secret_key: string;
  server_name: string;
  server_description: string;
  site_info: string;
}

export enum RSort {
  TimeAsc = 0,
  TimeDesc = 1,
  ViewsAsc = 2,
  ViewsDesc = 3,
  DownloadsAsc = 4,
  DownloadsDesc = 5,
}

export enum ActivityType {
  Unknown = 0,
  ResourcePublished = 1,
  ResourceUpdated = 2,
  ResourceCommented = 3,
}

export interface Activity {
  id: number;
  type: ActivityType;
  user_id: number;
  created_at: string;
  resource?: Resource;
  user?: User;
  comment?: CommentWithResource;
}
