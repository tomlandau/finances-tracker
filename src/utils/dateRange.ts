const pad = (n: number) => String(n).padStart(2, '0');

export function getMonthDateRange(selectedMonth: string): [string, string] {
  const [year, month] = selectedMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return [
    `${year}-${pad(month)}-01`,
    `${year}-${pad(month)}-${pad(lastDay)}`,
  ];
}
