import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency, parseCurrency } from '../../utils/currency';

/**
 * Currency Input component for Colombian Peso format
 * Displays values with thousands separators (.) while editing
 */
export default function CurrencyInput({
    label,
    value,
    onChange,
    placeholder = '0',
    required = false,
    disabled = false,
    prefix = '$',
    ...props
}) {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);

    // Update display value when external value changes
    useEffect(() => {
        if (value !== null && value !== undefined && value !== '') {
            const num = Number(value);
            if (!isNaN(num) && num !== 0) {
                setDisplayValue(formatCurrency(num));
            } else {
                setDisplayValue('');
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e) => {
        let inputValue = e.target.value;

        // Remove any non-numeric characters except dots
        inputValue = inputValue.replace(/[^0-9.]/g, '');

        // Remove multiple consecutive dots
        inputValue = inputValue.replace(/\.+/g, '.');

        // Update display immediately for user feedback
        setDisplayValue(inputValue);

        // Parse to number and call onChange
        const numericValue = parseCurrency(inputValue);

        // Call parent onChange with numeric value
        if (onChange) {
            // Create a synthetic event with numeric value
            onChange({
                target: {
                    name: props.name,
                    value: numericValue
                }
            });
        }
    };

    const handleFocus = (e) => {
        setIsFocused(true);
        // Show raw number without formatting while focused
        if (value !== null && value !== undefined && value !== '') {
            const num = Number(value);
            if (!isNaN(num) && num !== 0) {
                setDisplayValue(String(num));
            }
        }
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        // Format value on blur
        if (value !== null && value !== undefined && value !== '') {
            const num = Number(value);
            if (!isNaN(num) && num !== 0) {
                setDisplayValue(formatCurrency(num));
            } else {
                setDisplayValue('');
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {label && (
                <label style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#374151'
                }}>
                    {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
                </label>
            )}
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
            }}>
                {prefix && (
                    <span style={{
                        position: 'absolute',
                        left: '12px',
                        color: '#6B7280',
                        fontSize: '13px',
                        pointerEvents: 'none'
                    }}>
                        {prefix}
                    </span>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingLeft: prefix ? '28px' : '12px',
                        fontSize: '13px',
                        backgroundColor: disabled ? '#F3F4F6' : 'white',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        transition: 'border-color 150ms, box-shadow 150ms',
                        cursor: disabled ? 'not-allowed' : 'text'
                    }}
                    {...props}
                />
            </div>
        </div>
    );
}
