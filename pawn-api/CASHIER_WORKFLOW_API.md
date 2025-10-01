# CASHIER WORKFLOW - API ENDPOINTS

## 🏪 Cashier Dashboard - Pending Appraisals

### Display Format
**Only 3 columns needed:**
- Pawner Name
- Item Category Description  
- Total Appraised Value

### API Endpoint
```javascript
GET /api/appraisals/pending-ready

Response: {
  success: true,
  data: [
    {
      id: 1,
      pawnerName: "Maria Garcia",
      itemCategoryDescription: "Gold jewelry and precious stones",
      totalAppraisedValue: 25000.00
    },
    {
      id: 2, 
      pawnerName: "Robert Martinez",
      itemCategoryDescription: "Mobile phones and electronic devices", 
      totalAppraisedValue: 45000.00
    }
  ]
}
```

### Frontend Implementation
```typescript
// Cashier Dashboard Component
async loadPendingAppraisals() {
  const response = await this.http.get('/api/appraisals/pending-ready');
  this.pendingAppraisals = response.data;
}

// Click handler
onAppraisalClick(appraisalId: number) {
  this.router.navigate(['/transaction/new-loan', appraisalId]);
}
```

## 💰 New Loan Transaction Page

### Route
`/transaction/new-loan/:appraisalId`

### API Endpoint for Page Data
```javascript
GET /api/appraisals/:id/for-transaction

Response: {
  success: true,
  data: {
    // Complete appraisal details
    appraisal: {
      id: 1,
      category: "Jewelry",
      categoryDescription: "Gold jewelry and precious stones",
      description: "18K Gold wedding ring with diamond accents",
      brand: "Cartier",
      model: "Love Ring", 
      serialNumber: null,
      weight: 8.5,
      karat: 18,
      estimatedValue: 25000.00,
      interestRate: 0.05,
      conditionNotes: "Excellent condition",
      appraiserName: "Mike Davis"
    },
    
    // Complete pawner details
    pawner: {
      id: 1,
      fullName: "Maria Garcia",
      contactNumber: "+1-555-2001",
      email: "maria.garcia@email.com",
      idType: "Drivers License",
      idNumber: "DL123456789",
      birthDate: "1985-03-15",
      address: {
        city: "Manila",
        barangay: "Ermita", 
        details: "Sample address details for pawner 1"
      }
    },
    
    // Item list (structured as array for consistency)
    items: [{
      id: 1,
      type: "18K Gold wedding ring with diamond accents",
      category: "Jewelry",
      categoryDescription: "Gold jewelry and precious stones",
      brand: "Cartier",
      model: "Love Ring",
      weight: 8.5,
      karat: 18,
      value: 25000.00,
      condition: "Excellent condition"
    }]
  }
}
```

### Create New Loan Transaction
```javascript
POST /api/transactions/new-loan/:appraisalId

Request Body: {
  principalLoan: 20000.00,
  interestRate: 3.00,
  advanceInterest: 2400.00,
  advanceServiceCharge: 50.00,
  netProceed: 17550.00,
  notes: "Standard new loan terms"
}

Response: {
  success: true,
  message: "New loan transaction created successfully",
  data: {
    transaction: { /* full transaction object */ },
    transactionNumber: "2025-000001",
    appraisalId: 1
  }
}
```

## 🎯 Frontend Page Structure

### New Loan Transaction Component
```typescript
export class NewLoanTransactionComponent {
  appraisalId: number;
  appraisalData: any;
  
  ngOnInit() {
    this.appraisalId = this.route.snapshot.params['appraisalId'];
    this.loadAppraisalForTransaction();
  }
  
  async loadAppraisalForTransaction() {
    const response = await this.http.get(`/api/appraisals/${this.appraisalId}/for-transaction`);
    this.appraisalData = response.data;
  }
  
  async createNewLoan(computationData: any) {
    const response = await this.http.post(`/api/transactions/new-loan/${this.appraisalId}`, computationData);
    
    if (response.success) {
      // Redirect to transaction summary or dashboard
      this.router.navigate(['/cashier/dashboard']);
    }
  }
}
```

### Page Layout
```html
<!-- New Loan Transaction Page -->
<div class="new-loan-container">
  <!-- Pawner Information Section (Read-only) -->
  <div class="pawner-section">
    <h3>Pawner Information</h3>
    <div class="pawner-details">
      <p><strong>Name:</strong> {{ appraisalData.pawner.fullName }}</p>
      <p><strong>Contact:</strong> {{ appraisalData.pawner.contactNumber }}</p>
      <p><strong>Email:</strong> {{ appraisalData.pawner.email }}</p>
      <p><strong>ID:</strong> {{ appraisalData.pawner.idType }} - {{ appraisalData.pawner.idNumber }}</p>
      <p><strong>Address:</strong> {{ appraisalData.pawner.address.city }}, {{ appraisalData.pawner.address.barangay }}</p>
    </div>
  </div>
  
  <!-- Item List Section (Read-only) -->
  <div class="items-section">
    <h3>Item Details</h3>
    <div class="item-card" *ngFor="let item of appraisalData.items">
      <p><strong>Category:</strong> {{ item.categoryDescription }}</p>
      <p><strong>Description:</strong> {{ item.type }}</p>
      <p><strong>Brand:</strong> {{ item.brand }}</p>
      <p><strong>Weight:</strong> {{ item.weight }}g</p>
      <p><strong>Karat:</strong> {{ item.karat }}</p>
      <p><strong>Appraised Value:</strong> ₱{{ item.value | number:'1.2-2' }}</p>
    </div>
  </div>
  
  <!-- New Loan Computation Form -->
  <div class="computation-section">
    <h3>New Loan Computation</h3>
    <form (ngSubmit)="createNewLoan(computationForm.value)" #computationForm="ngForm">
      <div class="computation-fields">
        <label>Appraisal Value: ₱{{ appraisalData.appraisal.estimatedValue | number:'1.2-2' }}</label>
        
        <label>Principal Loan:
          <input type="number" name="principalLoan" ngModel step="0.01" required>
        </label>
        
        <label>Interest Rate (%):
          <input type="number" name="interestRate" ngModel step="0.01" [value]="appraisalData.appraisal.interestRate" required>
        </label>
        
        <label>Advance Interest:
          <input type="number" name="advanceInterest" ngModel step="0.01" required>
        </label>
        
        <label>Advance Service Charge:
          <input type="number" name="advanceServiceCharge" ngModel step="0.01" required>
        </label>
        
        <label>Net Proceed:
          <input type="number" name="netProceed" ngModel step="0.01" required>
        </label>
        
        <label>Notes:
          <textarea name="notes" ngModel></textarea>
        </label>
      </div>
      
      <button type="submit" class="btn-primary">Create New Loan</button>
    </form>
  </div>
</div>
```

## ✅ Implementation Status

- ✅ **Cashier Dashboard API** - Simplified 3-column display
- ✅ **Clickable redirect** - Data ready for routing
- ✅ **New Loan Transaction API** - Complete pawner + item details
- ✅ **Transaction creation** - New loan from appraisal
- ✅ **Status management** - Appraisal marked as "used" after transaction
- ✅ **Auto transaction numbering** - YYYY-XXXXXX format

**The backend is 100% ready for this specific cashier workflow!** 🎉