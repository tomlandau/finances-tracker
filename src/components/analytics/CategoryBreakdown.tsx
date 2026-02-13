import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { CategorySummary } from '@/types/analytics.types';

interface CategoryBreakdownProps {
  incomeCategories: CategorySummary[];
  expenseCategories: CategorySummary[];
}

const COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
  '#d97706', '#65a30d', '#059669', '#0891b2', '#4f46e5'
];

export function CategoryBreakdown({ incomeCategories, expenseCategories }: CategoryBreakdownProps) {
  const [activeType, setActiveType] = useState<'income' | 'expense'>('expense');

  const categories = activeType === 'income' ? incomeCategories : expenseCategories;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    const xPos = x - 8; // 15 pixels from the left edge of the bar
    return (
      <text
        x={xPos}
        y={y + height / 2}
        fill="white"
        fontSize={13}
        fontWeight={500}
        textAnchor="start"
        dominantBaseline="middle"
      >
        {value}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">פילוח לפי קטגוריות</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveType('income')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeType === 'income'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            הכנסות
          </button>
          <button
            onClick={() => setActiveType('expense')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeType === 'expense'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            הוצאות
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          אין נתונים להצגה
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="mb-6 bg-gray-900 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={Math.max(400, categories.length * 50)}>
              <BarChart data={categories} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" reversed={true} />
                <YAxis type="category" hide={true} />
                <Tooltip
                  formatter={(value: number | undefined) => value ? formatAmount(value) : '-'}
                  labelFormatter={(label: any) => {
                    const category = categories.find((c, idx) => idx === label || c.categoryName === label);
                    return category?.categoryName || label;
                  }}
                  labelStyle={{ textAlign: 'right', direction: 'rtl' }}
                  contentStyle={{ direction: 'rtl' }}
                />
                <Bar dataKey="total" fill={activeType === 'income' ? '#16a34a' : '#dc2626'} barSize={40}>
                  {categories.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="categoryName"
                    content={renderLabel}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-right py-2 px-3 font-semibold">קטגוריה</th>
                  <th className="text-right py-2 px-3 font-semibold">סכום</th>
                  <th className="text-right py-2 px-3 font-semibold">אחוז</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={category.categoryId} className="border-b border-gray-200">
                    <td className="py-2 px-3 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {category.categoryName}
                    </td>
                    <td className={`py-2 px-3 font-medium ${activeType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(category.total)}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {category.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
