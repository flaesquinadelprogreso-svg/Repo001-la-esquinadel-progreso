// Utility functions for Colombian currency formatting
// Colombian format: points for thousands, comma for decimals
// Example: 1.500.000,00

/**
 * Format a number to Colombian currency display
 * @param {number} value - The numeric value
 * @returns {string} - Formatted string (e.g., "1.500.000")
 */
export const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';

    const num = Number(value);
    if (isNaN(num)) return '';

    // Round to integer (Colombian pesos don't use decimals)
    const rounded = Math.round(num);

    // Format with thousands separator (.)
    return rounded.toLocaleString('es-CO');
};

/**
 * Format a number with Colombian peso symbol
 * @param {number} value - The numeric value
 * @returns {string} - Formatted string with $ symbol (e.g., "$1.500.000")
 */
export const formatPesos = (value) => {
    if (value === null || value === undefined || value === '') return '$0';

    const num = Number(value);
    if (isNaN(num)) return '$0';

    const rounded = Math.round(num);
    return '$' + rounded.toLocaleString('es-CO');
};

/**
 * Parse a Colombian formatted string to number
 * Handles both user input (with . or ,) and display format
 * @param {string} value - The string value (e.g., "1.500.000" or "1500000")
 * @returns {number} - The numeric value
 */
