import React from 'react';

export default function SectionHeader({ icon: Icon, title, subtitle = null }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
                    {React.isValidElement(Icon) ? (
                        React.cloneElement(Icon, { className: `w-5 h-5 ${Icon.props.className || ''}` })
                    ) : (
                        <Icon className="w-5 h-5" />
                    )}
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">{title}</h3>
                    {subtitle ? (
                        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

