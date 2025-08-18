// This file now acts as a barrel export for all reservation-related services
// The actual implementations have been moved to more focused modules

// Import all services
export * from './reservations';
export * from './availability';
export * from './pricing';
export * from './validation';
export * from './payments';
export * from './checkInOut';

// Keep backward compatibility by re-exporting from the new modules
import { calculateRemainingBalance } from './pricing';
import { performCheckIn, performCheckOut } from './checkInOut';

// Legacy exports for backward compatibility - all functions are now re-exported from their respective modules
// This ensures existing imports continue to work while the codebase is more maintainable
