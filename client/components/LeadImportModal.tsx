"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { commitLeadImport, previewLeadImport } from "@/lib/api";
import type { LeadImportCommitResult, LeadImportIssue, LeadImportPreview } from "@/types/lead";

type ImportStep = "upload" | "review" | "complete";

type LeadImportModalProps = {
  onClose: () => void;
  onImported: () => Promise<void>;
};

const csvHeaders = [
  "name",
  "email",
  "phone",
  "company",
  "status",
  "priority",
  "estimatedValue",
  "source",
  "lastContactedAt",
  "notes"
];

const exampleRow = [
  "Maya Shah",
  "maya@example.com",
  "+1 415 555 0199",
  "Acme Co",
  "New",
  "High",
  "42000",
  "Website",
  "2026-06-01",
  "Interested in replacing their current CRM."
];

function escapeCsvValue(value: string) {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function downloadTemplate() {
  const csv = [csvHeaders, exampleRow].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leadflow-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function issueLabel(issue: LeadImportIssue) {
  return `Line ${issue.line} - ${issue.field}`;
}

export function LeadImportModal({ onClose, onImported }: LeadImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LeadImportPreview | null>(null);
  const [commitResult, setCommitResult] = useState<LeadImportCommitResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: previewLeadImport,
    onSuccess: (result) => {
      setPreview(result);
      setStep("review");
      setLocalError(null);
    },
    onError: (error) => setLocalError(getErrorMessage(error))
  });

  const commitMutation = useMutation({
    mutationFn: commitLeadImport,
    onSuccess: async (result) => {
      setCommitResult(result);
      setStep("complete");
      await onImported();
    },
    onError: (error) => setLocalError(getErrorMessage(error))
  });

  const issuesByLine = useMemo(() => {
    if (!preview) return [];
    const grouped = new Map<number, LeadImportIssue[]>();
    preview.issues.forEach((issue) => {
      const current = grouped.get(issue.line) ?? [];
      current.push(issue);
      grouped.set(issue.line, current);
    });
    return [...grouped.entries()].slice(0, 8);
  }, [preview]);

  const resetUpload = () => {
    setStep("upload");
    setFileName("");
    setCsvText("");
    setPreview(null);
    setCommitResult(null);
    setLocalError(null);
  };

  const handleFileChange = async (file?: File) => {
    setPreview(null);
    setCommitResult(null);
    setLocalError(null);

    if (!file) {
      setFileName("");
      setCsvText("");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileName(file.name);
      setCsvText("");
      setLocalError("Upload a CSV file generated from the LeadFlow template.");
      return;
    }

    if (file.size > 5_000_000) {
      setFileName(file.name);
      setCsvText("");
      setLocalError("CSV file must be 5 MB or smaller.");
      return;
    }

    const text = await file.text();
    setFileName(file.name);
    setCsvText(text);
  };

  const handlePreview = () => {
    if (!csvText.trim()) {
      setLocalError("Choose a CSV file before previewing the import.");
      return;
    }
    previewMutation.mutate(csvText);
  };

  const handleCommit = () => {
    if (!preview?.canImport) {
      setLocalError("Fix the CSV errors and upload the file again before importing.");
      return;
    }
    commitMutation.mutate(csvText);
  };

  return (
    <div className="drawer-layer import-layer" role="presentation" onMouseDown={onClose}>
      <section className="import-modal" aria-label="Import leads" onMouseDown={(event) => event.stopPropagation()}>
        <header className="import-header">
          <div>
            <p>LeadFlow</p>
            <h2>Import leads</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close import" title="Close">
            <X size={18} />
          </button>
        </header>

        <div className="import-stepper" aria-label="Import progress">
          {[
            ["upload", "Upload file"],
            ["review", "Review results"],
            ["complete", "Confirmation"]
          ].map(([id, label], index) => {
            const isActive = step === id;
            const isDone = (["review", "complete"].includes(step) && index === 0) || (step === "complete" && index === 1);
            return (
              <div className={`import-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`} key={id}>
                <span>{index + 1}</span>
                <strong>{label}</strong>
              </div>
            );
          })}
        </div>

        {step === "upload" ? (
          <div className="import-panel">
            <div className="template-callout">
              <FileSpreadsheet size={28} />
              <div>
                <h3>CSV template</h3>
                <p>Accepted columns: name, email, phone, company, status, priority, estimatedValue, source, lastContactedAt, notes. Dates can use YYYY-MM-DD or DD/MM/YY.</p>
                <button className="text-button" type="button" onClick={downloadTemplate}>
                  <Download size={15} />
                  Download CSV template
                </button>
              </div>
            </div>

            <label className="file-drop">
              <Upload size={24} />
              <span>{fileName || "Choose CSV file"}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => void handleFileChange(event.target.files?.[0])}
              />
            </label>
          </div>
        ) : null}

        {step === "review" && preview ? (
          <div className="import-panel">
            <div className="import-summary">
              <article>
                <CheckCircle2 size={22} />
                <strong>Rows to be loaded</strong>
                <span>{preview.rowsLoaded}</span>
              </article>
              <article>
                <AlertTriangle size={22} />
                <strong>Rows with issues</strong>
                <span>{preview.rowsWithIssues}</span>
              </article>
              <article>
                <AlertTriangle size={22} />
                <strong>Warnings</strong>
                <span>{preview.warnings}</span>
              </article>
            </div>

            {preview.errors ? (
              <div className="import-blocker">
                <strong>{preview.errors} errors must be fixed before importing.</strong>
                <p>Update the CSV and upload it again. No records will be written until the file passes validation.</p>
              </div>
            ) : null}

            {issuesByLine.length ? (
              <div className="issue-list">
                {issuesByLine.map(([line, issues]) => (
                  <article key={line}>
                    <h3>Line {line}</h3>
                    {issues.map((issue, index) => (
                      <p className={`issue ${issue.severity}`} key={`${issue.line}-${issue.field}-${index}`}>
                        <span>{issue.severity === "error" ? "!" : "i"}</span>
                        {issueLabel(issue)}: {issue.message}
                      </p>
                    ))}
                  </article>
                ))}
              </div>
            ) : (
              <div className="import-ready">
                <CheckCircle2 size={22} />
                <span>File is ready to import.</span>
              </div>
            )}
          </div>
        ) : null}

        {step === "complete" && commitResult ? (
          <div className="import-panel import-confirmation">
            <CheckCircle2 size={32} />
            <div>
              <strong>{commitResult.inserted} rows inserted</strong>
              <span>{commitResult.warnings} warnings reviewed</span>
            </div>
          </div>
        ) : null}

        {localError ? <div className="form-error">{localError}</div> : null}

        <footer className="import-actions">
          <button className="button secondary" type="button" onClick={step === "upload" ? onClose : resetUpload}>
            {step === "upload" ? "Cancel" : "Previous"}
          </button>
          {step === "upload" ? (
            <button className="button primary" type="button" disabled={previewMutation.isPending} onClick={handlePreview}>
              {previewMutation.isPending ? "Checking..." : "Preview import"}
            </button>
          ) : null}
          {step === "review" ? (
            <button className="button primary" type="button" disabled={!preview?.canImport || commitMutation.isPending} onClick={handleCommit}>
              {commitMutation.isPending ? "Importing..." : "Import records"}
            </button>
          ) : null}
          {step === "complete" ? (
            <button className="button primary" type="button" onClick={onClose}>
              Finish
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
