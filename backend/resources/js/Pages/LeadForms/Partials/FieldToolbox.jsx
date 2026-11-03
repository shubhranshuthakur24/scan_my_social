import {
    Calendar,
    Circle,
    CheckSquare,
    ChevronDownSquare,
    CloudUpload,
    Globe,
    Hash,
    Link as LinkIcon,
    Mail,
    MapPin,
    Phone,
    Plus,
    Star,
    Type,
    Search,
} from 'lucide-react';
import { useState, useMemo } from 'react';

const FIELD_ICONS = {
    text: Type,
    number: Hash,
    email: Mail,
    url: LinkIcon,
    phone: Phone,
    location: MapPin,
    country: Globe,
    date: Calendar,
    dropdown: ChevronDownSquare,
    checkbox: CheckSquare,
    radio: Circle,
    rating: Star,
    upload: CloudUpload,
};

const CATEGORIES = [
    {
        id: 'contact',
        name: 'Contact Details',
        fields: ['text', 'email', 'phone', 'location', 'country']
    },
    {
        id: 'choice',
        name: 'Choice & Input',
        fields: ['dropdown', 'radio', 'checkbox', 'number', 'date']
    },
    {
        id: 'advanced',
        name: 'Advanced Data',
        fields: ['rating', 'url', 'upload']
    }
];

export default function FieldToolbox({ fieldTypes, onAddField }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = useMemo(() => {
        const query = searchQuery.toLowerCase();
        
        return CATEGORIES.map(category => {
            const filteredFields = fieldTypes.filter(type => 
                category.fields.includes(type.type) && 
                (type.label.toLowerCase().includes(query) || type.type.toLowerCase().includes(query))
            );

            return {
                ...category,
                availableFields: filteredFields
            };
        }).filter(category => category.availableFields.length > 0);
    }, [searchQuery, fieldTypes]);

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Toolbox</h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search elements..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-white pl-9 text-xs shadow-sm transition-all focus:border-primary-500 focus:ring-primary-500/10 placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="space-y-8 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
                {filteredCategories.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-xs text-slate-500 font-medium font-mono lowercase">No matches found</p>
                    </div>
                ) : (
                    filteredCategories.map((category) => (
                        <div key={category.id} className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{category.name}</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {category.availableFields.map((item) => {
                                    const Icon = FIELD_ICONS[item.type] || Type;
                                    return (
                                        <button
                                            key={item.type}
                                            type="button"
                                            onClick={() => onAddField(item.type)}
                                            className="flex items-center gap-3 w-full p-2.5 rounded-2xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:border-primary-400 hover:bg-primary-50 transition-all group shadow-sm hover:shadow-md hover:shadow-primary-100/50"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors shadow-inner">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <span className="flex-1 text-left">{item.label}</span>
                                            <Plus className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary-400 group-hover:scale-110 transition-all" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
