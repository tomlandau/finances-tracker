import type { Transaction } from '@/types/history.types';

export function exportTransactionsToCSV(transactions: Transaction[], filename: string = 'transactions.csv') {
  // CSV Headers (in Hebrew)
  const headers = ['תאריך', 'סוג', 'קטגוריה', 'סכום', 'תיאור', 'מחזורי'];

  // Convert transactions to CSV rows
  const rows = transactions.map(t => [
    t.date,
    t.type === 'income' ? 'הכנסה' : 'הוצאה',
    t.categoryName,
    t.amount.toString(),
    t.description || '',
    t.isRecurring ? 'כן' : 'לא'
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Add BOM for proper Hebrew encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
