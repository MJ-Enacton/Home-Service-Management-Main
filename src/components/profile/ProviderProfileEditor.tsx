"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";

import { saveProviderProfile } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

const MAX_AVATAR_MB = 2;

interface ProviderProfileEditorProps {
  initial: {
    bio: string;
    yearsExperience: number;
    serviceAreas: string[];
    hasAvatar: boolean;
    avatarVersion: number;
  };
}

export function ProviderProfileEditor({ initial }: ProviderProfileEditorProps) {
  const [isPending, startTransition] = useTransition();

  const [bio, setBio] = useState(initial.bio);
  const [years, setYears] = useState(String(initial.yearsExperience));
  const [areasString, setAreasString] = useState(
    initial.serviceAreas.join(", "),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAvatar, setPendingAvatar] = useState<{
    previewUrl: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  // Preview priority: newly picked > removed (blank) > stored avatar.
  const previewUrl = pendingAvatar
    ? pendingAvatar.previewUrl
    : removeAvatar || !initial.hasAvatar
      ? null
      : `/api/profile/avatar?v=${initial.avatarVersion}`;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.add({ title: "Please choose an image file.", type: "error" });
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.add({
        title: `Photo must be smaller than ${MAX_AVATAR_MB} MB.`,
        type: "error",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPendingAvatar({
        previewUrl: dataUrl,
        base64: dataUrl.split(",")[1] ?? "",
        mimeType: file.type,
      });
      setRemoveAvatar(false);
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const yearsNumber = Number.parseInt(years, 10);
    if (!Number.isFinite(yearsNumber) || yearsNumber < 0 || yearsNumber > 60) {
      toast.add({
        title: "Enter valid years of experience (0-60).",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const result = await saveProviderProfile({
        bio: bio.trim(),
        yearsExperience: yearsNumber,
        serviceAreas: areasString
          .split(",")
          .map((area) => area.trim())
          .filter(Boolean)
          .slice(0, 10),
        ...(pendingAvatar
          ? {
              avatar: {
                base64: pendingAvatar.base64,
                mimeType: pendingAvatar.mimeType,
              },
            }
          : {}),
        removeAvatar: removeAvatar && !pendingAvatar,
      });

      if (!result.success) {
        toast.add({ title: result.error, type: "error" });
        return;
      }
      toast.add({ title: "Professional profile saved", type: "success" });
      setPendingAvatar(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional profile</CardTitle>
        <CardDescription>
          Shown on your listings so customers know who they&apos;re hiring.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Photo */}
        <div className="flex items-center gap-4">
          {previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt="Your photo"
              className="size-16 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              ?
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="size-3.5" />
              Upload photo
            </Button>
            {(pendingAvatar || (initial.hasAvatar && !removeAvatar)) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPendingAvatar(null);
                  setRemoveAvatar(true);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">About you</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Experience, certifications, what makes your service great…"
            rows={4}
            maxLength={1000}
            className="bg-background"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="years">Years of experience</Label>
            <Input
              id="years"
              type="number"
              min={0}
              max={60}
              value={years}
              onChange={(event) => setYears(event.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="areas">Service areas (comma separated)</Label>
            <Input
              id="areas"
              value={areasString}
              onChange={(event) => setAreasString(event.target.value)}
              placeholder="Downtown, North Heights…"
              className="bg-background"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save profile
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
