import { z } from "zod";
import { leadRepository } from "../repositories/lead.repository.js";
import { AppError } from "../utils/errors.js";
import { createLeadSchema } from "./lead.schemas.js";
import { leadService } from "./lead.service.js";

const importBodySchema = z.object({
  csv: z.string().min(1, "CSV content is required.").max(5_000_000, "CSV file is too large.")
});

const templateColumns = [
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
] as const;

type ImportSeverity = "error" | "warning";
type ImportIssue = {
  line: number;
  field: string;
  severity: ImportSeverity;
  message: string;
  value?: string;
};

type ImportRow = {
  line: number;
  name?: string;
  email?: string;
  company?: string;
  status?: string;
  priority?: string;
  estimatedValue?: number;
  issues: ImportIssue[];
  data?: Record<string, unknown>;
};

type ParsedCsvRow = {
  line: number;
  cells: string[];
};

const headerAliases: Record<string, (typeof templateColumns)[number]> = {
  name: "name",
  lead: "name",
  leadname: "name",
  fullname: "name",
  email: "email",
  emailaddress: "email",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  company: "company",
  companyname: "company",
  status: "status",
  stage: "status",
  priority: "priority",
  estimatedvalue: "estimatedValue",
  value: "estimatedValue",
  dealvalue: "estimatedValue",
  source: "source",
  leadsource: "source",
  lastcontactedat: "lastContactedAt",
  lastcontacted: "lastContactedAt",
  notes: "notes",
  note: "notes"
};

const requiredColumns = ["name", "email", "phone", "company", "notes"] as const;

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsv(csv: string) {
  const rows: ParsedCsvRow[] = [];
  const issues: ImportIssue[] = [];
  let current = "";
  let cells: string[] = [];
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;

  const pushCell = () => {
    cells.push(current.trim());
    current = "";
  };

  const pushRow = () => {
    pushCell();
    rows.push({ line: rowStartLine, cells });
    cells = [];
    rowStartLine = line + 1;
  };

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      pushCell();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      pushRow();
      if (char === "\r" && next === "\n") index += 1;
      line += 1;
      continue;
    }

    if (char === "\n" || char === "\r") line += 1;
    current += char;
  }

  if (inQuotes) {
    issues.push({
      line: rowStartLine,
      field: "file",
      severity: "error",
      message: "A quoted CSV value is not closed."
    });
  }

  if (current || cells.length) pushRow();

  return { rows, issues };
}

function buildHeaderMap(headerRow: ParsedCsvRow) {
  const headerMap = new Map<(typeof templateColumns)[number], number>();
  const issues: ImportIssue[] = [];

  headerRow.cells.forEach((header, index) => {
    const key = headerAliases[normalizeHeader(header)];
    if (key && !headerMap.has(key)) headerMap.set(key, index);
  });

  requiredColumns.forEach((column) => {
    if (!headerMap.has(column)) {
      issues.push({
        line: headerRow.line,
        field: column,
        severity: "error",
        message: `Missing required CSV column: ${column}.`
      });
    }
  });

  return { headerMap, issues };
}

function getCell(row: ParsedCsvRow, headerMap: Map<(typeof templateColumns)[number], number>, column: (typeof templateColumns)[number]) {
  const index = headerMap.get(column);
  return index === undefined ? "" : row.cells[index]?.trim() ?? "";
}

function toImportCandidate(row: ParsedCsvRow, headerMap: Map<(typeof templateColumns)[number], number>) {
  const estimatedValue = getCell(row, headerMap, "estimatedValue");
  const lastContactedAt = getCell(row, headerMap, "lastContactedAt");
  const status = getCell(row, headerMap, "status");
  const priority = getCell(row, headerMap, "priority");

  return {
    name: getCell(row, headerMap, "name"),
    email: getCell(row, headerMap, "email"),
    phone: getCell(row, headerMap, "phone"),
    company: getCell(row, headerMap, "company"),
    status: status || undefined,
    priority: priority || undefined,
    estimatedValue: estimatedValue ? estimatedValue.replace(/[$,]/g, "") : undefined,
    source: getCell(row, headerMap, "source") || undefined,
    lastContactedAt: lastContactedAt || undefined,
    notes: getCell(row, headerMap, "notes")
  };
}

function toClientData(data: z.infer<typeof createLeadSchema>) {
  return {
    ...data,
    lastContactedAt: data.lastContactedAt?.toISOString()
  };
}

