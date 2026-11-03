import React from 'react';
import { Text } from '@/Components/Typography';

export default function PageHeader({ title, leftNode, subtitle, actions, children }) {
    return (
        <div className="relative z-40  flex flex-col gap-6 sm:mb-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl space-y-1.5">
                    {title && (
                        typeof title === 'string' ? (
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">
                                {title}
                            </h1>
                        ) : (
                            title
                        )
                    )}
                    {leftNode && leftNode}
                    {subtitle && (
                        <Text variant="sm" className="text-slate-500">
                            {subtitle}
                        </Text>
                    )}
                </div>

                {actions && (
                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                        {actions}
                    </div>
                )}
            </div>

            {children && <div className="w-full">{children}</div>}
        </div>
    );
}
