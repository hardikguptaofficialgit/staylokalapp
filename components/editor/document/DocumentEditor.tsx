"use client";

import { useEffect, useState } from "react";

export default function DocumentEditor({ file }: { file: File }) {
  const [text, setText] = useState("");

  useEffect(() => {
    let active = true;
    if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
      void file.text().then((value) => {
        if (active) setText(value);
      });
    }
    return () => {
      active = false;
    };
  }, [file]);

  return (
    <section aria-label="Document editor" className="mb-8 space-y-3">
      <div className="rounded-xl border border-line bg-background p-4">
        <p className="eyebrow !text-[10px] text-muted">Local document preview</p>
        {text && (file.type === "text/plain" || /\.txt$/i.test(file.name)) ? (
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6 text-foreground">{text}</pre>
        ) : (
          <p className="mt-3 text-sm text-muted">
            DOCX text will be extracted locally and downloaded as a plain text file.
          </p>
        )}
      </div>
    </section>
  );
}
