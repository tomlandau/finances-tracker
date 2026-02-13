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

  // Group small items into "Others" category
  const groupSmallItems = (data: any[], threshold: number = 5) => {
    const large = data.filter(item => item.percentage >= threshold);
    const small = data.filter(item => item.percentage < threshold);

    if (small.length === 0) return data;
    if (small.length === 1) return data; // Don't group if there's only one small item

    const othersTotal = small.reduce((sum, item) => sum + item.value, 0);
    const othersPercentage = small.reduce((sum, item) => sum + item.percentage, 0);

    return [
      ...large,
      {
        name: 'אחרים',
        value: othersTotal,
        percentage: othersPercentage,
        color: '#94a3b8',
        items: small
      }
    ];
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

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center items-start content-start gap-x-4 gap-y-2 mt-4 h-[100px] overflow-hidden" dir="rtl">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.payload.color }}
            />
            <span className="text-sm">
              {entry.payload.name} ({entry.payload.percentage.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    );
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

    const rawDomainData = selectedOwnerData?.domainBreakdown.map((item, index) => ({
      name: item.domain,
      value: item.total,
      percentage: item.percentage,
      color: COLORS[index % COLORS.length]
    })) || [];

    const domainData = groupSmallItems(rawDomainData, 5);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Owner Pie Chart */}
        <div>
          <div className="flex items-center justify-center mb-4 h-[40px]">
            <h3 className="text-lg font-semibold text-center">פילוח הכנסות לפי בעלים</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={ownerData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => setSelectedOwner(data.name)}
                style={{ cursor: 'pointer' }}
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
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend payload={ownerData.map((item, index) => ({ payload: item }))} />

          {/* Owner Table */}
          <div className="mt-6">
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
          <div className="flex items-center justify-between mb-4 h-[40px]">
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
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={domainData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {domainData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <CustomLegend payload={domainData.map((item, index) => ({ payload: item }))} />

              {/* Domain Table */}
              <div className="mt-6">
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

    const rawDomainDataExpense = selectedBHData?.domainBreakdown.map((item, index) => ({
      name: item.domain,
      value: item.total,
      percentage: item.percentage,
      color: COLORS[index % COLORS.length]
    })) || [];

    const domainData = groupSmallItems(rawDomainDataExpense, 5);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BusinessHome Pie Chart */}
        <div>
          <div className="flex items-center justify-center mb-4 h-[40px]">
            <h3 className="text-lg font-semibold text-center">פילוח הוצאות לפי עסקי/בית</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={businessHomeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => setSelectedBusinessHome(data.name)}
                style={{ cursor: 'pointer' }}
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
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend payload={businessHomeData.map((item, index) => ({ payload: item }))} />

          {/* BusinessHome Table */}
          <div className="mt-6">
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
          <div className="flex items-center justify-between mb-4 h-[40px]">
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
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={domainData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {domainData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <CustomLegend payload={domainData.map((item, index) => ({ payload: item }))} />

              {/* Domain Table */}
              <div className="mt-6">
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
