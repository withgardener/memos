import { Attachment } from "@/types/proto/api/v1/attachment_service_pb";

const ATTACHMENT_BLUR_FRAGMENT_KEY = "memos-blurred";

const getLocalAttachmentPath = (attachment: Attachment) => `/file/${attachment.name}/${attachment.filename}`;

const parseAttachmentUrl = (rawUrl: string) => new URL(rawUrl, window.location.origin);

const serializeAttachmentUrl = (originalUrl: string, parsedUrl: URL): string => {
  if (!originalUrl || originalUrl.startsWith("/")) {
    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  }

  return parsedUrl.toString();
};

export const getAttachmentUrl = (attachment: Attachment) => {
  if (attachment.externalLink) {
    return attachment.externalLink;
  }

  return `${window.location.origin}/file/${attachment.name}/${attachment.filename}`;
};

export const getAttachmentThumbnailUrl = (attachment: Attachment) => {
  // For S3 attachments, use the presigned URL directly.
  if (attachment.externalLink) {
    return attachment.externalLink;
  }
  return `${window.location.origin}/file/${attachment.name}/${attachment.filename}`;
};

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

export const isAttachmentBlurred = (attachment: Attachment) => {
  if (!attachment.externalLink) {
    return false;
  }

  try {
    const parsedUrl = parseAttachmentUrl(attachment.externalLink);
    const fragmentParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
    return fragmentParams.get(ATTACHMENT_BLUR_FRAGMENT_KEY) === "1";
  } catch {
    return false;
  }
};

export const withAttachmentBlurState = (attachment: Attachment, blurred: boolean): Attachment => {
  const originalUrl = attachment.externalLink || getLocalAttachmentPath(attachment);
  const parsedUrl = parseAttachmentUrl(originalUrl);
  const fragmentParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));

  if (blurred) {
    fragmentParams.set(ATTACHMENT_BLUR_FRAGMENT_KEY, "1");
  } else {
    fragmentParams.delete(ATTACHMENT_BLUR_FRAGMENT_KEY);
  }

  parsedUrl.hash = fragmentParams.toString();

  const isLocalAttachment =
    parsedUrl.origin === window.location.origin && parsedUrl.pathname === getLocalAttachmentPath(attachment) && !attachment.externalLink?.startsWith("http");

  return {
    ...attachment,
    externalLink: !blurred && isLocalAttachment ? "" : serializeAttachmentUrl(originalUrl, parsedUrl),
  };
};

// isImage returns true if the given mime type is an image.
export const isImage = (t: string) => {
  // Don't show PSDs as images.
  return t.startsWith("image/") && !isPSD(t);
};

// isMidiFile returns true if the given mime type is a MIDI file.
export const isMidiFile = (mimeType: string): boolean => {
  return mimeType === "audio/midi" || mimeType === "audio/mid" || mimeType === "audio/x-midi" || mimeType === "application/x-midi";
};

const isPSD = (t: string) => {
  return t === "image/vnd.adobe.photoshop" || t === "image/x-photoshop" || t === "image/photoshop";
};
