import { describe, expect, it } from "vitest";

import {
  MEDIA_LIMITS,
  inferAssetType,
  validateRegisterAssetRequest,
  validateSignedUrlRequest
} from "@/lib/upload-contracts";

describe("upload-contracts", () => {
  it("exports expected media limits", () => {
    expect(MEDIA_LIMITS.maxPhotosPerUpload).toBe(5);
    expect(MEDIA_LIMITS.maxFilesPerUpload).toBe(6);
    expect(MEDIA_LIMITS.maxVideoDurationSeconds).toBe(15);
    expect(MEDIA_LIMITS.maxPhotoSizeBytes).toBe(20 * 1024 * 1024);
    expect(MEDIA_LIMITS.maxVideoSizeBytes).toBe(5000 * 1024 * 1024);
  });

  it("validates signed-url payload", () => {
    expect(
      validateSignedUrlRequest({
        ownerType: "athlete",
        ownerId: "abc123",
        filename: "clip.mp4",
        contentType: "video/mp4"
      })
    ).toBe(true);

    expect(
      validateSignedUrlRequest({
        ownerType: "team",
        ownerId: "abc123",
        filename: "clip.mp4"
      })
    ).toBe(false);

    expect(
      validateSignedUrlRequest({
        ownerType: "athlete",
        ownerId: "",
        filename: "clip.mp4"
      })
    ).toBe(false);
  });

  it("validates register payload and optional asset type", () => {
    expect(
      validateRegisterAssetRequest({
        ownerType: "brand",
        ownerId: "brand-1",
        filePath: "brand/brand-1/logo.png",
        filename: "logo.png",
        assetType: "logo"
      })
    ).toBe(true);

    expect(
      validateRegisterAssetRequest({
        ownerType: "brand",
        ownerId: "brand-1",
        filePath: "brand/brand-1/file.bin",
        filename: "file.bin",
        assetType: "unknown"
      })
    ).toBe(false);
  });

  it("infers asset types from file shape", () => {
    const imageLike = { type: "image/jpeg", name: "headshot.jpg" } as File;
    const videoLike = { type: "video/mp4", name: "clip.mp4" } as File;
    const logoLike = { type: "application/octet-stream", name: "brand_logo.svg" } as File;
    const docLike = { type: "application/pdf", name: "brief.pdf" } as File;

    expect(inferAssetType(imageLike)).toBe("photo");
    expect(inferAssetType(videoLike)).toBe("video");
    expect(inferAssetType(logoLike)).toBe("logo");
    expect(inferAssetType(docLike)).toBe("document");
  });
});
