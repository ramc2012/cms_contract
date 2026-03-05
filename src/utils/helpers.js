export function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
    }).format(new Date(value));
}

export function toInputDate(value) {
    if (!value) return "";
    return new Date(value).toISOString().split("T")[0];
}

export function slugToken(value, fallback = "NA") {
    if (!value) return fallback;
    return String(value)
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "")
        .trim();
}

export function matchesSearch(values, rawQuery) {
    const query = (rawQuery || "").trim().toLowerCase();
    if (!query) return true;
    return values.some((val) => val && String(val).toLowerCase().includes(query));
}

export function paginateRows(rows, page, pageSize) {
    const sorted = [...rows];
    const start = (page - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);
    return {
        rows: pageRows,
        total: rows.length,
        pages: Math.ceil(rows.length / pageSize),
    };
}

export function tableSummary(view) {
    if (view.total === 0) return "No records found";
    const start = (view.params.page - 1) * view.params.pageSize + 1;
    const end = Math.min(start + view.params.pageSize - 1, view.total);
    return `Showing ${start} to ${end} of ${view.total} rows`;
}
