export interface Category {
  id: string;
  name: string;
  active: boolean;
}

export interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
