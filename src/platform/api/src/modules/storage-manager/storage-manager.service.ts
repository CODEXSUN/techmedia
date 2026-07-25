import { StorageManagerRepository } from "./storage-manager.repository.js";
import type {
  CompanyLogoUploadPayload,
  StorageDownloadInput,
  StorageFolderPayload,
  StorageListInput,
  StorageUploadPayload,
  UserAvatarUploadPayload
} from "./storage-manager.types.js";

export class StorageManagerService {
  constructor(private readonly repository = new StorageManagerRepository()) {}

  roots() {
    return this.repository.roots();
  }

  list(input: StorageListInput) {
    return this.repository.list(input);
  }

  createFolder(input: StorageFolderPayload) {
    return this.repository.createFolder(input);
  }

  upload(input: StorageUploadPayload) {
    return this.repository.upload(input);
  }

  uploadCompanyLogo(tenantId: string, input: CompanyLogoUploadPayload) {
    return this.repository.uploadCompanyLogo(tenantId, input);
  }

  readCompanyLogo(tenantId: string, variant: "logo" | "logo-dark") {
    return this.repository.readCompanyLogo(tenantId, variant);
  }
  uploadUserAvatar(tenantId: string, userUuid: string, input: UserAvatarUploadPayload) {
    return this.repository.uploadUserAvatar(tenantId, userUuid, input);
  }
  readUserAvatar(tenantId: string, userUuid: string) {
    return this.repository.readUserAvatar(tenantId, userUuid);
  }

  download(input: StorageDownloadInput) {
    return this.repository.download(input);
  }
}
