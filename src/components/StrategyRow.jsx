import React, { useState, memo, useEffect } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';

const WEEKDAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'Th' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'Sa' },
  { key: 'sun', label: 'Su' },
];

const StrategyRow = memo(({
  row,
  idx,
  dteTab,
  PillDropdown,
  onUpdateRow,
  onToggleSelected,
  onToggleWeekday,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  // Local state for budget percentage to avoid fight-while-typing
  const [localBudgetPct, setLocalBudgetPct] = useState(String(row.budgetPct || 0));

  // Sync local state when row.budgetPct changes from parent (e.g., main slippage input)
  useEffect(() => {
    setLocalBudgetPct(String(row.budgetPct || 0));
  }, [row.budgetPct]);

  const qtyOptions = Array.from(
    new Set(['1', '2', '3', '4', '5', '10', String(row.qty)])
  );

  const handleBudgetBlur = () => {
    const parsed = Number(localBudgetPct) || 0;
    onUpdateRow(row.id, { budgetPct: parsed });
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex items-center gap-12 px-6 py-5 flex-wrap lg:flex-nowrap hover:bg-gray-50/60 transition-colors min-h-[72px]"
    >
      <button
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
        title="Drag to reorder"
        type="button"
      >
        <GripVertical size={18} />
      </button>

      <input
        type="checkbox"
        checked={row.selected}
        onChange={() => onToggleSelected(row.id)}
        className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
      />

      <div className="min-w-[10rem] mr-23">
        <p className="font-medium text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-500">
          {row.symbol} <span className="mx-1">•</span> {row.strategy_type}
        </p>
      </div>

      <div className="w-32 shrink-0">
        <PillDropdown
          value={String(row.qty)}
          onChange={(v) => onUpdateRow(row.id, { qty: Number(v) })}
          options={qtyOptions}
          className="w-full"
        />
      </div>

      {dteTab === 'Weekdays' && (
        <div className="flex-1 flex items-center justify-center gap-3 shrink-0 px-4 ml-6">
          {WEEKDAYS.map((d) => {
            const active = row.weekdays[d.key];
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => onToggleWeekday(row.id, d.key)}
                className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-blue-50 border-blue-400 text-blue-600'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      )}

      {dteTab === 'DTE' && (
        <div className="flex-1 flex justify-center">
          <PillDropdown
            value={String(row.selectedDTEs?.[0] ?? 0)}
            onChange={(v) => onUpdateRow(row.id, { selectedDTEs: [Number(v)] })}
            options={Array.from({ length: 81 }, (_, i) => String(i))}
            className="w-36 shrink-0"
          />
        </div>
      )}

      <div className="w-24 shrink-0 flex items-center gap-1.5">
        <input
          type="number"
          value={localBudgetPct}
          onChange={(e) => setLocalBudgetPct(e.target.value)}
          onBlur={handleBudgetBlur}
          className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 h-[38px]"
        />
        <span className="text-sm text-gray-500 flex items-center h-[38px]">%</span>
      </div>

      <button
        onClick={() => onDelete(row.id)}
        className="text-red-500 hover:text-red-700 transition-colors shrink-0"
        title="Delete this strategy"
        type="button"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
});

StrategyRow.displayName = 'StrategyRow';

export default StrategyRow;
