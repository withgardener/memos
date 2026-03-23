import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/auth-state";
import { attachmentServiceClient } from "@/connect";
import { memoKeys } from "@/hooks/useMemoQueries";
import type { Attachment, ListAttachmentsRequest } from "@/types/proto/api/v1/attachment_service_pb";

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
      // Invalidate attachments list
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
      // Remove from cache
      queryClient.removeQueries({ queryKey: attachmentKeys.detail(name) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: attachmentKeys.lists() });
    },
  });
}

async function updateAttachmentBlurState(attachmentName: string, blurred: boolean) {
  const uid = attachmentName.replace(/^attachments\//, "");
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`/api/v1/attachments/${uid}/blur`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify({ blurred }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update attachment blur state";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        errorMessage = data.error;
      }
    } catch {
      // Keep the fallback error message.
    }
    throw new Error(errorMessage);
  }
}

export function useUpdateAttachmentBlur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachment, blurred }: { attachment: Attachment; blurred: boolean }) => {
      await updateAttachmentBlurState(attachment.name, blurred);
      return { attachment, blurred };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: memoKeys.all });
    },
  });
}
