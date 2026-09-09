"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRatingInput } from "./StarRatingInput";

interface ReviewFormProps {
  bookingTitle: string;
  bookingNumber: string;
  pending?: boolean;
  onSubmit: (rating: number, comment?: string) => void;
  onCancel: () => void;
}

const MAX_COMMENT = 1000;

/** Combined rating + comment form — rating required, comment optional. */
export function ReviewForm({
  bookingTitle,
  bookingNumber,
  pending = false,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = comment.trim();
  const showRatingError = touched && rating === 0;

  function handleSubmit() {
    setTouched(true);
    if (rating === 0 || pending) return;
    onSubmit(rating, trimmed || undefined);
  }

  return (
    <div className="space-y-4 py-2">
      <p className="text-center text-xs text-muted-foreground">
        {bookingTitle} · {bookingNumber}
      </p>

      <StarRatingInput
        value={rating}
        onChange={(value) => {
          setRating(value);
          setTouched(true);
        }}
        disabled={pending}
      />
      {showRatingError && (
        <p role="alert" className="text-center text-xs font-medium text-destructive">
          Please select a star rating.
        </p>
      )}

      <div className="space-y-1.5">
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Share details about your experience (optional)"
          rows={4}
          maxLength={MAX_COMMENT}
          disabled={pending}
          aria-label="Review comment"
        />
        <p className="text-right text-[11px] tabular-nums text-muted-foreground">
          {comment.length}/{MAX_COMMENT}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={pending || rating === 0}
        >
          {pending ? "Submitting…" : "Submit Review"}
        </Button>
      </div>
    </div>
  );
}
