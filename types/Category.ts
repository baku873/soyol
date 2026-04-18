export interface Subcategory {
  id: string;
  name: string;
}
export interface Category {
  id: string;
  name: string;
  icon: string;
  image?: string; // Banner image for the category
  subcategories?: Subcategory[];
  productCount?: number;
}
