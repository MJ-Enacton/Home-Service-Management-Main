"use client";

import type { BookingListItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewForm } from "./ReviewForm";

interface ReviewDialogProps {
  booking: BookingListItem | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => void;
}

/** Reusable rate + comment dialog. Mount once, control via `booking`. */
export function ReviewDialog({
  booking,
  pending,
  onClose,
  onSubmit,
}: ReviewDialogProps) {
  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate this service</DialogTitle>
          <DialogDescription>
            How was your experience? Your rating and comment help others.
          </DialogDescription>
        </DialogHeader>
        {booking && (
          <ReviewForm
            key={booking.id}
            bookingTitle={booking.listingTitle}
            bookingNumber={booking.bookingNumber}
            pending={pending}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
