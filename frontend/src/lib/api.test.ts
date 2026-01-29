import { describe, it, expect } from "vitest";
import { authApi, filesApi, type FileInfo, type FolderInfo, type FileTreeResponse } from "./api";

describe("authApi", () => {
  it("has login method", () => {
    expect(typeof authApi.login).toBe("function");
  });

  it("has signup method", () => {
    expect(typeof authApi.signup).toBe("function");
  });

  it("has logout method", () => {
    expect(typeof authApi.logout).toBe("function");
  });

  it("has me method", () => {
    expect(typeof authApi.me).toBe("function");
  });

  it("has refresh method", () => {
    expect(typeof authApi.refresh).toBe("function");
  });
});

describe("filesApi", () => {
  it("has listTree method", () => {
    expect(typeof filesApi.listTree).toBe("function");
  });

  it("has downloadUrl method", () => {
    expect(typeof filesApi.downloadUrl).toBe("function");
  });
});

describe("API types", () => {
  it("FileInfo type has expected shape", () => {
    const file: FileInfo = {
      key: "folder/file.pdf",
      filename: "file.pdf",
      size: 1024,
      file_type: "application/pdf",
      last_modified: "2024-01-01T00:00:00Z",
      etag: "abc",
    };
    expect(file.key).toBe("folder/file.pdf");
    expect(file.filename).toBe("file.pdf");
  });

  it("FolderInfo type has expected shape", () => {
    const folder: FolderInfo = {
      key: "folder/",
      name: "folder",
    };
    expect(folder.key).toBe("folder/");
    expect(folder.name).toBe("folder");
  });
});
