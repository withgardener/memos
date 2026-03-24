import { create } from "@bufbuild/protobuf";
import { FieldMaskSchema } from "@bufbuild/protobuf/wkt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachmentServiceClient } from "@/connect";
import { memoKeys } from "@/hooks/useMemoQueries";
import type { Attachment, ListAttachmentsRequest } from "@/types/proto/api/v1/attachment_service_pb";
import { AttachmentSchema } from "@/types/proto/api/v1/attachment_service_pb";

// Query keys factory
export const attachmentKeys = {
  all: ["attachments"] as const,
  lists: () => [...attachmentKeys.all, "list"] as const,
  list: (filters?: Partial<ListAttachmentsRequest>) => [...attachmentKeys.lists(), filters] as const,
  details: () => [...attachmentKeys.all, "detail"] as const,
  detail: (name: string) => [...attachmentKeys.details(), name] as const,
};

// Hook to fetch attachments
export function useAttachments() {
  return useQuery({
    queryKey: attachmentKeys.lists(),
    queryFn: async () => {
      const { attachments } = await attachmentServiceClient.listAttachments({});
      return attachments;
    },
  });
}

// Hook to create/upload attachment
export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachment: Attachment) => {
      const result = await attachmentServiceClient.createAttachment({ attachment });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.lists() });
    },
  });
}

// Hook to delete attachment
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      await attachmentServiceClient.deleteAttachment({ name });
      return name;
    },
    onSuccess: (name) => {
      queryClient.removeQueries({ queryKey: attachmentKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: attachmentKeys.lists() });
    },
  });
}

export function useUpdateAttachmentBlur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachment, blurred }: { attachment: Attachment; blurred: boolean }) => {
      const updatedAttachment = await attachmentServiceClient.updateAttachment({
        attachment: create(AttachmentSchema, {
          name: attachment.name,
          isBlurred: blurred,
        }),
        updateMask: create(FieldMaskSchema, { paths: ["is_blurred"] }),
      });
      return updatedAttachment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: memoKeys.all });
    },
  });
}
