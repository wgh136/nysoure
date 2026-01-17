export interface User {
  id: number;
  username: string;
  created_at: string;
  avatar_path: string;
  is_admin: boolean;
  can_upload: boolean;
  resources_count: number;
  files_count: number;
  comments_count: number;
  bio: string;
  banned: boolean;
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
  release_date?: string;
  tags: number[];
  article: string;
  images: number[];
  cover_id?: number;
  gallery: number[];
  gallery_nsfw: number[];
  characters: CharacterParams[];
}

export type CharacterRole = 'primary' | 'side';

export interface CharacterParams {
  name: string;
  alias: string[];
  cv: string;
  image: number;
  role: CharacterRole;
}

export interface VndbInfo {
  characters: CharacterParams[];
  release_date: string;
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
  release_date?: string;
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
  releaseDate?: string;
  tags: Tag[];
  images: Image[];
  coverId?: number;
  files: RFile[];
  author: User;
  views: number;
  downloads: number;
  comments: number;
  related: Resource[];
  gallery: number[];
  galleryNsfw: number[];
  characters: CharacterParams[];
  ratings: Record<string, number>;
}

export interface Storage {
  id: number;
  name: string;
  type: string;
  maxSize: number;
  currentSize: number;
  createdAt: string;
  isDefault: boolean;
}

export interface RFile {
  id: string;
  filename: string;
  description: string;
  size: number;
  is_redirect: boolean;
  user: User;
  resource?: Resource;
  hash?: string;
  storage_name?: string;
  created_at: number; // unix timestamp
  tag?: string;
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
  content_truncated: boolean;
  reply_count: number;
  replies: Comment[];
}

export interface CommentWithResource {
  id: number;
  content: string;
  created_at: string;
  user: User;
  images: Image[];
  resource: Resource;
  content_truncated: boolean;
  reply_count: number;
  replies: Comment[];
}

export interface CommentWithRef {
  id: number;
  content: string;
  created_at: string;
  user: User;
  images: Image[];
  reply_count: number;
  resource?: Resource;
  reply_to?: Comment;
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
  allow_normal_user_upload: boolean;
  max_normal_user_upload_size_in_mb: number;
  upload_prompt: string;
  pinned_resources: number[];
}

export enum RSort {
  TimeAsc = 0,
  TimeDesc = 1,
  ViewsAsc = 2,
  ViewsDesc = 3,
  DownloadsAsc = 4,
  DownloadsDesc = 5,
  ReleaseDateAsc = 6,
  ReleaseDateDesc = 7,
}

export enum ActivityType {
  Unknown = 0,
  ResourcePublished = 1,
  ResourceUpdated = 2,
  NewComment = 3,
  NewFile = 4,
}

export interface Activity {
  id: number;
  type: ActivityType;
  user_id: number;
  created_at: string;
  resource?: Resource;
  user?: User;
  comment?: Comment;
  file?: RFile;
}

export interface Collection {
  id: number;
  title: string;
  article: string;
  user: User;
  resources_count: number;
  images: Image[];
  isPublic: boolean;
}

export interface Statistics {
  total_resources: number;
  total_files: number;
  start_time: number;
}
