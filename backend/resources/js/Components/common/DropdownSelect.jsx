import { Menu, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { Fragment } from 'react';

export default function DropdownSelect({
    label = '',
    value = '',
    onChange,
    options = [],
    className = '',
    buttonClassName = '',
    optionsClassName = '',
    labelClassName = '',
    ariaLabel,
    disabled = false,
    placeholder = 'Select option',
}) {
    const selectedOption = options.find((option) => String(option.value) === String(value)) || options[0] || null;

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label ? (
                <label className={`block text-[10px] font-black uppercase tracking-wide text-slate-500 ${labelClassName}`}>
                    {label}
                </label>
            ) : null}

            <Menu as="div" className="relative w-full">
                {({ open }) => (
                    <>
                        <Menu.Button
                            disabled={disabled}
                            aria-label={ariaLabel}
                            className={`flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50/50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
                        >
                            <span className="truncate">{selectedOption?.label || placeholder}</span>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </Menu.Button>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className={`absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl focus:outline-none ${optionsClassName}`}>
                                {options.map((option) => {
                                    const isSelected = String(option.value) === String(value);

                                    return (
                                        <Menu.Item key={option.value} disabled={option.disabled}>
                                            {({ active }) => (
                                                <button
                                                    type="button"
                                                    disabled={option.disabled}
                                                    onClick={() => onChange(option.value)}
                                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                                        active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                                                    } ${isSelected ? 'text-primary-700' : ''}`}
                                                >
                                                    <span className="truncate">{option.label}</span>
                                                    {isSelected ? <Check className="h-4 w-4 text-primary-600" aria-hidden="true" /> : null}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    );
                                })}
                            </Menu.Items>
                        </Transition>
                    </>
                )}
            </Menu>
        </div>
    );
}
