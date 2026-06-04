import React from "react";
import { Search, Filter, ChevronUp, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "select";
  filterOptions?: { value: string; label: string }[];
}

export interface SortConfig<T> {
  key: keyof T | null;
  direction: "asc" | "desc" | null;
}

export interface FilterConfig {
  [key: string]: string | string[];
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

interface Props<T> {
  columns: Column<T>[];
  sortConfig: SortConfig<T>;
  onSort: (key: keyof T) => void;
  filterConfig: FilterConfig;
  onFilterChange: (key: string, value: string | string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  pagination: PaginationConfig;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  showSearch?: boolean;
  showFilter?: boolean;
}

export default function TableControls<T>({
  columns,
  sortConfig,
  onSort,
  filterConfig,
  onFilterChange,
  searchQuery,
  onSearchChange,
  pagination,
  onPageChange,
  onPageSizeChange,
  showSearch = true,
  showFilter = true,
}: Props<T>) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const pageSizes = [10, 25, 50, 100];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
      {/* Search and Filter Row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {showSearch && (
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              className="form-input"
              style={{ paddingLeft: 32, width: "100%" }}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {showFilter && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {columns
              .filter((col) => col.filterable)
              .map((col) => (
                <div key={String(col.key)} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Filter size={14} style={{ color: "var(--text-muted)" }} />
                  {col.filterType === "select" && col.filterOptions ? (
                    <select
                      className="form-select"
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={filterConfig[String(col.key)] || ""}
                      onChange={(e) => onFilterChange(String(col.key), e.target.value)}
                    >
                      <option value="">All {col.label}</option>
                      {col.filterOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      style={{ fontSize: "0.85rem", padding: "6px 10px", width: 120 }}
                      placeholder={`Filter ${col.label}`}
                      value={filterConfig[String(col.key)] || ""}
                      onChange={(e) => onFilterChange(String(col.key), e.target.value)}
                    />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Sort Indicators and Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <span>Sort by:</span>
          {columns
            .filter((col) => col.sortable)
            .map((col) => (
              <button
                key={String(col.key)}
                className="btn btn-ghost btn-sm"
                onClick={() => onSort(col.key)}
                style={{
                  fontSize: "0.8rem",
                  padding: "4px 8px",
                  background: sortConfig.key === col.key ? "var(--bg)" : "transparent",
                  borderColor: sortConfig.key === col.key ? "var(--border)" : "transparent",
                }}
              >
                {col.label}
                {sortConfig.key === col.key && (
                  sortConfig.direction === "asc" ? (
                    <ChevronUp size={12} style={{ marginLeft: 4 }} />
                  ) : sortConfig.direction === "desc" ? (
                    <ChevronDown size={12} style={{ marginLeft: 4 }} />
                  ) : null
                )}
                {sortConfig.key !== col.key && <ArrowUpDown size={12} style={{ marginLeft: 4, opacity: 0.5 }} />}
              </button>
            ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            className="form-select"
            style={{ fontSize: "0.85rem", padding: "6px 10px" }}
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{ padding: "6px 10px" }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", minWidth: 80, textAlign: "center" }}>
              {pagination.page} / {totalPages || 1}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              style={{ padding: "6px 10px" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Total: {pagination.total}
          </span>
        </div>
      </div>
    </div>
  );
}
