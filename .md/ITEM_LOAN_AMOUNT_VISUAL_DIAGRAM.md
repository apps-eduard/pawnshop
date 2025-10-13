# Visual Diagram: Item loan_amount After Partial Payment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    YOUR SCENARIO - DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘


STEP 1: NEW LOAN TRANSACTION
═══════════════════════════════════════════════════════════════════════════════

┌──────────────────────────┐       ┌──────────────────────────┐
│   TRANSACTION TABLE      │       │   PAWN_ITEMS TABLE       │
│  (TXN-001: New Loan)     │       │   (Item #1)              │
├──────────────────────────┤       ├──────────────────────────┤
│ transaction_number:      │       │ id: 1                    │
│   TXN-001                │       │ transaction_id:          │
│                          │◄──────┤   → TXN-001's id         │
│ tracking_number:         │       │                          │
│   TXN-001                │       │ appraised_value:         │
│                          │       │   ₱15,000  ✅            │
│ transaction_type:        │       │                          │
│   'new_loan'             │       │ loan_amount:             │
│                          │       │   ₱10,000  ✅            │
│ principal_amount:        │       │                          │
│   ₱10,000  ✅            │       │ status: 'in_vault'       │
│                          │       │                          │
│ balance: ₱10,600         │       │ (Original item record)   │
│                          │       │                          │
│ status: 'active'         │       └──────────────────────────┘
└──────────────────────────┘
    ↓
    ↓ Customer makes partial payment of ₱5,000
    ↓


STEP 2: PARTIAL PAYMENT TRANSACTION
═══════════════════════════════════════════════════════════════════════════════

┌──────────────────────────┐       ┌──────────────────────────┐
│   TRANSACTION TABLE      │       │   PAWN_ITEMS TABLE       │
│  (TXN-002: Partial Pay)  │       │   (Item #2 - COPIED)     │
├──────────────────────────┤       ├──────────────────────────┤
│ transaction_number:      │       │ id: 2  (NEW ROW)         │
│   TXN-002  (NEW) ✨      │       │ transaction_id:          │
│                          │◄──────┤   → TXN-002's id         │
│ tracking_number:         │       │                          │
│   TXN-001  (SAME) 🔗     │       │ appraised_value:         │
│                          │       │   ₱15,000  (copied) ✅   │
│ previous_txn_number:     │       │                          │
│   TXN-001  (LINK) 🔗     │       │ loan_amount:             │
│                          │       │   ₱10,000  (copied) ✅   │
│ transaction_type:        │       │   ← NOT CHANGED!         │
│   'partial_payment'      │       │                          │
│                          │       │ status: 'in_vault'       │
│ principal_amount:        │       │                          │
│   ₱5,000  (REDUCED) ✅   │       │ (NEW item record linked  │
│   ← CHANGED!             │       │  to NEW transaction)     │
│                          │       │                          │
│ new_principal_loan:      │       └──────────────────────────┘
│   ₱5,000 ✅              │
│                          │       ┌──────────────────────────┐
│ amount_paid: ₱5,000      │       │   PAWN_ITEMS TABLE       │
│                          │       │   (Item #1 - ORIGINAL)   │
│ balance: ₱5,300          │       ├──────────────────────────┤
│                          │       │ id: 1                    │
│ status: 'active'         │       │ transaction_id:          │
└──────────────────────────┘       │   → TXN-001's id         │
                                   │                          │
┌──────────────────────────┐       │ appraised_value:         │
│   TRANSACTION TABLE      │       │   ₱15,000  ✅            │
│  (TXN-001: Superseded)   │       │                          │
├──────────────────────────┤       │ loan_amount:             │
│ transaction_number:      │       │   ₱10,000  ✅            │
│   TXN-001                │       │   ← STILL SAME!          │
│                          │       │                          │
│ status: 'superseded' 🔒  │       │ status: 'in_vault'       │
│                          │       │                          │
│ (Original transaction    │       │ (Original item record    │
│  now inactive)           │       │  still exists unchanged) │
└──────────────────────────┘       └──────────────────────────┘


STEP 3: AFTER EXPIRATION - AUCTIONEER DASHBOARD QUERY
═══════════════════════════════════════════════════════════════════════════════

                            SQL QUERY
                               ↓
    ┌──────────────────────────────────────────────────────────┐
    │  SELECT pi.*, t.*                                        │
    │  FROM pawn_items pi                                      │
    │  LEFT JOIN transactions t ON pi.transaction_id = t.id   │
    │  WHERE t.expiry_date < CURRENT_DATE                      │
    │    AND pi.status = 'in_vault'                            │
    │    AND t.status IN ('active', 'expired')                 │
    └──────────────────────────────────────────────────────────┘
                               ↓
                    RETURNS ITEM #2 ONLY
                    (linked to TXN-002)
                               ↓
    ┌──────────────────────────────────────────────────────────┐
    │  AUCTIONEER DASHBOARD DISPLAY                            │
    ├──────────────────────────────────────────────────────────┤
    │  Ticket Number:       TXN-002                            │
    │  Item ID:             2                                  │
    │  Appraised Value:     ₱15,000.00  ← From pawn_items     │
    │  Loan Amount:         ₱10,000.00  ← From pawn_items ✅  │
    │  Status:              Expired                            │
    │                                                           │
    │  ⚠️  Shows ORIGINAL loan_amount, NOT current principal   │
    └──────────────────────────────────────────────────────────┘


COMPARISON: WHERE TO FIND EACH VALUE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────┬──────────────┬──────────────┬─────────────────────┐
│ WHAT YOU WANT TO KNOW   │   TABLE      │   COLUMN     │   VALUE             │
├─────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ Original Appraisal      │ pawn_items   │ appraised_   │   ₱15,000 ✅        │
│                         │              │   value      │                     │
├─────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ Original Loan Amount    │ pawn_items   │ loan_amount  │   ₱10,000 ✅        │
│ (per item)              │              │              │   (NEVER changes)   │
├─────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ Current Principal       │ transactions │ principal_   │   ₱5,000 ✅         │
│ (after partial payment) │              │   amount     │   (CHANGES)         │
├─────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ Amount Paid             │ transactions │ amount_paid  │   ₱5,000 ✅         │
│                         │              │              │                     │
├─────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ Current Balance         │ transactions │ balance      │   ₱5,300 ✅         │
│ (with charges)          │              │              │   (principal +      │
│                         │              │              │    interest)        │
└─────────────────────────┴──────────────┴──────────────┴─────────────────────┘


TIMELINE VISUALIZATION
═══════════════════════════════════════════════════════════════════════════════

Time ──────────────────────────────────────────────────────────────────►

Day 1              Day 30                Day 60
  │                  │                     │
  │                  │                     │
  ▼                  ▼                     ▼

┌─────────┐      ┌──────────┐        ┌──────────┐
│ NEW LOAN│      │ PARTIAL  │        │ EXPIRED  │
│ ₱10,000 │ ───► │ PAY ₱5K  │ ────► │          │
└─────────┘      └──────────┘        └──────────┘
                                          │
pawn_items:      pawn_items:         pawn_items:
loan_amount=     loan_amount=        loan_amount=
₱10,000 ✅       ₱10,000 ✅          ₱10,000 ✅

transactions:    transactions:       transactions:
principal=       principal=          principal=
₱10,000 ✅       ₱5,000 ✅           ₱5,000 ✅


KEY INSIGHT:
═══════════════════════════════════════════════════════════════════════════════

    pawn_items.loan_amount     =  ORIGINAL loan per item (historical)
    
    transactions.principal_amount  =  CURRENT loan balance (changes)


WHEN ITEMS ARE COPIED DURING PARTIAL PAYMENT:
═══════════════════════════════════════════════════════════════════════════════

    ┌──────────────────────────────────────────────────────────┐
    │  INSERT INTO pawn_items (                                │
    │    transaction_id, category_id, description_id,          │
    │    appraisal_notes, appraised_value, loan_amount, status │
    │  )                                                        │
    │  SELECT                                                   │
    │    $1,                ← NEW transaction_id (TXN-002)     │
    │    category_id,       ← COPIED as-is                     │
    │    description_id,    ← COPIED as-is                     │
    │    appraisal_notes,   ← COPIED as-is                     │
    │    appraised_value,   ← COPIED as-is (₱15,000) ✅        │
    │    loan_amount,       ← COPIED as-is (₱10,000) ✅        │
    │    status             ← COPIED as-is                     │
    │  FROM pawn_items                                         │
    │  WHERE transaction_id = $2  ← OLD transaction_id (TXN-001)│
    └──────────────────────────────────────────────────────────┘

    ⚠️  loan_amount is COPIED, NOT UPDATED!


ANSWER TO YOUR QUESTION:
═══════════════════════════════════════════════════════════════════════════════

    When transaction expires, the auctioneer dashboard will display:
    
    loan_amount = ₱10,000  ✅  (from pawn_items table)
    
    This is the ORIGINAL loan amount, NOT the current principal (₱5,000)
    
    To see current principal, you need to look at:
    transactions.principal_amount = ₱5,000
```

---

**Created:** October 9, 2025  
**Status:** Visual Explanation Complete ✅
