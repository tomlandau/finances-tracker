import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Airtable from 'airtable';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Load environment variables
config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// Import API handlers
const categoriesHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get type from query param (default: 'income' for backwards compatibility)
    const type = req.query.type || 'income';

    // Validation
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "income" or "expense"' });
    }

    // Select correct table based on type
    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_CATEGORIES_TABLE
      : process.env.AIRTABLE_EXPENSE_CATEGORIES_TABLE;

    // Select correct field names based on type
    const nameField = type === 'income'
      ? process.env.AIRTABLE_CATEGORY_NAME_FIELD
      : process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_FIELD;

    const statusField = type === 'income'
      ? process.env.AIRTABLE_CATEGORY_STATUS_FIELD
      : process.env.AIRTABLE_EXPENSE_CATEGORY_STATUS_FIELD;

    // Lookup field names based on type
    let ownerField, domainField, businessHomeField, expenseTypeField, renewalDateField;

    if (type === 'income') {
      ownerField = process.env.AIRTABLE_CATEGORY_OWNER_FIELD;
      domainField = process.env.AIRTABLE_CATEGORY_DOMAIN_FIELD;
    } else {
      businessHomeField = process.env.AIRTABLE_EXPENSE_BUSINESS_HOME_FIELD;
      domainField = process.env.AIRTABLE_EXPENSE_DOMAIN_FIELD;
      expenseTypeField = process.env.AIRTABLE_EXPENSE_TYPE_FIELD;
      renewalDateField = process.env.AIRTABLE_EXPENSE_RENEWAL_DATE_FIELD;
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const table = base(tableName);

    // Fetch categories with status = "פעיל"
    const records = await table
      .select({
        filterByFormula: `{${statusField}} = "פעיל"`,
        sort: [{ field: nameField, direction: 'asc' }]
      })
      .all();

    console.log('Records found:', records.length);

    // Helper to normalize field values (handle both string and array)
    const normalizeField = (value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value.join(', ');
      return value;
    };

    const categories = records.map(record => {
      const base = {
        id: record.id,
        name: record.get(nameField),
        active: true
      };

      if (type === 'income') {
        return {
          ...base,
          owner: normalizeField(ownerField ? record.get(ownerField) : undefined),
          domain: normalizeField(domainField ? record.get(domainField) : undefined),
        };
      } else {
        return {
          ...base,
          businessHome: normalizeField(businessHomeField ? record.get(businessHomeField) : undefined),
          domain: normalizeField(domainField ? record.get(domainField) : undefined),
          expenseType: normalizeField(expenseTypeField ? record.get(expenseTypeField) : undefined),
          renewalDate: normalizeField(renewalDateField ? record.get(renewalDateField) : undefined),
        };
      }
    });

    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

const incomeHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, categoryId, date, vat, vatType, description, isRecurring } = req.body;

    console.log('=== Income Submission Debug ===');
    console.log('Request body:', req.body);
    console.log('Environment variables:');
    console.log('  AIRTABLE_INCOME_TABLE:', process.env.AIRTABLE_INCOME_TABLE);
    console.log('  AIRTABLE_INCOME_DATE_FIELD:', process.env.AIRTABLE_INCOME_DATE_FIELD);
    console.log('  AIRTABLE_INCOME_CATEGORY_FIELD:', process.env.AIRTABLE_INCOME_CATEGORY_FIELD);
    console.log('  AIRTABLE_INCOME_AMOUNT_FIELD:', process.env.AIRTABLE_INCOME_AMOUNT_FIELD);
    console.log('  AIRTABLE_INCOME_VAT_FIELD:', process.env.AIRTABLE_INCOME_VAT_FIELD);
    console.log('  AIRTABLE_INCOME_VAT_TYPE_FIELD:', process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD);
    console.log('  AIRTABLE_INCOME_DESCRIPTION_FIELD:', process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD);

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    if (!vat) {
      return res.status(400).json({ error: 'Invalid VAT rate' });
    }
    if (!vatType) {
      return res.status(400).json({ error: 'Invalid VAT type' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const table = base(process.env.AIRTABLE_INCOME_TABLE);

    const recordData = {
      [process.env.AIRTABLE_INCOME_DATE_FIELD]: date,
      [process.env.AIRTABLE_INCOME_CATEGORY_FIELD]: [categoryId],
      [process.env.AIRTABLE_INCOME_AMOUNT_FIELD]: amount,
      [process.env.AIRTABLE_INCOME_VAT_FIELD]: vat,
      [process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD]: vatType,
      ...(description && { [process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD]: description }),
      ...(isRecurring !== undefined && { [process.env.AIRTABLE_INCOME_RECURRING_FIELD]: isRecurring })
    };

    console.log('Creating record with data:', recordData);

    const record = await table.create(recordData);

    console.log('Record created successfully:', record.id);

    // Log audit event
    await logAuditEvent({
      userId: req.user.userId,
      username: req.user.username,
      action: 'create',
      resource: 'income',
      success: true,
      ip: getClientIp(req),
      details: { recordId: record.id, amount, categoryId, date }
    });

    return res.status(201).json({
      success: true,
      id: record.id
    });
  } catch (error) {
    console.error('Error creating income entry:', error);
    return res.status(500).json({
      error: 'Failed to create income entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

const expenseHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, categoryId, date, description, isRecurring } = req.body;

    console.log('=== Expense Submission Debug ===');
    console.log('Request body:', req.body);

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const table = base(process.env.AIRTABLE_EXPENSE_TABLE);

    const recordData = {
      [process.env.AIRTABLE_EXPENSE_DATE_FIELD]: date,
      [process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD]: [categoryId],
      [process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD]: amount,
      ...(description && { [process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD]: description }),
      ...(isRecurring !== undefined && { [process.env.AIRTABLE_EXPENSE_RECURRING_FIELD]: isRecurring })
    };

    console.log('Creating expense record with data:', recordData);

    const record = await table.create(recordData);

    console.log('Expense record created successfully:', record.id);

    // Log audit event
    await logAuditEvent({
      userId: req.user.userId,
      username: req.user.username,
      action: 'create',
      resource: 'expense',
      success: true,
      ip: getClientIp(req),
      details: { recordId: record.id, amount, categoryId, date }
    });

    return res.status(201).json({
      success: true,
      id: record.id
    });
  } catch (error) {
    console.error('Error creating expense entry:', error);
    return res.status(500).json({
      error: 'Failed to create expense entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

const recentHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const type = req.query.type || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 20, 10000);
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const categoryId = req.query.categoryId;

    if (!['all', 'income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "all", "income", or "expense"' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const buildFilterFormula = (dateField, categoryField) => {
      const conditions = [];
      // Date range filters (inclusive)
      if (startDate) {
        conditions.push(`{${dateField}} >= '${startDate}'`);
      }
      if (endDate) {
        conditions.push(`{${dateField}} <= '${endDate}'`);
      }
      if (categoryId) {
        conditions.push(`FIND('${categoryId}', ARRAYJOIN({${categoryField}}))`);
      }
      return conditions.length > 0 ? `AND(${conditions.join(', ')})` : '';
    };

    const normalizeField = (value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    };

    const getNumberField = (record, fieldName) => {
      if (!fieldName) return undefined;
      const value = record.get(fieldName);
      return value ? Number(value) : undefined;
    };

    const transactions = [];

    if (type === 'all' || type === 'income') {
      const incomeTable = base(process.env.AIRTABLE_INCOME_TABLE);
      const incomeFilter = buildFilterFormula(
        process.env.AIRTABLE_INCOME_DATE_FIELD,
        process.env.AIRTABLE_INCOME_CATEGORY_FIELD
      );

      const incomeRecords = await incomeTable
        .select({
          ...(incomeFilter && { filterByFormula: incomeFilter }),
          sort: [{ field: process.env.AIRTABLE_INCOME_DATE_FIELD, direction: 'desc' }],
          maxRecords: type === 'income' ? limit : limit * 2
        })
        .all();

      for (const record of incomeRecords) {
        const categoryIdArray = record.get(process.env.AIRTABLE_INCOME_CATEGORY_FIELD);
        const categoryNameArray = record.get(process.env.AIRTABLE_INCOME_CATEGORY_NAME_LOOKUP);

        transactions.push({
          id: record.id,
          type: 'income',
          date: record.get(process.env.AIRTABLE_INCOME_DATE_FIELD),
          amount: Number(record.get(process.env.AIRTABLE_INCOME_AMOUNT_FIELD)),
          categoryId: Array.isArray(categoryIdArray) ? categoryIdArray[0] : categoryIdArray,
          categoryName: Array.isArray(categoryNameArray) ? categoryNameArray[0] : categoryNameArray || 'לא ידוע',
          vat: record.get(process.env.AIRTABLE_INCOME_VAT_FIELD),
          vatType: record.get(process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD),
          description: normalizeField(record.get(process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD)),
          isRecurring: record.get(process.env.AIRTABLE_INCOME_RECURRING_FIELD),
          netAmount: getNumberField(record, process.env.AIRTABLE_INCOME_NET_FIELD),
          vatAmount: getNumberField(record, process.env.AIRTABLE_INCOME_VAT_AMOUNT_FIELD),
          grossAmount: getNumberField(record, process.env.AIRTABLE_INCOME_GROSS_FIELD)
        });
      }
    }

    if (type === 'all' || type === 'expense') {
      const expenseTable = base(process.env.AIRTABLE_EXPENSE_TABLE);
      const expenseFilter = buildFilterFormula(
        process.env.AIRTABLE_EXPENSE_DATE_FIELD,
        process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD
      );

      const expenseRecords = await expenseTable
        .select({
          ...(expenseFilter && { filterByFormula: expenseFilter }),
          sort: [{ field: process.env.AIRTABLE_EXPENSE_DATE_FIELD, direction: 'desc' }],
          maxRecords: type === 'expense' ? limit : limit * 2
        })
        .all();

      for (const record of expenseRecords) {
        const categoryIdArray = record.get(process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD);
        const categoryNameArray = record.get(process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_LOOKUP);

        transactions.push({
          id: record.id,
          type: 'expense',
          date: record.get(process.env.AIRTABLE_EXPENSE_DATE_FIELD),
          amount: Number(record.get(process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD)),
          categoryId: Array.isArray(categoryIdArray) ? categoryIdArray[0] : categoryIdArray,
          categoryName: Array.isArray(categoryNameArray) ? categoryNameArray[0] : categoryNameArray || 'לא ידוע',
          vat: record.get(process.env.AIRTABLE_EXPENSE_VAT_FIELD),
          vatType: record.get(process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD),
          description: normalizeField(record.get(process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD)),
          isRecurring: record.get(process.env.AIRTABLE_EXPENSE_RECURRING_FIELD),
          netAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_NET_FIELD),
          vatAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_VAT_AMOUNT_FIELD),
          grossAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_GROSS_FIELD)
        });
      }
    }

    const sortedTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return res.status(200).json({ transactions: sortedTransactions });
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    return res.status(500).json({
      error: 'Failed to fetch recent transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

const updateHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, type, fields } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "income" or "expense"' });
    }
    if (!fields || Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_TABLE
      : process.env.AIRTABLE_EXPENSE_TABLE;

    const dateField = type === 'income'
      ? process.env.AIRTABLE_INCOME_DATE_FIELD
      : process.env.AIRTABLE_EXPENSE_DATE_FIELD;

    const categoryField = type === 'income'
      ? process.env.AIRTABLE_INCOME_CATEGORY_FIELD
      : process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD;

    const amountField = type === 'income'
      ? process.env.AIRTABLE_INCOME_AMOUNT_FIELD
      : process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD;

    const vatField = type === 'income'
      ? process.env.AIRTABLE_INCOME_VAT_FIELD
      : process.env.AIRTABLE_EXPENSE_VAT_FIELD;

    const vatTypeField = type === 'income'
      ? process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD
      : process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD;

    const descriptionField = type === 'income'
      ? process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD
      : process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD;

    const recurringField = type === 'income'
      ? process.env.AIRTABLE_INCOME_RECURRING_FIELD
      : process.env.AIRTABLE_EXPENSE_RECURRING_FIELD;

    const table = base(tableName);

    const updateFields = {};

    if (fields.date !== undefined) {
      updateFields[dateField] = fields.date;
    }
    if (fields.categoryId !== undefined) {
      updateFields[categoryField] = [fields.categoryId];
    }
    if (fields.amount !== undefined) {
      updateFields[amountField] = fields.amount;
    }
    // VAT fields only for income
    if (type === 'income') {
      if (fields.vat !== undefined) {
        updateFields[vatField] = fields.vat;
      }
      if (fields.vatType !== undefined) {
        updateFields[vatTypeField] = fields.vatType;
      }
    }
    if (fields.description !== undefined) {
      updateFields[descriptionField] = fields.description;
    }
    if (fields.isRecurring !== undefined) {
      updateFields[recurringField] = fields.isRecurring;
    }

    const record = await table.update(id, updateFields);

    // Log audit event
    await logAuditEvent({
      userId: req.user.userId,
      username: req.user.username,
      action: 'update',
      resource: type === 'income' ? 'income' : 'expense',
      success: true,
      ip: getClientIp(req),
      details: { recordId: record.id, type, fields }
    });

    return res.status(200).json({
      success: true,
      id: record.id
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({
      error: 'Failed to update transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

const deleteHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, type } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "income" or "expense"' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_TABLE
      : process.env.AIRTABLE_EXPENSE_TABLE;

    const table = base(tableName);

    await table.destroy(id);

    // Log audit event
    await logAuditEvent({
      userId: req.user.userId,
      username: req.user.username,
      action: 'delete',
      resource: type === 'income' ? 'income' : 'expense',
      success: true,
      ip: getClientIp(req),
      details: { recordId: id, type }
    });

    return res.status(200).json({
      success: true,
      id: id
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({
      error: 'Failed to delete transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================
// Auth Middleware
// ============================================

function withAuth(handler) {
  return async (req, res) => {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.accessToken;

      if (!token) {
        return res.status(401).json({
          error: 'Unauthorized - No token provided',
          code: 'NO_TOKEN'
        });
      }

      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        userId: decoded.userId,
        username: decoded.username
      };

      return handler(req, res);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}

// ============================================
// Auth Utility Functions
// ============================================

function getUserByUsername(username) {
  if (username === process.env.AUTH_USER_TOM_USERNAME) {
    return {
      id: process.env.AUTH_USER_TOM_ID,
      username: process.env.AUTH_USER_TOM_USERNAME,
      passwordHash: process.env.AUTH_USER_TOM_PASSWORD_HASH,
      totpSecret: process.env.AUTH_USER_TOM_TOTP_SECRET
    };
  }
  if (username === process.env.AUTH_USER_YAEL_USERNAME) {
    return {
      id: process.env.AUTH_USER_YAEL_ID,
      username: process.env.AUTH_USER_YAEL_USERNAME,
      passwordHash: process.env.AUTH_USER_YAEL_PASSWORD_HASH,
      totpSecret: process.env.AUTH_USER_YAEL_TOTP_SECRET
    };
  }
  return null;
}

function getUsernameById(userId) {
  if (userId === process.env.AUTH_USER_TOM_ID) {
    return process.env.AUTH_USER_TOM_USERNAME;
  }
  if (userId === process.env.AUTH_USER_YAEL_ID) {
    return process.env.AUTH_USER_YAEL_USERNAME;
  }
  return 'unknown';
}

function getUserHas2FA(userId) {
  if (userId === process.env.AUTH_USER_TOM_ID) {
    return !!process.env.AUTH_USER_TOM_TOTP_SECRET;
  }
  if (userId === process.env.AUTH_USER_YAEL_ID) {
    return !!process.env.AUTH_USER_YAEL_TOTP_SECRET;
  }
  return false;
}

function getUserTotpSecret(userId) {
  if (userId === process.env.AUTH_USER_TOM_ID) {
    return process.env.AUTH_USER_TOM_TOTP_SECRET || null;
  }
  if (userId === process.env.AUTH_USER_YAEL_ID) {
    return process.env.AUTH_USER_YAEL_TOTP_SECRET || null;
  }
  return null;
}

// ============================================
// TOTP Utility Functions
// ============================================

function generateTotpSecret(username, issuer = 'Finances Tracker') {
  const secret = speakeasy.generateSecret({
    name: `${issuer}:${username}`,
    issuer: issuer,
    length: 32
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
}

async function generateQRCodeUrl(otpauthUrl) {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

function verifyTotpCode(secret, code, window = 1) {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window
    });
  } catch (error) {
    console.error('Error verifying TOTP code:', error);
    return false;
  }
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return 'unknown';
}

async function logAuditEvent(event) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_AUDIT_LOG_TABLE = process.env.AIRTABLE_AUDIT_LOG_TABLE || 'Audit Log';

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error('Airtable configuration missing for audit log');
      return;
    }

    const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

    const detailsString = typeof event.details === 'object'
      ? JSON.stringify(event.details)
      : event.details || '';

    await base(AIRTABLE_AUDIT_LOG_TABLE).create({
      'Timestamp': new Date().toISOString(),
      'User ID': event.userId,
      'Username': event.username,
      'Action': event.action,
      'Resource': event.resource,
      'IP Address': event.ip,
      'Success': event.success,
      'Details': detailsString
    });

    console.log(`[Audit] ${event.username} - ${event.action} ${event.resource} - ${event.success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

function setAuthCookies(res, userId, username) {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  const accessToken = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, tokenVersion: 1 }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  res.setHeader('Set-Cookie', [
    `accessToken=${accessToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${15 * 60}`,
    `refreshToken=${refreshToken}; HttpOnly; SameSite=Strict; Path=/api/auth/refresh; Max-Age=${7 * 24 * 60 * 60}`
  ]);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    cookies[name.trim()] = rest.join('=').trim();
  });

  return cookies;
}

// ============================================
// Auth Endpoints
// ============================================

const authLoginHandler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = getUserByUsername(username);
    if (!user) {
      await logAuditEvent({
        userId: 'unknown',
        username: username || 'unknown',
        action: 'login',
        resource: 'auth',
        success: false,
        ip: getClientIp(req),
        details: 'User not found'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await logAuditEvent({
        userId: user.id,
        username: user.username,
        action: 'login',
        resource: 'auth',
        success: false,
        ip: getClientIp(req),
        details: 'Invalid password'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const has2FA = !!user.totpSecret;

    if (has2FA) {
      const tempToken = jwt.sign(
        { userId: user.id, username: user.username, stage: 'awaiting-totp' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.status(200).json({ requireTotp: true, tempToken });
    }

    if (!user.totpSecret) {
      const tempToken = jwt.sign(
        { userId: user.id, username: user.username, stage: 'awaiting-setup' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );
      return res.status(200).json({ requireTotp: false, requireSetup: true, tempToken });
    }

    setAuthCookies(res, user.id, user.username);

    await logAuditEvent({
      userId: user.id,
      username: user.username,
      action: 'login',
      resource: 'auth',
      success: true,
      ip: getClientIp(req),
      details: 'Direct login (no 2FA)'
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        has2FA: false,
        hasWebAuthn: false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const authLogoutHandler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.setHeader('Set-Cookie', [
      `accessToken=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
      `refreshToken=; HttpOnly; SameSite=Strict; Path=/api/auth/refresh; Max-Age=0`
    ]);

    await logAuditEvent({
      userId: decoded.userId,
      username: decoded.username,
      action: 'logout',
      resource: 'auth',
      success: true,
      ip: getClientIp(req)
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const authRefreshHandler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const username = getUsernameById(decoded.userId);

    if (username === 'unknown') {
      return res.status(401).json({ error: 'Invalid user' });
    }

    const newAccessToken = jwt.sign(
      { userId: decoded.userId, username },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.setHeader(
      'Set-Cookie',
      `accessToken=${newAccessToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${15 * 60}`
    );

    return res.status(200).json({ success: true, message: 'Access token refreshed' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired', code: 'REFRESH_TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const authVerifyHandler = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const has2FA = getUserHas2FA(decoded.userId);

    return res.status(200).json({
      user: {
        id: decoded.userId,
        username: decoded.username,
        has2FA,
        hasWebAuthn: false
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
    console.error('Verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// 2FA Endpoints
// ============================================

const auth2faSetupHandler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { tempToken } = req.body;

    if (!tempToken) {
      return res.status(401).json({ error: 'No temp token provided' });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Temp token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Invalid temp token', code: 'INVALID_TOKEN' });
    }

    // Verify token is for setup stage
    if (decoded.stage !== 'awaiting-setup') {
      return res.status(403).json({
        error: 'Invalid token stage',
        details: `Expected 'awaiting-setup', got '${decoded.stage}'`
      });
    }

    // Generate TOTP secret
    const { secret, otpauthUrl } = generateTotpSecret(decoded.username);

    // Generate QR code
    const qrCodeDataUrl = await generateQRCodeUrl(otpauthUrl);

    return res.status(200).json({
      success: true,
      secret,
      qrCodeUrl: qrCodeDataUrl,
      manualCode: secret,
      username: decoded.username,
      issuer: 'Finances Tracker'
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const auth2faVerifySetupHandler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { tempToken, totpCode, secret } = req.body;

    if (!tempToken || !totpCode || !secret) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'tempToken, totpCode, and secret are required'
      });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Temp token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Invalid temp token', code: 'INVALID_TOKEN' });
    }

    // Verify token is for setup stage
    if (decoded.stage !== 'awaiting-setup') {
      return res.status(403).json({
        error: 'Invalid token stage',
        details: `Expected 'awaiting-setup', got '${decoded.stage}'`
      });
    }

    // Verify TOTP code
    const isValid = verifyTotpCode(secret, totpCode);

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid TOTP code',
        details: 'The code you entered is incorrect or has expired. Please try again.'
      });
    }

    // Success!
    const envVarName = `AUTH_USER_${decoded.username.toUpperCase()}_TOTP_SECRET`;

    return res.status(200).json({
      success: true,
      message: '2FA setup successful!',
      secret,
      instructions: {
        title: 'Save this secret to complete setup',
        steps: [
          'Add the following line to your .env.local file:',
          `${envVarName}=${secret}`,
          'Restart your development server',
          'You can now log in with 2FA'
        ]
      },
      envVarName,
      username: decoded.username
    });
  } catch (error) {
    console.error('2FA verify setup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const authLoginTotpHandler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { tempToken, totpCode } = req.body;

    if (!tempToken || !totpCode) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'tempToken and totpCode are required'
      });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Temp token expired. Please log in again.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Invalid temp token', code: 'INVALID_TOKEN' });
    }

    // Verify token is for TOTP stage
    if (decoded.stage !== 'awaiting-totp') {
      return res.status(403).json({
        error: 'Invalid token stage',
        details: `Expected 'awaiting-totp', got '${decoded.stage}'`
      });
    }

    // Get user's TOTP secret
    const totpSecret = getUserTotpSecret(decoded.userId);
    if (!totpSecret) {
      await logAuditEvent({
        userId: decoded.userId,
        username: decoded.username,
        action: 'login',
        resource: 'auth',
        success: false,
        ip: getClientIp(req),
        details: '2FA not configured for user'
      });

      return res.status(500).json({
        error: '2FA not configured for this user',
        details: 'Please contact administrator'
      });
    }

    // Verify TOTP code
    const isValid = verifyTotpCode(totpSecret, totpCode);

    if (!isValid) {
      await logAuditEvent({
        userId: decoded.userId,
        username: decoded.username,
        action: 'login',
        resource: 'auth',
        success: false,
        ip: getClientIp(req),
        details: 'Invalid TOTP code'
      });

      return res.status(401).json({
        error: 'Invalid TOTP code',
        details: 'The code you entered is incorrect or has expired'
      });
    }

    // TOTP verified successfully! Generate auth tokens
    setAuthCookies(res, decoded.userId, decoded.username);

    // Log successful login
    await logAuditEvent({
      userId: decoded.userId,
      username: decoded.username,
      action: 'login',
      resource: 'auth',
      success: true,
      ip: getClientIp(req),
      details: 'Login with 2FA successful'
    });

    return res.status(200).json({
      success: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        has2FA: true,
        hasWebAuthn: false
      }
    });
  } catch (error) {
    console.error('TOTP login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Routes - Protected with authentication
app.get('/api/categories', withAuth(categoriesHandler));
app.post('/api/income', withAuth(incomeHandler));
app.post('/api/expense', withAuth(expenseHandler));
app.get('/api/recent', withAuth(recentHandler));
app.post('/api/update', withAuth(updateHandler));
app.post('/api/delete', withAuth(deleteHandler));

// Auth routes
app.post('/api/auth/login', authLoginHandler);
app.post('/api/auth/logout', authLogoutHandler);
app.post('/api/auth/refresh', authRefreshHandler);
app.get('/api/auth/verify', authVerifyHandler);

// 2FA routes
app.post('/api/auth/2fa/setup', auth2faSetupHandler);
app.post('/api/auth/2fa/verify-setup', auth2faVerifySetupHandler);
app.post('/api/auth/login-totp', authLoginTotpHandler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dev API server running on http://localhost:${PORT}`);
  console.log('Auth endpoints available:');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/logout');
  console.log('  POST /api/auth/refresh');
  console.log('  GET  /api/auth/verify');
  console.log('2FA endpoints available:');
  console.log('  POST /api/auth/2fa/setup');
  console.log('  POST /api/auth/2fa/verify-setup');
  console.log('  POST /api/auth/login-totp');
});
