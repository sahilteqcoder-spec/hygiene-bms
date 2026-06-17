"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(logoUrl);

  // Upload straight to Supabase Storage from the browser (avoids the ~1 MB
  // Server Action body limit), then persist the public URL to settings.
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Only image files are allowed" });
      return;
    }
    if (file.size > 2_000_000) {
      toast({ variant: "destructive", title: "Image must be under 2 MB" });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `logo-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("business_settings")
        .update({ logo_url: pub.publicUrl })
        .eq("id", true);
      if (updErr) throw updErr;

      toast({ variant: "success", title: "Logo updated" });
      router.refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Upload failed", description: (err as Error).message });
      setPreview(logoUrl);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("business_settings").update({ logo_url: null }).eq("id", true);
      if (error) throw error;
      setPreview(null);
      toast({ variant: "success", title: "Logo removed" });
      router.refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
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
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
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
