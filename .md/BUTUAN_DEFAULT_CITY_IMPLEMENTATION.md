# Butuan Default City Implementation

**Date:** October 12, 2025  
**Status:** ✅ COMPLETE

---

## Overview

Set **Butuan City** as the default city across all address forms in the Pawnshop Management System for better user experience and data consistency.

---

## Implementation Summary

### 1. Profile Settings (✅ Complete)
**File:** `pawn-web/src/app/features/profile/profile.ts`

**Changes:**
- Modified `loadCities()` method to automatically set Butuan as default city
- Logic: After cities load, if no city is currently selected, find Butuan city and set it
- Automatically loads barangays for Butuan when set as default

**Code Location:** Lines 285-307
```typescript
loadCities(): void {
  this.isLoadingCities = true;

  this.http.get<{ success: boolean; data: any[] }>(`${this.addressApiUrl}/cities`)
    .subscribe({
      next: (response) => {
        this.isLoadingCities = false;
        if (response.success && response.data) {
          this.cities = response.data;

          // Set Butuan as default city if no city is selected
          const currentCityId = this.addressForm.get('cityId')?.value;
          if (!currentCityId) {
            const butuanCity = this.cities.find(city =>
              city.name.toLowerCase().includes('butuan')
            );

            if (butuanCity) {
              this.addressForm.patchValue({ cityId: butuanCity.id });
              // Load barangays for Butuan
              this.onCityChange(butuanCity.id.toString());
            }
          }
        }
      },
      error: (error) => {
        this.isLoadingCities = false;
        console.error('Error loading cities:', error);
      }
    });
}
```

---

### 2. Pawner Management (✅ Complete)
**File:** `pawn-web/src/app/features/management/pawner-management/pawner-management.ts`

**Changes:**
- Modified `loadCities()` method to set Butuan as default for new pawner forms
- Only sets default when adding new pawner (not when editing)
- Automatically loads barangays for Butuan

**Code Location:** Lines 101-125
```typescript
loadCities(): void {
  this.addressService.getCities()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        if (response.success) {
          this.cities = response.data.filter((city: City) => city.isActive);

          // Set Butuan as default city when adding new pawner
          if (!this.editingPawnerId) {
            const butuanCity = this.cities.find(city =>
              city.name.toLowerCase().includes('butuan')
            );

            if (butuanCity) {
              this.pawnerForm.patchValue({ cityId: butuanCity.id });
              // Trigger barangays load
              this.onCityChange();
            }
          }
        }
      },
      error: (error: any) => {
        console.error('Error loading cities:', error);
      }
    });
}
```

---

### 3. User Management (✅ Complete)
**File:** `pawn-web/src/app/features/management/user-management/user-management.ts`

**Changes:**
- Modified `loadCities()` method to set Butuan as default for new user forms
- Only sets default when adding new user (not when editing)
- Automatically loads barangays for Butuan

**Code Location:** Lines 372-397
```typescript
loadCities(): void {
  this.addressService.getCities()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        if (response.success) {
          this.cities = response.data;

          // Set Butuan as default city when adding new user
          if (this.showAddForm && !this.editingUserId) {
            const butuanCity = this.cities.find(city =>
              city.name.toLowerCase().includes('butuan')
            );

            if (butuanCity) {
              this.userForm.patchValue({ cityId: butuanCity.id });
              // Trigger barangays load
              this.onCityChange();
            }
          }
        }
      },
      error: (error) => {
        console.error('Error loading cities:', error);
      }
    });
}
```

---

## Behavior Details

### Profile Settings
- **Trigger:** When user opens Address tab
- **Condition:** Only if no city is currently saved
- **Action:** 
  1. Load all cities from database
  2. Find Butuan city (case-insensitive search)
  3. Set city dropdown to Butuan
  4. Automatically load barangays for Butuan

### Pawner Management
- **Trigger:** When adding new pawner (clicking Add Pawner button)
- **Condition:** Only when `editingPawnerId` is null (not editing existing pawner)
- **Action:**
  1. Load all active cities from database
  2. Find Butuan city (case-insensitive search)
  3. Set city dropdown to Butuan in pawner form
  4. Automatically load barangays for Butuan

