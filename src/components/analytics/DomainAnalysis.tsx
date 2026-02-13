import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { OwnerBreakdown, BusinessHomeBreakdown } from '@/types/analytics.types';

interface DomainAnalysisProps {
  incomeByOwner: OwnerBreakdown[];
  expenseByBusinessHome: BusinessHomeBreakdown[];
}

const COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
  '#d97706', '#65a30d', '#059669', '#0891b2', '#4f46e5'
];

export function DomainAnalysis({ incomeByOwner, expenseByBusinessHome }: DomainAnalysisProps) {
  const [activeType, setActiveType] = useState<'income' | 'expense'>('income');
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [selectedBusinessHome, setSelectedBusinessHome] = useState<string | null>(null);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg" dir="rtl">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm">{formatAmount(payload[0].value)}</p>
          <p className="text-xs text-gray-600">{payload[0].payload.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderIncomeAnalysis = () => {
    if (incomeByOwner.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          אין נתוני הכנסות להצגה
        </div>
      );
    }

    // First level: By owner
    const ownerData = incomeByOwner.map((item, index) => ({
      name: item.owner,
      value: item.total,
      percentage: item.percentage,
      color: COLORS[index % COLORS.length]
    }));

    // Second level: By domain (if owner is selected)
    const selectedOwnerData = selectedOwner
      ? incomeByOwner.find(o => o.owner === selectedOwner)
      : null;

    const domainData = selectedOwnerData?.domainBreakdown.map((item, index) => ({
      name: item.domain,
      value: item.total,
      percentage: item.percentage,
      color: COLORS[index % COLORS.length]
    })) || [];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Owner Pie Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-center">פילוח הכנסות לפי בעלים</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={ownerData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry: any) => `${entry.percentage.toFixed(0)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => setSelectedOwner(data.name)}
                style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                {ownerData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={selectedOwner === null || selectedOwner === entry.name ? 1 : 0.3}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ direction: 'rtl', fontSize: '14px' }}
                formatter={(_value, entry: any) => `${entry.payload.name} (${entry.payload.percentage.toFixed(0)}%)`}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Owner Table */}
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-right py-2 px-2 font-semibold">בעלים</th>
                  <th className="text-right py-2 px-2 font-semibold">סכום</th>
                  <th className="text-right py-2 px-2 font-semibold">אחוז</th>
                </tr>
              </thead>
              <tbody>
                {incomeByOwner.map((item, index) => (
                  <tr
                    key={item.owner}
                    className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      selectedOwner === item.owner ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedOwner(item.owner)}
                  >
                    <td className="py-2 px-2 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {item.owner}
                    </td>
                    <td className="py-2 px-2 text-green-600 font-medium">
                      {formatAmount(item.total)}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {item.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Domain Pie Chart */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {selectedOwner ? `פילוח תחומים - ${selectedOwner}` : 'פילוח תחומים'}
            </h3>
            {selectedOwner && (
              <button
                onClick={() => setSelectedOwner(null)}
                className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                נקה בחירה
              </button>
            )}
          </div>

          {selectedOwner && domainData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={domainData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry: any) => `${entry.percentage.toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    style={{ fontSize: '14px', fontWeight: 'bold' }}
                  >
                    {domainData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ direction: 'rtl', fontSize: '14px' }}
                    formatter={(_value, entry: any) => `${entry.payload.name} (${entry.payload.percentage.toFixed(0)}%)`}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Domain Table */}
              <div className="mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-right py-2 px-2 font-semibold">תחום</th>
                      <th className="text-right py-2 px-2 font-semibold">סכום</th>
                      <th className="text-right py-2 px-2 font-semibold">אחוז</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOwnerData?.domainBreakdown.map((item, index) => (
                      <tr key={item.domain} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-2 flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          {item.domain}
                        </td>
                        <td className="py-2 px-2 text-green-600 font-medium">
                          {formatAmount(item.total)}
                        </td>
                        <td className="py-2 px-2 text-gray-600">
                          {item.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {selectedOwner ? 'אין תחומים להצגה' : 'בחר בעלים כדי לראות פירוט תחומים'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExpenseAnalysis = () => {
    if (expenseByBusinessHome.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          אין נתוני הוצאות להצגה
        </div>
      );
    }

    // First level: By businessHome
    const businessHomeData = expenseByBusinessHome.map((item, index) => ({
      name: item.businessHome,
      value: item.total,
      percentage: item.percentage,
      color: COLORS[index % COLORS.length]
    }));

    // Second level: By domain (if businessHome is selected)
    const selectedBHData = selectedBusinessHome
      ? expenseByBusinessHome.find(bh => bh.businessHome === selectedBusinessHome)
      : null;

    const domainData = selectedBHData?.domainBreakdown.map((item, index) => ({
      name: item.domain,
      value: item.total,
      percentage: item.percentage,
      color: COLORS[index % COLORS.length]
    })) || [];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BusinessHome Pie Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-center">פילוח הוצאות לפי עסקי/בית</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={businessHomeData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry: any) => `${entry.percentage.toFixed(0)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => setSelectedBusinessHome(data.name)}
                style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                {businessHomeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={selectedBusinessHome === null || selectedBusinessHome === entry.name ? 1 : 0.3}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ direction: 'rtl', fontSize: '14px' }}
                formatter={(_value, entry: any) => `${entry.payload.name} (${entry.payload.percentage.toFixed(0)}%)`}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* BusinessHome Table */}
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-right py-2 px-2 font-semibold">סוג</th>
                  <th className="text-right py-2 px-2 font-semibold">סכום</th>
                  <th className="text-right py-2 px-2 font-semibold">אחוז</th>
                </tr>
              </thead>
              <tbody>
                {expenseByBusinessHome.map((item, index) => (
                  <tr
                    key={item.businessHome}
                    className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      selectedBusinessHome === item.businessHome ? 'bg-red-50' : ''
                    }`}
                    onClick={() => setSelectedBusinessHome(item.businessHome)}
                  >
                    <td className="py-2 px-2 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {item.businessHome}
                    </td>
                    <td className="py-2 px-2 text-red-600 font-medium">
                      {formatAmount(item.total)}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {item.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Domain Pie Chart */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {selectedBusinessHome ? `פילוח תחומים - ${selectedBusinessHome}` : 'פילוח תחומים'}
            </h3>
            {selectedBusinessHome && (
              <button
                onClick={() => setSelectedBusinessHome(null)}
                className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                נקה בחירה
              </button>
            )}
          </div>

          {selectedBusinessHome && domainData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={domainData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry: any) => `${entry.percentage.toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    style={{ fontSize: '14px', fontWeight: 'bold' }}
                  >
                    {domainData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ direction: 'rtl', fontSize: '14px' }}
                    formatter={(_value, entry: any) => `${entry.payload.name} (${entry.payload.percentage.toFixed(0)}%)`}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Domain Table */}
              <div className="mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-right py-2 px-2 font-semibold">תחום</th>
                      <th className="text-right py-2 px-2 font-semibold">סכום</th>
                      <th className="text-right py-2 px-2 font-semibold">אחוז</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBHData?.domainBreakdown.map((item, index) => (
                      <tr key={item.domain} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-2 flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          {item.domain}
                        </td>
                        <td className="py-2 px-2 text-red-600 font-medium">
                          {formatAmount(item.total)}
                        </td>
                        <td className="py-2 px-2 text-gray-600">
                          {item.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {selectedBusinessHome ? 'אין תחומים להצגה' : 'בחר סוג כדי לראות פירוט תחומים'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">ניתוח לפי תחומים</h2>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveType('income');
              setSelectedOwner(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeType === 'income'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            הכנסות
          </button>
          <button
            onClick={() => {
              setActiveType('expense');
              setSelectedBusinessHome(null);
            }}
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

      {activeType === 'income' ? renderIncomeAnalysis() : renderExpenseAnalysis()}
    </div>
  );
}
