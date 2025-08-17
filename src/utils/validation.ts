import { isEmpty, isNaN, trim } from 'lodash';
import { VALIDATION_RULES } from '../constants';

/**
 * Validate username
 */
export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
    return `Username must be at least ${VALIDATION_RULES.USERNAME.MIN_LENGTH} characters`;
  }
  if (username.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
    return `Username must be no more than ${VALIDATION_RULES.USERNAME.MAX_LENGTH} characters`;
  }
  if (!VALIDATION_RULES.USERNAME.PATTERN.test(username)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  return null;
}

/**
 * Validate password
 */
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate name
 */
export function validateName(name: string): string | null {
  if (!name) return 'Name is required';
  if (trim(name).length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    return `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters`;
  }
  if (name.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    return `Name must be no more than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate account number
 */
export function validateAccountNumber(accountNumber: string): string | null {
  if (!accountNumber) return 'Account number is required';
  if (accountNumber.length < VALIDATION_RULES.ACCOUNT_NUMBER.MIN_LENGTH) {
    return `Account number must be at least ${VALIDATION_RULES.ACCOUNT_NUMBER.MIN_LENGTH} character`;
  }
  if (accountNumber.length > VALIDATION_RULES.ACCOUNT_NUMBER.MAX_LENGTH) {
    return `Account number must be no more than ${VALIDATION_RULES.ACCOUNT_NUMBER.MAX_LENGTH} characters`;
  }
  if (!VALIDATION_RULES.ACCOUNT_NUMBER.PATTERN.test(accountNumber)) {
    return 'Account number can only contain numbers and hyphens';
  }
  return null;
}

/**
 * Validate account name
 */
export function validateAccountName(accountName: string): string | null {
  if (!accountName) return 'Account name is required';
  if (trim(accountName).length < VALIDATION_RULES.ACCOUNT_NAME.MIN_LENGTH) {
    return `Account name must be at least ${VALIDATION_RULES.ACCOUNT_NAME.MIN_LENGTH} characters`;
  }
  if (accountName.length > VALIDATION_RULES.ACCOUNT_NAME.MAX_LENGTH) {
    return `Account name must be no more than ${VALIDATION_RULES.ACCOUNT_NAME.MAX_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate description
 */
export function validateDescription(description: string): string | null {
  if (!description) return 'Description is required';
  if (trim(description).length < VALIDATION_RULES.DESCRIPTION.MIN_LENGTH) {
    return `Description must be at least ${VALIDATION_RULES.DESCRIPTION.MIN_LENGTH} characters`;
  }
  if (description.length > VALIDATION_RULES.DESCRIPTION.MAX_LENGTH) {
    return `Description must be no more than ${VALIDATION_RULES.DESCRIPTION.MAX_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate amount (positive number)
 */
export function validateAmount(amount: number | string): string | null {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return 'Amount must be a valid number';
  if (numAmount < 0) return 'Amount must be positive';
  if (numAmount === 0) return 'Amount must be greater than zero';
  
  return null;
}

/**
 * Validate email
 */
export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
}

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string): string | null {
  if (isEmpty(value) || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): string | null {
  if (!uuid) return 'ID is required';
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(uuid)) {
    return 'Invalid ID format';
  }
  
  return null;
}

/**
 * Validate date string
 */
export function validateDate(dateStr: string): string | null {
  if (!dateStr) return 'Date is required';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return 'Invalid date format';
  }
  
  return null;
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) return 'Password confirmation is required';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
}