async function buildPreview(csv: string) {
  const parsed = parseCsv(csv);
  const [headerRow, ...dataRows] = parsed.rows;
  const allIssues = [...parsed.issues];

  if (!headerRow) {
    allIssues.push({
      line: 1,
      field: "file",
      severity: "error",
      message: "CSV file must include a header row."
    });
    return summarize([], allIssues);
  }

  const { headerMap, issues: headerIssues } = buildHeaderMap(headerRow);
  allIssues.push(...headerIssues);

  const rows: ImportRow[] = dataRows
    .filter((row) => row.cells.some((cell) => cell.trim()))
    .map((row) => {
      const candidate = toImportCandidate(row, headerMap);
      const rowIssues: ImportIssue[] = [];

      if (!candidate.status) {
        rowIssues.push({
          line: row.line,
          field: "status",
          severity: "warning",
          message: "Status is blank and will default to New."
        });
      }

      if (!candidate.priority) {
        rowIssues.push({
          line: row.line,
          field: "priority",
          severity: "warning",
          message: "Priority is blank and will default to Medium."
        });
      }

      if (!candidate.estimatedValue) {
        rowIssues.push({
          line: row.line,
          field: "estimatedValue",
          severity: "warning",
          message: "Estimated value is blank and will default to 0."
        });
      }

      const result = createLeadSchema.safeParse(candidate);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const field = String(issue.path[0] ?? "row");
          rowIssues.push({
            line: row.line,
            field,
            severity: "error",
            message: issue.message,
            value: String(candidate[field as keyof typeof candidate] ?? "")
          });
        });
      }

      return {
        line: row.line,
        name: candidate.name,
        email: candidate.email?.toLowerCase(),
        company: candidate.company,
        status: result.success ? result.data.status : candidate.status,
        priority: result.success ? result.data.priority : candidate.priority,
        estimatedValue: result.success ? result.data.estimatedValue : undefined,
        issues: rowIssues,
        data: result.success ? toClientData(result.data) : undefined
      };
    });

  if (!rows.length) {
    allIssues.push({
      line: 1,
      field: "file",
      severity: "error",
      message: "CSV file must include at least one lead row."
    });
  }

  const emailCounts = rows.reduce<Record<string, number>>((acc, row) => {
    if (row.email) acc[row.email] = (acc[row.email] ?? 0) + 1;
    return acc;
  }, {});

  rows.forEach((row) => {
    if (row.email && emailCounts[row.email] > 1) {
      row.issues.push({
        line: row.line,
        field: "email",
        severity: "error",
        message: "This email appears more than once in the uploaded CSV.",
        value: row.email
      });
    }
  });

  const candidateEmails = rows
    .filter((row) => row.email && row.data)
    .map((row) => row.email as string);
  const existingEmails = await leadRepository.findExistingEmails([...new Set(candidateEmails)]);

  rows.forEach((row) => {
    if (row.email && existingEmails.has(row.email)) {
      row.issues.push({
        line: row.line,
        field: "email",
        severity: "error",
        message: "A lead with this email already exists.",
        value: row.email
      });
    }
  });

  return summarize(rows, allIssues);
}

function summarize(rows: ImportRow[], globalIssues: ImportIssue[]) {
  const issues = [
    ...globalIssues,
    ...rows.flatMap((row) => row.issues)
  ].sort((a, b) => a.line - b.line);
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const rowsWithIssues = new Set(issues.map((issue) => issue.line)).size;
  const rowsLoaded = rows.filter((row) => row.data && !row.issues.some((issue) => issue.severity === "error")).length;

  return {
    rowsScanned: rows.length,
    rowsLoaded,
    rowsWithIssues,
    warnings,
    errors,
    canImport: rowsLoaded > 0 && errors === 0,
    issues,
    rows
  };
}

export const leadImportService = {
  templateColumns,

  async preview(payload: unknown) {
    const { csv } = importBodySchema.parse(payload);
    return buildPreview(csv);
  },

  async commit(payload: unknown) {
    const preview = await this.preview(payload);
    if (!preview.canImport) {
      throw new AppError(400, "IMPORT_VALIDATION_FAILED", "Fix CSV errors before importing.", preview);
    }

    const rowsToCreate = preview.rows
      .filter((row) => row.data && !row.issues.some((issue) => issue.severity === "error"))
      .map((row) => row.data as Record<string, unknown>);

    const created = [];
    for (const row of rowsToCreate) {
      created.push(await leadService.createLead(row));
    }

    return {
      inserted: created.length,
      rowsLoaded: preview.rowsLoaded,
      rowsWithIssues: preview.rowsWithIssues,
      warnings: preview.warnings,
      errors: 0
    };
  }
};
