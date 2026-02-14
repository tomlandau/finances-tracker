import crypto from 'crypto';

/**
 * יצירת hash ייחודי לתנועה (למניעת כפילויות)
 * @param date - תאריך התנועה (YYYY-MM-DD)
 * @param amount - סכום התנועה
 * @param description - תיאור התנועה
 * @param source - מקור התנועה (שם החשבון/כרטיס)
 * @param userId - מזהה משתמש
 * @returns hash MD5
 */
export function generateTransactionHash(
  date: string,
  amount: number,
  description: string,
  source: string,
  userId: string
): string {
  const data = `${date}|${amount}|${description}|${source}|${userId}`;
  return crypto.createHash('md5').update(data, 'utf8').digest('hex');
}

/**
 * יצירת hash מתנועה מסוג Transaction
 * @param transaction - אובייקט תנועה
 * @returns hash MD5
 */
export function hashTransaction(transaction: {
  date: string;
  amount: number;
  description: string;
  source: string;
  userId: string;
}): string {
  return generateTransactionHash(
    transaction.date,
    transaction.amount,
    transaction.description,
    transaction.source,
    transaction.userId
  );
}
