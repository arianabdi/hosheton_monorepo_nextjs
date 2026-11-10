'use client';

import React, {createContext, useContext, useRef, useState, useEffect, useCallback} from 'react';
import styles from './Dropdown.module.scss';

const DropdownContext = createContext<any>(null);

const useDropdown = () => {
    const context = useContext(DropdownContext);
    if (!context) throw new Error('Dropdown subcomponents must be used within a <Dropdown>');
    return context;
};

export const Dropdown = ({ children, className = '', ...restProps }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<any>(null);

    const toggle = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: any) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                close();
            }
        };
        const handleEscape = (event: any) => {
            if (event.key === 'Escape') close();
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, close]);

    return (
        <DropdownContext.Provider value={{ isOpen, toggle, close }}>
            <div ref={containerRef} className={`${styles.dropdown} ${className}`} {...restProps}>
                {children}
            </div>
        </DropdownContext.Provider>
    );
};

// ----------------------------------------------------------------------
// DropdownToggle – the button that opens/closes the menu
// ----------------------------------------------------------------------
export const DropdownToggle = ({ children, className = '', ...buttonProps }: any) => {
    const { isOpen, toggle } = useDropdown();

    return (
        <button
            type="button"
            className={`${styles.toggle} ${className}`}
            onClick={toggle}
            aria-expanded={isOpen}
            aria-haspopup="true"
            {...buttonProps}
        >
            {children}
        </button>
    );
};

// ----------------------------------------------------------------------
// DropdownMenu – the container for items (appears when open)
// `end` aligns the menu's inline-end edge with the trigger's inline-end
// edge (RTL/LTR aware) so corner triggers never push the menu off-screen.
// ----------------------------------------------------------------------
export const DropdownMenu = ({ end, ...divProps }: any) => {
    const { isOpen } = useDropdown();

    if (!isOpen) return null;

    return (
        <div
            className={`${styles.menu} ${end ? styles.menuEnd : ''} ${divProps.className || ''}`}
            {...divProps}
        >
            {divProps.children}
        </div>
    );
};

// ----------------------------------------------------------------------
// DropdownItem – a single clickable item inside the menu
// ----------------------------------------------------------------------
export const DropdownItem = ({ children, onClick, className = '',  ...itemProps }: any) => {
    const { close } = useDropdown();

    const handleClick = (event: any) => {
        onClick(event);
        close(); // close dropdown after item click
    };

    return (
        <button
            type="button"
            className={`${styles.item} ${className}`}
            onClick={handleClick}
            {...itemProps}
        >
            {children}
        </button>
    );
};


