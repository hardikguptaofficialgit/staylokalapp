"use client";

import { FilePdf } from "@phosphor-icons/react";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";
import { useEffect, useState } from "react";

type PdfFormEditorProps = {
  file?: File;
  processing: boolean;
  onProcess: (options: Record<string, string>) => void;
};

type FormField = { name: string; type: "text" | "date" | "checkbox" | "select"; options?: string[] };

export default function PdfFormEditor({ file, processing, onProcess }: PdfFormEditorProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [message, setMessage] = useState("Inspecting form fields…");

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!file) return;
      try {
        const document = await PDFDocument.load(await file.arrayBuffer());
              const formFields: FormField[] = document.getForm().getFields().flatMap((field): FormField[] => {
                const name = field.getName();
                if (field instanceof PDFCheckBox) return [{ name, type: "checkbox" as const }];
                if (field instanceof PDFDropdown) return [{ name, type: "select" as const, options: field.getOptions() }];
                if (field instanceof PDFOptionList) return [{ name, type: "select" as const, options: field.getOptions() }];
                if (field instanceof PDFRadioGroup) return [{ name, type: "select" as const, options: field.getOptions() }];
                if (field instanceof PDFTextField) return [{ name, type: /date/i.test(name) ? "date" as const : "text" as const }];
                return [];
              });
        if (active) {
                setFields(formFields);
                setValues(Object.fromEntries(formFields.map(({ name, type }) => [name, type === "checkbox" ? false : ""])));
                setMessage(formFields.length ? "Fill the editable fields below. Date fields use your local date format." : "No editable form fields were found in this PDF.");
        }
      } catch {
        if (active) setMessage("This PDF form could not be read locally.");
      }
    })();
    return () => { active = false; };
  }, [file]);

  return (
    <section className="pdf-advanced-editor pdf-form-editor" aria-label="Fill PDF form">
      <div className="pdf-advanced-icon"><FilePdf size={26} aria-hidden="true" /></div>
      <div className="pdf-form-editor-content">
        <p className="eyebrow">PDF form</p>
        <h4>Fill PDF form</h4>
        <p>{message}</p>
        {fields.length > 0 && (
          <div className="pdf-form-fields">
                  {fields.map(({ name, type, options }) => (
              <label key={name}>
                <span>{name}</span>
                      {type === "checkbox" ? (
                        <input type="checkbox" checked={Boolean(values[name])} onChange={(event) => setValues({ ...values, [name]: event.target.checked })} disabled={processing} />
                      ) : options ? (
                        <select value={String(values[name] ?? "")} onChange={(event) => setValues({ ...values, [name]: event.target.value })} disabled={processing}>
                          <option value="">Choose…</option>
                          {options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input type={type === "date" ? "date" : "text"} value={String(values[name] ?? "")} onChange={(event) => setValues({ ...values, [name]: event.target.value })} disabled={processing} />
                      )}
              </label>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="action-button" onClick={() => onProcess({ formValues: JSON.stringify(values) })} disabled={processing || fields.length === 0}>
        <FilePdf size={17} /> {processing ? "Saving..." : "Save filled form"}
      </button>
    </section>
  );
}
