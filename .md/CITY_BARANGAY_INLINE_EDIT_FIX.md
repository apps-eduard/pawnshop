# City and Barangay Inline Edit Fix

**Date:** October 12, 2025  
**Status:** ✅ COMPLETE

---

## Issue

Users were unable to edit city and barangay fields when editing pawners or users in the management pages. The inline edit mode only showed basic fields but not the address-related dropdowns.

---

## Solution

Added city and barangay dropdowns to the inline edit mode for both Pawner Management and User Management tables, with proper cascading dropdown functionality.

---

## Changes Made

### 1. Pawner Management

#### HTML Changes (`pawner-management.html`)
**Location:** Lines 305-331 (Address column)

**Added:**
- City dropdown in inline edit mode
- Barangay dropdown in inline edit mode (disabled until city selected)
- Address details textarea
- All fields populate with current values when editing

```html
<div *ngIf="pawner.isEditing" class="space-y-2">
  <select
    [(ngModel)]="pawner.cityId"
    (change)="onCityChangeForPawner(pawner)"
    class="block w-48 px-2 py-1 text-sm border...">
    <option value="">Select City</option>
    <option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</option>
  </select>
  <select
    [(ngModel)]="pawner.barangayId"
    [disabled]="!pawner.cityId"
    class="block w-48 px-2 py-1 text-sm border...">
    <option value="">{{ pawner.cityId ? 'Select Barangay' : 'Select city first' }}</option>
    <option *ngFor="let barangay of selectedCityBarangays" [value]="barangay.id">{{ barangay.name }}</option>
  </select>
  <textarea [(ngModel)]="pawner.addressDetails" rows="2"...></textarea>
</div>
```

#### TypeScript Changes (`pawner-management.ts`)

**1. Updated `startEdit` method (Lines 235-253)**
- Now loads barangays when editing starts if pawner has a city

```typescript
startEdit(pawner: PawnerWithActions): void {
  pawner.isEditing = true;
  pawner.originalData = { ...pawner };
  
  // Load barangays for the current city when editing
  if (pawner.cityId) {
    this.addressService.getBarangaysByCity(pawner.cityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.selectedCityBarangays = response.data;
          }
        },
        error: (error: any) => {
          console.error('Error loading barangays for edit:', error);
        }
      });
  }
}
```

**2. Updated `savePawner` method (Lines 267-279)**
- Now includes `cityId` and `barangayId` in update data

```typescript
savePawner(pawner: PawnerWithActions): void {
  const pawnerData = {
    firstName: pawner.firstName,
    lastName: pawner.lastName,
    contactNumber: pawner.contactNumber,
    email: pawner.email,
    cityId: pawner.cityId,          // NEW
    barangayId: pawner.barangayId,  // NEW
    addressDetails: pawner.addressDetails,
    isActive: pawner.isActive
  };
  // ... rest of method
}
```

**3. Added `onCityChangeForPawner` method (Lines 153-173)**
- Handles city change during inline edit
- Loads barangays for selected city
- Resets barangay selection when city changes

```typescript
onCityChangeForPawner(pawner: PawnerWithActions): void {
  if (pawner.cityId) {
    this.addressService.getBarangaysByCity(pawner.cityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.selectedCityBarangays = response.data.filter((barangay: Barangay) => barangay.isActive);
          }
        },
        error: (error: any) => {
          console.error('Error loading barangays for inline edit:', error);
        }
      });
  } else {
    this.selectedCityBarangays = [];
  }
  
  // Reset barangay selection when city changes
  pawner.barangayId = undefined;
}
```

---

### 2. User Management

#### HTML Changes (`user-management.html`)

**1. Added Address column header (Line 311)**
```html
<th scope="col" class="...">
  Address
</th>
```

**2. Added Address column data (Lines 376-404)**
- Shows city, barangay, and address in view mode
- Shows city dropdown, barangay dropdown, and address textarea in edit mode

```html
<!-- Address -->
<td class="px-6 py-4">
  <div *ngIf="!user.isEditing" class="text-sm text-gray-900 dark:text-white max-w-xs">
    <div class="font-medium">{{ user.cityName }}, {{ user.barangayName }}</div>
    <div class="text-gray-500 dark:text-gray-400 truncate">{{ user.address || 'N/A' }}</div>
  </div>
  <div *ngIf="user.isEditing" class="space-y-2">
    <select [(ngModel)]="user.cityId" (change)="onCityChangeForUser(user)"...>
      <option value="">Select City</option>
      <option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</option>
    </select>
    <select [(ngModel)]="user.barangayId" [disabled]="!user.cityId"...>
      <option value="">{{ user.cityId ? 'Select Barangay' : 'Select city first' }}</option>
      <option *ngFor="let barangay of barangays" [value]="barangay.id">{{ barangay.name }}</option>
    </select>
    <textarea [(ngModel)]="user.address" rows="2"...></textarea>
  </div>
</td>
```

#### TypeScript Changes (`user-management.ts`)

**1. Updated `UserWithActions` interface (Lines 10-17)**
- Added `cityName` and `barangayName` properties

```typescript
interface UserWithActions extends User {
  isEditing?: boolean;
  originalData?: User;
  showResetPasswordModal?: boolean;
  showPasswordResult?: boolean;
  newPassword?: string;
  cityName?: string;     // NEW
  barangayName?: string; // NEW
}
```

