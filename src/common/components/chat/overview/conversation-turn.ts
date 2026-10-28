import type { ProcessedProduct } from '../../../types/product';

export interface ConversationTurn {
  id: string;
  title: string;
  queryImageUrl?: string;
  aiText: string;
  products: ProcessedProduct[];
  reqId?: string;
  isLoading: boolean;
  isInitial: boolean;
  productsExpanded: boolean;
}
