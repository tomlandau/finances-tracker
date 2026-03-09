

# **SUMIT API Documentation \- Accounting Documents**

This document provides the technical specification for interacting with the SUMIT API for listing, retrieving details, and getting PDF versions of accounting documents.

## **Base URL**

https://api.sumit.co.il

## **Common Data Structures**

### **Credentials Object**

Every request must include the following credentials object:

* CompanyID (integer): Your SUMIT company ID.  
* APIKey (string): Your secret API key.

### **Response Structure**

All responses follow a standard wrapper:

* Status (string): Enum Success (0), BusinessError (1), TechnicalError (2).  
* UserErrorMessage (string): Human-readable error message.  
* TechnicalErrorDetails (string): Debugging information.  
* Data: API-specific response data.

---

## **1\. List Documents**

**Endpoint:** POST /accounting/documents/list/

Retrieve a filtered list of accounting documents.

### **Request Body**

JSON

{  
  "Credentials": { "CompanyID": 0, "APIKey": "string" },  
  "DocumentTypes": \["Invoice (0)"\],  
  "DocumentNumberFrom": 0,  
  "DocumentNumberTo": 0,  
  "DateFrom": "ISO-8601-DateTime",  
  "DateTo": "ISO-8601-DateTime",  
  "IncludeDrafts": true,  
  "Paging": null  
}

### **Key Parameters:**

* **DocumentTypes**: Array of strings (e.g., "Invoice (0)", "Receipt (2)").  
* **Date Range**: DateFrom and DateTo should be in JSON date format (e.g., 2024-01-01).

### **Response Data (Data.Documents):**

Array of objects containing:

* DocumentID (int): SUMIT internal identifier.  
* DocumentNumber (int): The formal document number.  
* CustomerName (string): Name of the client.  
* DocumentValue (double): Total amount in document currency.  
* CompanyValue (double): Total amount in ILS.  
* DocumentDownloadURL (string): Link to the PDF.  
* IsDraft (boolean): Whether the document is a draft.

---

## **2\. Get Document Details**

**Endpoint:** POST /accounting/documents/getdetails/

Retrieve full line-item details and payment information for a specific document.

### **Request Body**

JSON

{  
  "Credentials": { "CompanyID": 0, "APIKey": "string" },  
  "DocumentID": 0,  
  "DocumentType": "Invoice (0)",  
  "DocumentNumber": 0  
}

*Note: Provide either DocumentID OR (DocumentType \+ DocumentNumber).*

### **Response Data (Data.Document):**

* **Items**: Array of line items including Quantity, UnitPrice, TotalPrice, VAT, and Description.  
* **Payments**: Array of payment method objects.  
* **Metadata**: Includes DocumentID, DocumentNumber, DocumentDownloadURL.

---

## **3\. Get Document PDF**

**Endpoint:** POST /accounting/documents/getpdf/

Generates/Retrieves the PDF file for a document.

### **Request Body**

JSON

{  
  "Credentials": { "CompanyID": 0, "APIKey": "string" },  
  "DocumentID": 0,  
  "DocumentType": "Invoice (0)",  
  "DocumentNumber": 0,  
  "Original": true  
}

* **Original**: If true, attempts to pull the original document. If false or already printed, returns a "Certified Copy".

---

## **Reference Tables**

### **Document Type Enums (String Format)**

| Index | Name | Index | Name |
| :---- | :---- | :---- | :---- |
| 0 | Invoice (0) | 1 | InvoiceAndReceipt (1) |
| 2 | Receipt (2) | 3 | ProformaInvoice (3) |
| 4 | DonationReceipt (4) | 5 | CreditInvoice (5) |
| 8 | Order (8) | 12 | PriceQuotation (12) |
| 13 | PaymentRequest (13) | 16 | ExpenseInvoice (16) |

### **Language Enums**

* Hebrew (0)  
* English (1)  
* Arabic (2)  
* Spanish (3)

---

## **Implementation Notes for Claude**

1. **Authentication**: Always wrap the provided APIKey and CompanyID in the Credentials object.  
2. **Date Handling**: Ensure dates sent to the API are in ISO-8601 format or YYYY-MM-DD.  
3. **Filtering**: When listing documents, if a DocumentNumber is used, DocumentType is mandatory.  
4. **Error Handling**: Always check if Status is "Success (0)" before processing the Data field.

---

**האם תרצה שאצור לך דוגמת קוד ב-Python או Node.js שמשתמשת במבנה הזה כדי לבצע קריאה ל-API?**