export const parseCurrency = (value) => {
    if (!value) return 0;

    // Convert to string and trim
    let str = String(value).trim();

    // Remove $ symbol if present
    str = str.replace(/\$/g, '');

    // Remove all spaces
    str = str.replace(/\s/g, '');

    // Handle Colombian format:
    // If there's a comma, treat it as decimal separator
    // Points are thousands separators

    // Check if there's a comma (decimal separator in Colombian format)
    if (str.includes(',')) {
        // Remove points (thousands separators)
        str = str.replace(/\./g, '');
        // Replace comma with point for JavaScript parsing
        str = str.replace(',', '.');
    } else {
        // No comma - just remove points (they're thousands separators)
        str = str.replace(/\./g, '');
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

/**
 * Format input value as user types (Colombian format)
 * @param {string} value - Raw input value
 * @returns {string} - Formatted value with thousands separators
 */
export const formatInputCurrency = (value) => {
    if (!value) return '';

    // Parse to number first
    const num = parseCurrency(value);
    if (num === 0) return '';

    // Format back with thousands separator
    return num.toLocaleString('es-CO');
};

/**
 * Handle input change for currency fields
 * @param {string} inputValue - The raw input value
 * @param {function} onChange - The onChange callback
 * @param {string} name - Optional field name
 */
export const handleCurrencyChange = (inputValue, onChange, name = null) => {
    // Allow empty input
    if (inputValue === '' || inputValue === '$') {
        if (name) {
            onChange({ target: { name, value: '' } });
        } else {
            onChange('');
        }
        return;
    }

    // Parse the value
    const numericValue = parseCurrency(inputValue);

    if (name) {
        onChange({ target: { name, value: numericValue } });
    } else {
        onChange(numericValue);
    }
};

/**
 * Create a currency input handler for React events
 * @param {function} setValue - State setter function
 * @returns {function} - Event handler function
 */
export const createCurrencyHandler = (setValue) => {
    return (e) => {
        const value = e.target.value;

        // Allow only numbers, points, commas, and $
        const cleaned = value.replace(/[^0-9.,$]/g, '');

        // Parse to number
        const numeric = parseCurrency(cleaned);

        setValue(numeric);
    };
};

// ============================================
// PAYMENT VALIDATION UTILITIES
// ============================================

/**
 * Maximum safe value for payment amounts (1 trillion pesos should be more than enough)
 * This prevents JavaScript overflow issues
 */
export const MAX_PAYMENT_AMOUNT = 1000000000000; // 1 trillion

/**
 * Validate and sanitize a payment amount
 * @param {*} value - The value to validate (can be string, number, etc.)
 * @param {number} maxAllowed - Maximum allowed value (e.g., remaining balance)
 * @returns {{ valid: boolean, value: number, error: string|null, adjusted: boolean }}
 */
export const validatePaymentAmount = (value, maxAllowed = MAX_PAYMENT_AMOUNT) => {
    const result = {
        valid: false,
        value: 0,
        error: null,
        adjusted: false
    };

    // Handle null, undefined, empty string
    if (value === null || value === undefined || value === '') {
        result.valid = true;
        result.value = 0;
        return result;
    }

    // Convert to string for initial validation
    const strValue = String(value).trim();

    // Check for non-numeric characters (allow digits, single decimal point, negative sign at start)
    if (!/^-?\d*\.?\d*$/.test(strValue) && !/^-?\d*,?\d*$/.test(strValue)) {
        result.error = 'Valor no válido';
        return result;
    }

    // Parse the value
    let numValue;
    if (typeof value === 'string') {
        numValue = parseCurrency(value);
    } else {
        numValue = Number(value);
    }

    // Check for NaN
    if (isNaN(numValue)) {
        result.error = 'Valor no numérico';
        return result;
    }

    // Check for Infinity
    if (!isFinite(numValue)) {
        result.error = 'Valor infinito no permitido';
        return result;
    }

    // Check for negative values
    if (numValue < 0) {
        result.error = 'No se permiten valores negativos';
        return result;
    }

    // Check for JavaScript number overflow
    if (numValue > Number.MAX_SAFE_INTEGER) {
        // Cap at max allowed or MAX_PAYMENT_AMOUNT
        result.value = Math.min(maxAllowed, MAX_PAYMENT_AMOUNT);
        result.adjusted = true;
        result.error = 'Valor demasiado grande, ajustado automáticamente';
        result.valid = true;
        return result;
    }

    // Check against maximum allowed
    if (numValue > maxAllowed) {
        result.value = maxAllowed;
        result.adjusted = true;
        result.valid = true;
        return result;
    }

    // Check against absolute maximum
    if (numValue > MAX_PAYMENT_AMOUNT) {
        result.value = Math.min(maxAllowed, MAX_PAYMENT_AMOUNT);
        result.adjusted = true;
        result.valid = true;
        return result;
    }

    // Value is valid
    result.valid = true;
    result.value = Math.round(numValue); // Round to integer (pesos)
    return result;
};

/**
 * Sanitize input value for payment amount
 * Returns a safe numeric value, adjusting if necessary
 * @param {*} value - Input value
 * @param {number} maxAllowed - Maximum allowed (e.g., remaining balance)
 * @returns {number} - Sanitized numeric value
 */
export const sanitizePaymentAmount = (value, maxAllowed = MAX_PAYMENT_AMOUNT) => {
    const validation = validatePaymentAmount(value, maxAllowed);
    return validation.value;
};

/**
 * Calculate the total of multiple payments safely
 * @param {Array} payments - Array of payment objects with 'monto' property
 * @returns {number} - Total amount (never NaN, Infinity, or negative)
 */
export const calculatePaymentsTotal = (payments) => {
    if (!Array.isArray(payments) || payments.length === 0) {
        return 0;
    }

    let total = 0;
    for (const payment of payments) {
        if (!payment) continue;

        const monto = parseFloat(payment.monto) || 0;

        // Skip invalid values
        if (isNaN(monto) || !isFinite(monto) || monto < 0) {
            continue;
        }

        // Cap individual payment at MAX_PAYMENT_AMOUNT
        const safeMonto = Math.min(monto, MAX_PAYMENT_AMOUNT);

        // Check for overflow in addition
        if (total + safeMonto > Number.MAX_SAFE_INTEGER) {
            return Number.MAX_SAFE_INTEGER;
        }

        total += safeMonto;
    }

    return Math.round(total);
};

/**
 * Calculate remaining balance for payments
 * @param {number} totalSale - Total sale amount
 * @param {Array} payments - Array of payment objects
 * @param {number} excludeIndex - Index to exclude from calculation (for editing)
 * @returns {number} - Remaining balance
 */
export const calculateRemainingBalance = (totalSale, payments, excludeIndex = -1) => {
    const safeTotal = Math.max(0, Math.min(totalSale, MAX_PAYMENT_AMOUNT));

    if (!Array.isArray(payments) || payments.length === 0) {
        return safeTotal;
    }

    const filteredPayments = excludeIndex >= 0
        ? payments.filter((_, i) => i !== excludeIndex)
        : payments;

    const currentTotal = calculatePaymentsTotal(filteredPayments);
    const remaining = safeTotal - currentTotal;

    // Ensure non-negative
    return Math.max(0, remaining);
};

/**
 * Check if payments are complete (total covered)
 * @param {number} totalSale - Total sale amount
 * @param {Array} payments - Array of payment objects
 * @returns {boolean}
 */
export const arePaymentsComplete = (totalSale, payments) => {
    const totalPaid = calculatePaymentsTotal(payments);
    return totalPaid >= totalSale;
};

/**
 * Check if more payments can be added
 * @param {number} totalSale - Total sale amount
 * @param {Array} payments - Array of payment objects
 * @returns {boolean}
 */
export const canAddMorePayments = (totalSale, payments) => {
    return !arePaymentsComplete(totalSale, payments);
};
