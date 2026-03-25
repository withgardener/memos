import { Attachment } from "@/types/proto/api/v1/attachment_service_pb";

interface AttachmentUrlOptions {
  original?: boolean;
}

const buildAttachmentFileUrl = (attachment: Attachment, options?: AttachmentUrlOptions) => {
  const url = new URL(`${window.location.origin}/file/${attachment.name}/${attachment.filename}`);
  if (options?.original) {
    url.searchParams.set("original", "1");
  }
  return url.toString();
};

export const getAttachmentUrl = (attachment: Attachment, options?: AttachmentUrlOptions) => {
  if (isImage(attachment.type)) {
    return buildAttachmentFileUrl(attachment, options);
  }

  if (attachment.externalLink) {
    return attachment.externalLink;
  }

  return buildAttachmentFileUrl(attachment, options);
};

export const getAttachmentThumbnailUrl = (attachment: Attachment) => {
  if (isImage(attachment.type)) {
    return buildAttachmentFileUrl(attachment);
  }

  if (attachment.externalLink) {
    return attachment.externalLink;
  }
  return buildAttachmentFileUrl(attachment);
};

export const getOriginalAttachmentUrl = (attachment: Attachment) => getAttachmentUrl(attachment, { original: true });
export const getAttachmentType = (attachment: Attachment) => {
  if (isImage(attachment.type)) {
    return "image/*";
  } else if (attachment.type.startsWith("video")) {
    return "video/*";
  } else if (attachment.type.startsWith("audio") && !isMidiFile(attachment.type)) {
    return "audio/*";
  } else if (attachment.type.startsWith("text")) {
    return "text/*";
  } else if (attachment.type.startsWith("application/epub+zip")) {
    return "application/epub+zip";
  } else if (attachment.type.startsWith("application/pdf")) {
    return "application/pdf";
  } else if (attachment.type.includes("word")) {
    return "application/msword";
  } else if (attachment.type.includes("excel")) {
    return "application/msexcel";
  } else if (attachment.type.startsWith("application/zip")) {
    return "application/zip";
  } else if (attachment.type.startsWith("application/x-java-archive")) {
    return "application/x-java-archive";
  } else {
    return "application/octet-stream";
  }
};

export const isAttachmentBlurred = (attachment: Attachment) => attachment.isBlurred;

export const withAttachmentBlurState = (attachment: Attachment, blurred: boolean): Attachment => ({
  ...attachment,
  isBlurred: blurred,
});

export const isImage = (t: string) => {
  return t.startsWith("image/") && !isPSD(t);
};

export const isMidiFile = (mimeType: string): boolean => {
  return mimeType === "audio/midi" || mimeType === "audio/mid" || mimeType === "audio/x-midi" || mimeType === "application/x-midi";
};

const isPSD = (t: string) => {
  return t === "image/vnd.adobe.photoshop" || t === "image/x-photoshop" || t === "image/photoshop";
};

