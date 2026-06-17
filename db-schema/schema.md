# Zair Zabar POS - Database Schema

## Database: MongoDB (Atlas)
**Database Name:** `zair-zabar-pos`

---

## Collections

### 1. Users
Stores employee/staff accounts.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| _id | ObjectId | auto | Primary key |
| name | String | Yes | Employee name |
| email | String | Yes | Unique, validated format |
| phone | Number | Yes | 10-11 digits (Pakistan) |
| password | String | Yes | Bcrypt hashed (salt: 10) |
| role | String | Yes | "Admin", "Waiter", "Cashier" |
| createdAt | Date | auto | Timestamp |
| updatedAt | Date | auto | Timestamp |

**Pre-save hook:** Password auto-hashed with bcrypt before save.

---

### 2. Orders
Stores all customer orders.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| _id | ObjectId | auto | Primary key |
| customerDetails.name | String | Yes | Customer name |
| customerDetails.phone | String | Yes | Customer phone |
| customerDetails.guests | Number | Yes | Number of guests |
| orderStatus | String | Yes | "In Progress", "Ready", "Completed" |
| orderDate | Date | No | Default: current date |
| bills.total | Number | Yes | Subtotal before tax |
| bills.tax | Number | Yes | Tax amount |
| bills.totalWithTax | Number | Yes | Grand total |
| items | Array | No | Array of cart items [{name, quantity, price, pricePerQuantity}] |
| table | ObjectId (ref: Table) | No | Null for takeaway/walk-in |
| paymentMethod | String | No | "Cash" or "Online" |
| paymentData.razorpay_order_id | String | No | For online payments |
| paymentData.razorpay_payment_id | String | No | For online payments |
| createdAt | Date | auto | Timestamp |
| updatedAt | Date | auto | Timestamp |

---

### 3. Tables
Stores restaurant table configuration.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| _id | ObjectId | auto | Primary key |
| tableNo | Number | Yes | Unique table number (1-10) |
| status | String | No | Default: "Available", or "Booked" |
| seats | Number | Yes | Number of seats (2-6) |
| currentOrder | ObjectId (ref: Order) | No | Currently assigned order |

---

### 4. Payments
Stores online payment records (Razorpay webhooks).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| _id | ObjectId | auto | Primary key |
| paymentId | String | No | Razorpay payment ID |
| orderId | String | No | Razorpay order ID |
| amount | Number | No | Amount in paisa |
| currency | String | No | "INR" / "PKR" |
| status | String | No | Payment status |
| method | String | No | Payment method |
| email | String | No | Payer email |
| contact | String | No | Payer phone |
| createdAt | Date | No | Payment date |

---

## Relationships

```
Users (standalone - authentication)

Orders ----> Tables (one-to-one via table field)
Tables ----> Orders (one-to-one via currentOrder field)
Orders ----> Payments (linked via paymentData)
```

## Indexes
- `users.email` - unique
- `tables.tableNo` - unique

## Menu Data
Menu items are stored as **frontend constants** (not in database).
Located at: `frontend/src/constants/index.js`
Categories: 13 | Items: 80+
