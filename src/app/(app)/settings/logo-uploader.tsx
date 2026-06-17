"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { uploadLogo, removeLogo } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(logoUrl);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadLogo(fd);
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Upload failed", description: res.error });
      setPreview(logoUrl);
      return;
    }
    toast({ variant: "success", title: "Logo updated" });
    router.refresh();
  }

  async function onRemove() {
    setBusy(true);
    const res = await removeLogo();
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Failed", description: res.error });
      return;
    }
    setPreview(null);
    toast({ variant: "success", title: "Logo removed" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand logo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? (
            <img src={preview} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Shown on invoices and the price list. PNG/JPG, square works best, under 2&nbsp;MB.
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
            />
            <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload logo"}
            </Button>
            {preview && (
              <Button type="button" variant="ghost" disabled={busy} onClick={onRemove}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
