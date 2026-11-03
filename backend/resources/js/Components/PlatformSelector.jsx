import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { PLATFORMS, PlatformIcon } from '@/Components/PlatformIcons';
import Icon from '@/Components/Icon';

export default function PlatformSelector({ value, onChange, error }) {
    const selectablePlatforms = PLATFORMS.filter(p => p.id !== 'tiktok');
    const selectedPlatform = selectablePlatforms.find(p => p.id === value);

    return (
        <Listbox value={value} onChange={(val) => {
            // Only allow selecting supported platforms
            const p = selectablePlatforms.find(p => p.id === val);
            if (p?.supported) onChange(val);
        }}>
            <div className="relative">
                <Listbox.Button className={`
                    relative w-full cursor-default rounded-xl bg-white h-11 flex items-center pl-4 pr-10 text-left border transition-all outline-hidden
                    ${error ? 'border-red-400 focus:ring-red-50' : 'border-slate-300 hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}
                    sm:text-sm
                `}>
                    <span className="flex items-center gap-3 truncate font-medium text-slate-800">
                        {selectedPlatform ? (
                            <>
                                <div className="flex-shrink-0 scale-90">
                                    <PlatformIcon platform={selectedPlatform.id} padding="p-0" />
                                </div>
                                <span className="font-bold">{selectedPlatform.name}</span>
                            </>
                        ) : (
                            <span className="text-slate-400 font-medium">Select a platform</span>
                        )}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M7 10l5 5 5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                >
                    <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white p-1 text-base shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-hidden sm:text-sm border border-slate-100">
                        {selectablePlatforms.map((p) => (
                            <Listbox.Option
                                key={p.id}
                                className={({ active }) =>
                                    p.supported
                                        ? `relative cursor-default select-none rounded-lg py-2.5 pl-4 pr-4 transition-colors ${active ? 'bg-primary-600 text-white' : 'text-slate-900'}`
                                        : 'relative cursor-not-allowed select-none rounded-lg py-2 pl-4 pr-4 opacity-40'
                                }
                                value={p.id}
                                disabled={!p.supported}
                            >
                                {({ selected, active }) => (
                                    <span className="flex items-center justify-between gap-3 truncate">
                                        <span className={`flex items-center gap-3 ${selected ? 'font-bold' : 'font-medium'}`}>
                                            <div className={`flex-shrink-0 scale-90 transition-transform ${active && p.supported ? 'scale-100' : ''}`}>
                                                <PlatformIcon platform={p.id} padding="p-0" />
                                            </div>
                                            {p.name}
                                        </span>
                                        {selected && (
                                            <span className={`${active ? 'text-white' : 'text-primary-600'}`}>
                                                <Icon name="check" size={4} strokeWidth={3} />
                                            </span>
                                        )}
                                        {!p.supported && (
                                            <span className="text-[9px] font-bold tracking-wide uppercase bg-slate-100 text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full shrink-0">
                                                Soon
                                            </span>
                                        )}
                                    </span>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    );
}


