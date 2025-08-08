"use client";

import React, { useState } from "react";
import { SectionKey, SECTION_LABELS } from "./ProfileSections";

const DEFAULT_LAYOUT: SectionKey[][] = [
  ["performance", "growth"],
  ["posts", "platforms"],
  ["N/A", "bio"],
];

interface SectionReorderProps {
  layout?: SectionKey[][];
  onLayoutChange: (newLayout: SectionKey[][]) => void;
}

export default function SectionReorder({
  layout = DEFAULT_LAYOUT,
  onLayoutChange,
}: SectionReorderProps) {
  const safeLayout =
    Array.isArray(layout) && layout.every((row) => Array.isArray(row))
      ? layout
      : DEFAULT_LAYOUT;
  const moveSection = (
    fromRow: number,
    fromCol: number,
    direction: "up" | "down" | "left" | "right",
  ) => {
    const newLayout = safeLayout.map((row) => [...row]);
    const section = newLayout[fromRow][fromCol];

    if (direction === "up" && fromRow > 0) {
      // Move to previous row, same column (or end if column doesn't exist)
      const targetCol = Math.min(fromCol, newLayout[fromRow - 1].length);
      newLayout[fromRow].splice(fromCol, 1);
      newLayout[fromRow - 1].splice(targetCol, 0, section);
      if (newLayout[fromRow].length === 0) {
        newLayout.splice(fromRow, 1);
      }
    } else if (direction === "down" && fromRow < newLayout.length - 1) {
      // Move to next row, same column (or end if column doesn't exist)
      const targetCol = Math.min(fromCol, newLayout[fromRow + 1].length);
      newLayout[fromRow].splice(fromCol, 1);
      newLayout[fromRow + 1].splice(targetCol, 0, section);
      if (newLayout[fromRow].length === 0) {
        newLayout.splice(fromRow, 1);
      }
    } else if (direction === "left" && fromCol > 0) {
      // Move left in same row
      newLayout[fromRow][fromCol] = newLayout[fromRow][fromCol - 1];
      newLayout[fromRow][fromCol - 1] = section;
    } else if (
      direction === "right" &&
      fromCol < newLayout[fromRow].length - 1
    ) {
      // Move right in same row
      newLayout[fromRow][fromCol] = newLayout[fromRow][fromCol + 1];
      newLayout[fromRow][fromCol + 1] = section;
    } else if (direction === "down" && fromRow === newLayout.length - 1) {
      // Create new row below
      newLayout[fromRow].splice(fromCol, 1);
      newLayout.push([section]);
      if (newLayout[fromRow].length === 0) {
        newLayout.splice(fromRow, 1);
      }
    } else if (direction === "up" && fromRow === 0) {
      // Create new row above
      newLayout[fromRow].splice(fromCol, 1);
      newLayout.unshift([section]);
      if (newLayout[fromRow + 1].length === 0) {
        newLayout.splice(fromRow + 1, 1);
      }
    }

    onLayoutChange(newLayout);
  };

  const addEmptySpace = (rowIndex: number) => {
    const newLayout = [...safeLayout];
    newLayout[rowIndex] = [...newLayout[rowIndex], "N/A"];
    onLayoutChange(newLayout);
  };

  const addNewRow = () => {
    const newLayout = [...safeLayout, ["N/A"]];
    onLayoutChange(newLayout);
  };

  const changeSectionType = (
    rowIndex: number,
    colIndex: number,
    newType: SectionKey,
  ) => {
    const newLayout = safeLayout.map((row) => [...row]);
    newLayout[rowIndex][colIndex] = newType;
    onLayoutChange(newLayout);
  };

  const removeSection = (rowIndex: number, colIndex: number) => {
    const newLayout = safeLayout.map((row) => [...row]);
    newLayout[rowIndex].splice(colIndex, 1);

    // Remove empty rows
    const filteredLayout = newLayout.filter((row) => row.length > 0);

    onLayoutChange(filteredLayout.length > 0 ? filteredLayout : [["N/A"]]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium text-gray-300">
          Layout Grid Editor
        </h4>
        <button
          type="button"
          onClick={addNewRow}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
        >
          Add Row
        </button>
        <button
          type="button"
          onClick={() =>
            onLayoutChange(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)))
          }
          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors ml-2"
        >
          Reset Layout
        </button>
      </div>

      {safeLayout.map((row, rowIndex) => (
        <div key={rowIndex} className="border border-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-400">Row {rowIndex + 1}</span>
            <button
              type="button"
              onClick={() => addEmptySpace(rowIndex)}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
            >
              Add Column
            </button>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
          >
            {row.map((section, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="bg-gray-700 rounded-md p-3 min-h-[80px] flex flex-col justify-between"
              >
                <div className="text-center">
                  <div className="text-sm font-medium text-white mb-2">
                    <select
                      value={section}
                      onChange={(e) =>
                        changeSectionType(
                          rowIndex,
                          colIndex,
                          e.target.value as SectionKey,
                        )
                      }
                      className="bg-gray-800 text-white text-xs p-1 rounded border border-gray-600"
                    >
                      {Object.entries(SECTION_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Movement Controls */}
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {/* Up */}
                    <div></div>
                    <button
                      type="button"
                      onClick={() => moveSection(rowIndex, colIndex, "up")}
                      className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-white transition-colors"
                      title="Move up"
                    >
                      <svg
                        className="w-3 h-3 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <div></div>

                    {/* Left, Remove, Right */}
                    <button
                      type="button"
                      onClick={() => moveSection(rowIndex, colIndex, "left")}
                      disabled={colIndex === 0}
                      className="p-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed rounded text-white transition-colors"
                      title="Move left"
                    >
                      <svg
                        className="w-3 h-3 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeSection(rowIndex, colIndex)}
                      className="p-1 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                      title="Remove"
                    >
                      <svg
                        className="w-3 h-3 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => moveSection(rowIndex, colIndex, "right")}
                      disabled={colIndex === row.length - 1}
                      className="p-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed rounded text-white transition-colors"
                      title="Move right"
                    >
                      <svg
                        className="w-3 h-3 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    {/* Down */}
                    <div></div>
                    <button
                      type="button"
                      onClick={() => moveSection(rowIndex, colIndex, "down")}
                      className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-white transition-colors"
                      title="Move down"
                    >
                      <svg
                        className="w-3 h-3 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-xs text-gray-400 mt-4">
        <p>• Use arrows to move sections within and between rows</p>
        <p>• Moving up/down from edges creates new rows</p>
        <p>• Remove button deletes sections (empty rows auto-removed)</p>
        <p>• Add Column creates empty space in current row</p>
      </div>
    </div>
  );
}
