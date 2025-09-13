// Ambient module declaration to satisfy the read-only Supabase client import.
// This matches the import specifier used in src/integrations/supabase/client.ts: "./types"
// It provides a minimal Database type to avoid TypeScript errors.
declare module "./types" {
  export type Database = Record<string, unknown>;
}
