import React from 'react';
import Skeleton from '@/Components/Skeleton';

export default function ScriptRowSkeleton() {
    return (
        <tr className="border-b border-slate-50">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-14 rounded-lg flex-shrink-0" />
                    <div className="flex flex-col gap-1.5 w-full max-w-[180px]">
                        <Skeleton className="h-4 w-3/4 rounded-md" />
                        <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <Skeleton className="h-6 w-24 rounded-md" />
            </td>
            <td className="px-6 py-4">
                <Skeleton className="h-6 w-12 rounded-full" />
            </td>
            <td className="px-6 py-4">
                <Skeleton className="h-4 w-10 rounded-md" />
            </td>
            <td className="px-6 py-4 text-right">
                <Skeleton className="h-8 w-24 rounded-lg ml-auto" />
            </td>
        </tr>
    );
}
