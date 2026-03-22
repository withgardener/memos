import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { handleError } from "@/lib/error";
import { uploadService } from "../services/uploadService";
import { useEditorContext } from "../state";

/**
 * Starts uploading local files to S3 as soon as they are added to the editor,
 * rather than waiting for the user to click "Publish". On success the file is
 * moved from `state.localFiles` into `state.metadata.attachments` so that
 * `memoService.save()` can reference it without re-uploading. On failure the
 * file is removed from the list and an error toast is shown.
 *
 * Cancellation: if the user removes a local file while its upload is still
 * in-flight the result is discarded and no attachment is added.
 */
export const useEagerUpload = () => {
  const { state, actions, dispatch } = useEditorContext();

  // URLs of files currently being uploaded.
  const uploadingUrls = useRef<Set<string>>(new Set());
  // URLs of files that the user removed while the upload was still in-flight.
  const cancelledUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Detect files that were removed by the user while an upload was in-flight.
    for (const url of uploadingUrls.current) {
      if (!state.localFiles.some((lf) => lf.previewUrl === url)) {
        cancelledUrls.current.add(url);
      }
    }

    // Only start uploads for files that are not already being uploaded.
    const newFiles = state.localFiles.filter((lf) => !uploadingUrls.current.has(lf.previewUrl));
    if (newFiles.length === 0) return;

    // Register ALL new files in uploadingUrls before starting any upload so
    // that the finally() guard (size === 0) cannot fire until every upload
    // in this batch has finished.
    for (const localFile of newFiles) {
      uploadingUrls.current.add(localFile.previewUrl);
    }

    dispatch(actions.setLoading("uploading", true));

    for (const localFile of newFiles) {
      uploadService
        .uploadFiles([localFile])
        .then((attachments) => {
          if (cancelledUrls.current.has(localFile.previewUrl)) return;
          dispatch(actions.removeLocalFile(localFile.previewUrl));
          for (const attachment of attachments) {
            dispatch(actions.addAttachment(attachment));
          }
        })
        .catch((error) => {
          if (!cancelledUrls.current.has(localFile.previewUrl)) {
            dispatch(actions.removeLocalFile(localFile.previewUrl));
            handleError(error, toast.error, { context: "Failed to upload file" });
          }
        })
        .finally(() => {
          cancelledUrls.current.delete(localFile.previewUrl);
          uploadingUrls.current.delete(localFile.previewUrl);
          if (uploadingUrls.current.size === 0) {
            dispatch(actions.setLoading("uploading", false));
          }
        });
    }
  }, [state.localFiles, dispatch, actions]);
};
