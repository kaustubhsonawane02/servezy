# Servezy Database Schema v1 (Source of Truth)

All collections except Restaurant & SubscriptionPayment MUST have restaurantId.
Indexes marked with ⚡ are mandatory.

## 1. Restaurant (tenant root)
name: String, required
slug: String, unique, lowercase ⚡ — used in QR URLs /menu/{slug}/{table}
ownerEmail: String, unique ⚡
passwordHash: String (bcrypt 10)
upiId: String
logoUrl: String
themeConfig: { primaryColor: String, default '#ea580c' }
subscription: {
  plan: Enum['trial','monthly','halfyear','yearly'],
  status: Enum['trial','active','expired','suspended'],
  startedAt: Date, expiresAt: Date ⚡,
  razorpaySubscriptionId: String
}
settings: { upsellEnabled: Boolean (true), acceptOrders: Boolean (true) }
timestamps

## 2. StaffUser
restaurantId: ObjectId ⚡
name: String
email: String (owner/manager only; kitchen staff null)
pinHash: String (4-digit, hashed — tablet login)
role: Enum['owner','manager','billing','kitchen']
pushToken: String?
timestamps

## 3. Category
restaurantId ⚡ · name · sortOrder: Number
Index: { restaurantId: 1, sortOrder: 1 } ⚡

## 4. MenuItem
restaurantId ⚡ · categoryId: ObjectId ⚡
name (required) · price: Number (required, min 0)
description: String (max 300) · isVeg: Boolean
inStock: Boolean (true) · imageUrl: String?
upsellTag: String? — links to another MenuItem name ("goes well with")
Index: { restaurantId: 1, categoryId: 1 } ⚡

## 5. Order
restaurantId ⚡ · tableNumber: String (required)
items: [{ menuItemId, name, quantity (1–20), price, specialInstructions (max 200) }]
subtotal: Number · taxAmount: Number (default 0) · discountAmount: Number (default 0)
totalAmount: Number
status: Enum['placed','preparing','ready','served','completed'] ⚡
paymentStatus: Enum['pending','paid_via_upi','cash','confirmed_by_staff']
source: Enum['qr','waiter']
createdAt ⚡
Index: { restaurantId: 1, status: 1, createdAt: -1 } ⚡

## 6. Bill
restaurantId ⚡ · orderId: ObjectId (unique) ⚡
tableNumber · subtotal · taxAmount · discountAmount · totalAmount
paymentMethod · customerPhone: String? (for repeat-customer engine v2)
generatedAt

## 7. SubscriptionPayment (platform revenue — SuperAdmin scope)
restaurantId ⚡ · plan · amount · razorpayPaymentId · razorpayOrderId
periodStart · periodEnd · createdAt

## 8. AiImportJob
restaurantId ⚡ · imageUrl ·
status: Enum['pending','processing','review','completed','failed']
extractedItems: [{ name, price, description?, isVeg? }]
error: String? · timestamps

## Data Rules
- Prices stored in whole rupees (Number). No floats.
- Order items snapshot name+price at order time (menu edits never change history).
- Deleting a MenuItem with past orders → soft-delete (set active:false), never hard delete.
