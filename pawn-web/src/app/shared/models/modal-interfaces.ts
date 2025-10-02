// Modal event interfaces for type safety
export interface ModalResult<T = any> {
  success: boolean;
  data?: T;
  action: 'add' | 'cancel' | 'close';
}

export interface CityModalData {
  name: string;
}

export interface BarangayModalData {
  name: string;
  cityId: string;
  cityName: string;
}

export interface CategoryDescriptionModalData {
  description: string;
  categoryId: string;
  categoryName: string;
}

// Modal configuration interfaces
export interface CityModalConfig {
  title?: string;
  placeholder?: string;
}

export interface BarangayModalConfig {
  title?: string;
  placeholder?: string;
  selectedCityId: string;
  selectedCityName: string;
}

export interface CategoryDescriptionModalConfig {
  title?: string;
  placeholder?: string;
  selectedCategoryId: string;
  selectedCategoryName: string;
}