### User Management
- **Trigger:** When adding new user (clicking Add User button)
- **Condition:** Only when `showAddForm` is true AND `editingUserId` is null
- **Action:**
  1. Load all cities from database
  2. Find Butuan city (case-insensitive search)
  3. Set city dropdown to Butuan in user form
  4. Automatically load barangays for Butuan

---

## Technical Implementation

### Search Logic
All implementations use case-insensitive search to find Butuan:
```typescript
const butuanCity = this.cities.find(city =>
  city.name.toLowerCase().includes('butuan')
);
```

This ensures the city is found regardless of how it's stored in the database:
- "Butuan City"
- "Butuan"
- "BUTUAN CITY"
- etc.

### Cascading Dropdowns
When Butuan is set as default:
1. City dropdown shows "Butuan City" selected
2. Barangay dropdown automatically enables
3. Barangays for Butuan load from `/api/addresses/cities/{cityId}/barangays`
4. User can select specific barangay from the list

---

## Database Dependency

This feature assumes:
- Cities table exists with active Butuan city record
- Barangays table has barangays linked to Butuan city via `city_id`
- API endpoints are working:
  - `GET /api/addresses/cities` - Returns all cities
  - `GET /api/addresses/cities/:cityId/barangays` - Returns barangays for city

---

## User Experience Flow

### Adding New Record (Pawner/User)
1. User clicks "Add Pawner" or "Add User" button
2. Form modal opens with empty fields
3. **City dropdown pre-populated with "Butuan City"** ✨
4. **Barangay dropdown enabled and populated** ✨
5. User selects specific barangay from list
6. User fills other required fields
7. User saves record

### Editing Existing Record
1. User clicks Edit on existing pawner/user
2. Form modal opens with saved data
3. City shows the saved city (not changed to Butuan)
4. Barangays load for the saved city
5. User can modify as needed

### Profile Settings
1. User opens Profile Settings
2. User clicks Address tab
3. If no city saved: **Butuan pre-selected** ✨
4. If city already saved: Shows saved city
5. User can change city/barangay as needed

---

## Benefits

1. **Faster Data Entry** - Users don't need to search for and select Butuan every time
2. **Data Consistency** - Most records will have Butuan as city by default
3. **Better UX** - Reduces repetitive actions for common data
4. **Smart Defaults** - Only applies to new records, preserves existing data
5. **Flexible** - Users can still change to other cities if needed

---

## Testing Checklist

- [x] Profile Settings: Butuan pre-selected on first visit
- [x] Profile Settings: Saved city preserved on subsequent visits
- [x] Pawner Management: Butuan pre-selected for new pawners
- [x] Pawner Management: Existing pawner city preserved when editing
- [x] User Management: Butuan pre-selected for new users
- [x] User Management: Existing user city preserved when editing
- [x] All forms: Barangays load automatically when Butuan selected
- [x] All forms: Users can change city to other options
- [x] All forms: Case-insensitive search works

---

## Related Files

### Frontend Components
- `pawn-web/src/app/features/profile/profile.ts`
- `pawn-web/src/app/features/management/pawner-management/pawner-management.ts`
- `pawn-web/src/app/features/management/user-management/user-management.ts`

### Backend Routes
- `pawn-api/routes/addresses.js` - Cities and barangays endpoints

### Services
- `pawn-web/src/app/core/services/address.service.ts` - Address data fetching

---

## Future Enhancements

### Potential Improvements
1. **Configuration-based default** - Store default city in app config/settings
2. **Branch-based defaults** - Different default cities for different branches
3. **User preference** - Let users set their preferred default city
4. **Smart detection** - Use IP geolocation to suggest nearest city
5. **Recently used** - Remember last used city per user session

---

## Notes

- Implementation uses `find()` with string matching, not hardcoded city ID
- This makes it resilient to database changes/reseeding
- If Butuan city is not found, form simply has no default (graceful degradation)
- Linting warnings about `any` types and constructor injection are style preferences only
- All functionality tested and working correctly

---

**Status:** ✅ All three components successfully implement Butuan as default city
**Impact:** High - Improves data entry speed for all address forms
**Risk:** Low - Only affects new records, existing data unchanged
