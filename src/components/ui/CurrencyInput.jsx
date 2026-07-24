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
        e.target.style.borderColor = '#F5B400';
        e.target.style.boxShadow = '0 0 0 3px rgba(245,180,0,0.18)';
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
        e.target.style.borderColor = '#ECECEC';
        e.target.style.boxShadow = 'none';
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {label && (
                <label style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
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
                        left: '14px',
                        color: '#6B7280',
                        fontSize: '14px',
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
                        height: '48px',
                        padding: '0 14px',
                        paddingLeft: prefix ? '30px' : '14px',
                        fontSize: '14px',
                        color: '#111827',
                        backgroundColor: disabled ? '#F3F4F6' : 'white',
                        border: '1px solid #ECECEC',
                        borderRadius: '14px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        transition: 'border-color 150ms, box-shadow 150ms',
                        cursor: disabled ? 'not-allowed' : 'text'
                    }}
                    {...props}
                />
            </div>
        </div>
    );
}
