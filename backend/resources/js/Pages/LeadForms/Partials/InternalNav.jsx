import {
    LayoutDashboard,
    Hammer,
    Users,
    Settings,
} from 'lucide-react';

export default function InternalNav({ activeTab, onTabChange }) {
    const items = [
        { id: 'summary', label: 'Summary', icon: LayoutDashboard },
        { id: 'editor', label: 'Builder', icon: Hammer },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <nav className="flex flex-col gap-1">
            {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                            ? 'bg-primary-50 text-primary-700 border-primary-500  border-l-2 bg-white shadow-md ring-1 ring-slate-200/50'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50  border-transparent'
                            }`}
                    >
                        <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${isActive ? 'text-primary-900' : 'text-slate-600'}`}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
