import React, { useState } from "react";
import { paginateRows, tableSummary } from "../utils/helpers";

export default function DataTable({
    title,
    columns,
    data,
    actions,
    searchPlaceholder = "Search...",
    onSearch,
    viewParams,
    onViewParamsChange,
    emptyMessage = "No records found",
    createButton,
    filters,
}) {
    const [internalSearch, setInternalSearch] = useState(
        viewParams ? viewParams.search : ""
    );

    const handleSearch = (e) => {
        const val = e.target.value;
        setInternalSearch(val);
        if (onSearch) {
            onSearch(val);
        } else if (onViewParamsChange && viewParams) {
            onViewParamsChange({ ...viewParams, search: val, page: 1 });
        }
    };

    const handlePage = (d) => {
        if (onViewParamsChange && viewParams) {
            onViewParamsChange({ ...viewParams, page: viewParams.page + d });
        }
    };

    // If using external pagination via viewParams, use those numbers.
    // Otherwise, use internal slicing (fallback).
    let displayData = data;
    let total = data.length;
    let page = 1;
    let pages = 1;

    if (viewParams && !onSearch) { // internal pagination
        const paginated = paginateRows(data, viewParams.page, viewParams.pageSize);
        displayData = paginated.rows;
        total = paginated.total;
        page = viewParams.page;
        pages = paginated.pages;
    }

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-lg flex flex-col mt-4">
            {/* Table Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-medium text-white tracking-wide">
                    {title}
                </h2>

                <div className="flex items-center gap-3">
                    {filters}
                    <div className="relative">
                        <svg
                            className="w-4 h-4 absolute left-3 top-2.5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={internalSearch}
                            onChange={handleSearch}
                            className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:ring-1 focus:ring-blue-500 w-64 shadow-inner"
                        />
                    </div>
                    {createButton}
                </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-900 text-gray-400 font-medium uppercase tracking-wider text-[11px]">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className="px-5 py-3 border-b border-gray-700">
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th className="px-5 py-3 border-b border-gray-700 text-right">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {displayData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="px-5 py-12 text-center text-gray-500 italic"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            displayData.map((row, i) => (
                                <tr
                                    key={row.id || i}
                                    className="hover:bg-gray-750 transition-colors"
                                >
                                    {columns.map((col, j) => (
                                        <td
                                            key={j}
                                            className={`px-5 py-3 text-gray-300 ${col.className || ""}`}
                                        >
                                            {col.render ? col.render(row) : row[col.field]}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-5 py-3 text-right">
                                            {actions(row)}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {viewParams && (
                <div className="bg-gray-900 px-5 py-3 border-t border-gray-700 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {tableSummary({ total, params: viewParams })}
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => handlePage(-1)}
                            className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= pages || pages === 0}
                            onClick={() => handlePage(1)}
                            className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
