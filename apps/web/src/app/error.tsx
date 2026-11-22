"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber" /> This view could not load
        </CardTitle>
        <CardDescription>The rest of CellSweep is still available.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-lg border border-border bg-surface-muted p-3 font-mono text-[11px] text-muted">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={reset}>
            Try again
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
