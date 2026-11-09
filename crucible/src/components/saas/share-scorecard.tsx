"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareScorecardButton({ assignmentId }: { assignmentId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/scorecard/${assignmentId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Scorecard link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.message(url);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={copy}>
      {copied ? "Copied" : "Copy share link"}
    </Button>
  );
}
