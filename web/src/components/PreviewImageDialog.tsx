import { Eye, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imgUrls: string[];
  initialIndex?: number;
  blurredStates?: boolean[];
}

function PreviewImageDialog({ open, onOpenChange, imgUrls, initialIndex = 0, blurredStates = [] }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [revealed, setRevealed] = useState(false);
  const t = useTranslate();

  // Update current index when initialIndex prop changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!open) {
      setRevealed(false);
      return;
    }
    setRevealed(false);
  }, [open, initialIndex]);

  useEffect(() => {
    if (open && currentIndex !== initialIndex) {
      setRevealed(false);
    }
  }, [open, currentIndex, initialIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      switch (event.key) {
        case "Escape":
          onOpenChange(false);
          break;
        case "ArrowRight":
          setCurrentIndex((prev) => Math.min(prev + 1, imgUrls.length - 1));
          break;
        case "ArrowLeft":
          setCurrentIndex((prev) => Math.max(prev - 1, 0));
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  // Return early if no images provided
  if (!imgUrls.length) return null;

  // Ensure currentIndex is within bounds
  const safeIndex = Math.max(0, Math.min(currentIndex, imgUrls.length - 1));
  const isBlurred = blurredStates[safeIndex] ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!w-[100vw] !h-[100vh] !max-w-[100vw] !max-h-[100vw] p-0 border-0 shadow-none bg-transparent [&>button]:hidden"
        aria-describedby="image-preview-description"
      >
        <VisuallyHidden>
          <DialogTitle>{t("memo.image-preview-title")}</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden>
          <DialogDescription>{t("memo.image-preview-description")}</DialogDescription>
        </VisuallyHidden>

        {/* Close button */}
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={handleClose}
            variant="secondary"
            size="icon"
            className="rounded-full bg-popover/20 hover:bg-popover/30 border-border/20 backdrop-blur-sm"
            aria-label="Close image preview"
          >
            <X className="h-4 w-4 text-popover-foreground" />
          </Button>
        </div>

        {/* Image container */}
        <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-auto" onClick={handleBackdropClick}>
          <div className="relative flex items-center justify-center">
            <img
              src={imgUrls[safeIndex]}
              alt={`Preview image ${safeIndex + 1} of ${imgUrls.length}`}
              className={cn("max-w-full max-h-full object-contain select-none", isBlurred && !revealed && "blur-[30px]")}
              draggable={false}
              loading="eager"
              decoding="async"
            />
            {isBlurred && !revealed && (
              <Button
                type="button"
                onClick={() => setRevealed(true)}
                variant="secondary"
                className="absolute bg-popover/80 hover:bg-popover/90 backdrop-blur-sm"
                aria-label={t("memo.show-image")}
              >
                <Eye className="h-4 w-4" />
                {t("memo.show-image")}
              </Button>
            )}
          </div>
        </div>

        {/* Screen reader description */}
        <div id="image-preview-description" className="sr-only">
          {t("memo.image-preview-description")}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PreviewImageDialog;
