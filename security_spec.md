# Security Specification: InMarket Security Rules Test-Driven Development

## 1. Data Invariants
- Each user profile `/users/{userId}` can only be read or written by the authenticated user `userId`.
- Products, customers, sales, expenses, and wallet collections are partitioned by owner. Only the owner (`ownerId` equal to `request.auth.uid`) can view or modify his/her business records.
- Log entries such as `/activities/{activityId}` and `/loginLogs/{logId}` are append-only (create). They cannot be modified or deleted.

## 2. The "Dirty Dozen" Threat Payloads
1. **Identity Spoofing on Product Create:** Creating a product with `ownerId` set to another user's UID.
2. **Product Price Value Poisoning:** Setting a product's price to a negative value or `NaN`.
3. **Product Stock Value Poisoning:** Setting stock to a negative number or negative decimal.
4. **Activity Modification:** Attempting to update or edit a transaction/operation log.
5. **Activity Deletion:** Attempting to delete a log entry.
6. **Sales Total Poisoning:** Setting total sales amount to less than or equal to `0`.
7. **Expense Amount Poisoning:** Setting expense amount to negative or `0`.
8. **Customer Name Injection:** Omiting required customer name, or injecting non-string payloads.
9. **Direct Wallet Hijack:** Authenticated User A attempting to read/write User B's WALLET balance or transactions.
10. **Global Catch-All Probe:** Accessing general collection queries without owner restrictions or specific matches.
11. **Login Logs Modification:** Modifying historically recorded login sessions.
12. **Foreign User Profile Access:** Reading/writing another user's profile document under `/users/{userId}`.
