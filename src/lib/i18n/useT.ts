import { id, type Messages } from './messages.id';

/** Returns the active message catalog. Single locale today (id); English later. */
export function useT(): Messages {
  return id;
}
