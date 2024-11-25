export interface Database {
    public: {
      Tables: {
        documents: {
          Row: {
            id: string;
            created_at: string;
            user_id: string;
            scrape_source: string;
            summary: string;
          };
          Insert: {
            user_id: string;
            scrape_source: string;
            summary: string;
          };
        };
        chunks: {
          Row: {
            id: string;
            created_at: string;
            document_id: string;
            content: string;
            embeddings: number[];
            chunk_index: number;
          };
          Insert: {
            document_id: string;
            content: string;
            embeddings: number[];
            chunk_index: number;
          };
        };
      };
    };
  }