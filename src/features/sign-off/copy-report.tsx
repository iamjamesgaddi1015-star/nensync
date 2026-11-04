"use client";
import { useRef, useState } from "react";
import { Button, Notice } from "@/components/primitives";
import { Icon } from "@/components/icons";
export function CopyReport({ text, label }: { text: string; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied. Paste it wherever you work.");
    } catch {
      ref.current?.focus();
      ref.current?.select();
      setStatus(
        "Copy is unavailable here. The report is selected; use your device’s Copy command.",
      );
    }
  }
  return (
    <div className="copy-report">
      <label className="field">
        <span className="sr-only">Report preview</span>
        <textarea
          ref={ref}
          className="report-preview"
          value={text}
          readOnly
          rows={10}
        />
      </label>
      <Button className="w-full" onClick={() => void copy()}>
        <Icon name="copy" />
        {label}
      </Button>
      {status && <Notice>{status}</Notice>}
    </div>
  );
}
