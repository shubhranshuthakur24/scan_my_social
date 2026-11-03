import React from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { PLATFORMS, PlatformIcon } from '@/Components/PlatformIcons';

export default function PlatformPopover({ selectedPlatforms, onToggle, onClear }) {
    return (
        <Popover className="relative">
            {({ open }) => (
                <>
                    <Popover.Button
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200
                            ${open ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-200 hover:bg-slate-50'}
                        `}
                    >
                        <div className="flex -space-x-1.5">
                            {PLATFORMS.map(p => (
                                <div key={p.id} className={`${selectedPlatforms.includes(p.id) ? 'opacity-100 scale-110 z-10' : 'opacity-40'} transition-all`}>
                                    <PlatformIcon platform={p.id} />
                                </div>
                            ))}
                        </div>
                    </Popover.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Popover.Panel className="absolute z-50 mt-3 w-[400px] right-0 lg:left-0 transform">
                            <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black ring-opacity-5 bg-white p-6 border border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-slate-900">Platform</h3>
                                    <button
                                        onClick={onClear}
                                        className="text-xs font-bold text-slate-400 hover:text-primary-600 transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <p className="text-sm text-slate-500 mb-6">Select which platforms to search</p>

                                <div className="flex flex-wrap gap-3">
                                    {PLATFORMS.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => onToggle(p.id)}
                                            className={`
                                                flex items-center gap-3 px-5 py-2.5 rounded-full border-2 transition-all duration-200
                                                ${selectedPlatforms.includes(p.id)
                                                    ? 'bg-primary-50 border-primary-400 text-primary-700 shadow-sm scale-105'
                                                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                                }
                                            `}
                                        >
                                            <div className="scale-125">
                                                <PlatformIcon platform={p.id} className="w-4 h-4" />
                                            </div>
                                            <span className="font-bold text-sm">{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    );
}