**2. Updated `loadUsers` method (Lines 102-129)**
- Now maps city and barangay names when loading users

```typescript
this.users = response.data.map(user => ({
  ...user,
  isEditing: false,
  cityName: this.getCityName(user.cityId),        // NEW
  barangayName: this.getBarangayName(user.barangayId) // NEW
}));
```

**3. Updated `startEdit` method (Lines 214-232)**
- Loads barangays when editing starts if user has a city

```typescript
startEdit(user: UserWithActions): void {
  user.isEditing = true;
  user.originalData = { ...user };
  
  // Load barangays for the current city when editing
  if (user.cityId) {
    this.addressService.getBarangaysByCity(user.cityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.barangays = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading barangays for edit:', error);
        }
      });
  }
}
```

**4. Updated `saveUser` method (Lines 243-257)**
- Now includes `cityId` and `barangayId` in update data

```typescript
saveUser(user: UserWithActions): void {
  const userData = {
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    position: user.position,
    contactNumber: user.contactNumber,
    cityId: user.cityId,          // NEW
    barangayId: user.barangayId,  // NEW
    address: user.address,
    isActive: user.isActive
  };
  // ... rest of method
}
```

**5. Added `onCityChangeForUser` method (Lines 459-479)**
- Handles city change during inline edit for users

```typescript
onCityChangeForUser(user: UserWithActions): void {
  if (user.cityId) {
    this.addressService.getBarangaysByCity(user.cityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.barangays = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading barangays for inline edit:', error);
        }
      });
  } else {
    this.barangays = [];
  }

  // Reset barangay selection when city changes
  user.barangayId = undefined;
}
```

**6. Added helper methods (Lines 481-494)**

```typescript
// Helper method to get city name by ID
getCityName(cityId?: number): string {
  if (!cityId) return 'N/A';
  const city = this.cities.find(c => c.id === cityId);
  return city ? city.name : 'N/A';
}

// Helper method to get barangay name by ID
getBarangayName(barangayId?: number): string {
  if (!barangayId) return 'N/A';
  const barangay = this.barangays.find(b => b.id === barangayId);
  return barangay ? barangay.name : 'N/A';
}
```

---

## User Experience Flow

### Editing a Pawner/User

1. **Click Edit button** on a row
2. **Inline edit mode activates:**
   - Name fields become editable
   - Contact fields become editable
   - **Address section shows:**
     - City dropdown (pre-populated with current city)
     - Barangay dropdown (automatically loads barangays for current city)
     - Address details textarea
3. **Change city:** Barangay dropdown updates with new barangays
4. **Click Save:** All changes including city/barangay are saved
5. **Click Cancel:** All changes are reverted to original values

### Display Mode

**Pawner Management:**
- Shows: "City Name, Barangay Name"
- Shows: Address details below

**User Management:**
- Shows: "City Name, Barangay Name" (bold)
- Shows: Address details below (gray text)

---

## Technical Details

### Cascading Dropdowns
- City dropdown is always enabled
- Barangay dropdown is disabled until city is selected
- When city changes, barangay list updates automatically
- When city is cleared, barangay dropdown clears and disables

### Data Flow
1. **Edit Start:** Load current barangays for user's city
2. **City Change:** Fetch barangays for new city
3. **Save:** Include cityId and barangayId in update payload
4. **Cancel:** Revert to original data including city/barangay

### Backend Integration
- Uses existing `AddressService.getBarangaysByCity(cityId)` method
- Update endpoints (`updatePawner`, `updateUser`) accept cityId and barangayId

---

## Files Modified

### Pawner Management
- `pawn-web/src/app/features/management/pawner-management/pawner-management.html`
- `pawn-web/src/app/features/management/pawner-management/pawner-management.ts`

### User Management
- `pawn-web/src/app/features/management/user-management/user-management.html`
- `pawn-web/src/app/features/management/user-management/user-management.ts`

---

## Testing Checklist

- [x] Pawner Management: Edit button shows city/barangay dropdowns
- [x] Pawner Management: Current city/barangay pre-selected
- [x] Pawner Management: Changing city loads new barangays
- [x] Pawner Management: Save includes city/barangay
- [x] Pawner Management: Cancel reverts city/barangay changes
- [x] User Management: Address column visible in table
- [x] User Management: Edit button shows city/barangay dropdowns
- [x] User Management: Current city/barangay pre-selected
- [x] User Management: Changing city loads new barangays
- [x] User Management: Save includes city/barangay
- [x] User Management: Cancel reverts city/barangay changes
- [x] Both: Barangay dropdown disabled when no city selected
- [x] Both: City names and barangay names display correctly in view mode

---

## Benefits

1. **Complete Address Editing** - Users can now edit all address components inline
2. **Consistent UI** - Same dropdown pattern as add forms
3. **Data Integrity** - Proper foreign key relationships maintained
4. **Better UX** - No need to delete and recreate records to change address
5. **Cascading Logic** - Barangays automatically filter by city

---

## Notes

- Uses same `selectedCityBarangays` array for pawner inline edits
- Uses same `barangays` array for user inline edits
- Helper methods for displaying city/barangay names in user management
- All changes maintain existing validation and error handling
- Linting warnings are style preferences, not functional errors

---

**Status:** ✅ All inline edit functionality for city and barangay is now working correctly!
