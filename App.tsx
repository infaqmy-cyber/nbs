/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  User, 
  TrendingUp, 
  Wallet, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  PieChart as PieChartIcon,
  HelpCircle,
  Briefcase,
  Building2,
  Users,
  Target,
  RefreshCcw,
  Scale,
  FileDown,
  AlertTriangle,
  Calculator,
  Info,
  Coins,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import PusakaFaraid from './components/PusakaFaraid';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface Asset {
  id: string;
  category: string;
  value: number;
}

interface Debt {
  id: string;
  category: string;
  value: number;
}

interface TakafulPolicy {
  id: string;
  name: string;
  yearStarted: string;
  yearEnded: string;
  monthlyContribution: number;
  company: string;
  
  // Income Protection
  deathBenefit: number;
  ciBenefit: number;
  wasiNamePercent: string;
  hibahIncreasePercent: string;
  
  // Medical Card / Other Info
  roomAndBoard: string;
  medicalCardLimit: number;
  hasWaiver: boolean;
  
  isSaved?: boolean;
}

interface SinkingFundItem {
  id: string;
  name: string;
  target: number;
}

interface FinancialData {
  // Personal Info
  name: string;
  dob: string;
  age: number;
  job: string;
  employer: string;
  maritalStatus: string;
  dependents: number;

  // Cash Flow
  monthlyIncome: number;
  monthlyExpenses: number;

  // Assets & Debts
  assets: Asset[];
  debts: Debt[];

  // Takaful Policies
  takafulPolicies?: TakafulPolicy[];

  // Retirement
  targetRetirementAge: number;
  inflationRate: number;
  assetGrowthRate: number;
  lifestyleAdjustmentRate: number;

  // Sinking Fund & Emergency Fund choices
  emergencyFundMonths?: number;
  sinkingFundItems?: SinkingFundItem[];
}

// --- Constants ---

const ASSET_CATEGORIES = ['Tunai / Simpanan / ASB / TH', 'Hartanah Kediaman', 'Hartanah Pelaburan', 'Pelaburan (Emas / Unit Amanah / Dll)', 'Lain-lain'];
const DEBT_CATEGORIES = ['Hutang Hartanah Kediaman', 'Hutang Hartanah Pelaburan', 'Hutang Kereta', 'Hutang Peribadi', 'Hutang Pendidikan', 'Kad Kredit', 'Lain-lain'];

const INITIAL_DATA: FinancialData = {
  name: '',
  dob: '',
  age: 30,
  job: '',
  employer: '',
  maritalStatus: 'Bujang',
  dependents: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  assets: [],
  debts: [],
  takafulPolicies: [],
  targetRetirementAge: 60,
  inflationRate: 3,
  assetGrowthRate: 5,
  lifestyleAdjustmentRate: 70,
  emergencyFundMonths: 3,
  sinkingFundItems: [
    { id: '1', name: 'Belanja Sekolah Anak', target: 0 },
    { id: '2', name: 'Belanja Perayaan', target: 0 },
    { id: '3', name: 'Roadtax & Takaful Kenderaan', target: 0 }
  ],
};

// --- Helper Components ---

const Card = ({ children, className, id }: { children: React.ReactNode; className?: string, id?: string }) => (
  <div id={id} className={cn("bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden card-hover", className)}>
    {children}
  </div>
);

const toTitleCase = (str: string) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

const formatCurrency = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const FormattedNumberInput = ({ value, onChange, placeholder = "0.00", className, id }: { value: number | string; onChange: (val: number) => void; placeholder?: string; className?: string; id?: string }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;

  const getDisplayValue = () => {
    if (isFocused) {
      return localValue;
    }
    return numValue || numValue === 0 ? formatCurrency(numValue) : '';
  };

  const handleFocus = () => {
    setIsFocused(true);
    setLocalValue(numValue ? numValue.toString() : '');
  };

  const handleBlur = () => {
    setIsFocused(false);
    const cleaned = localValue.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      onChange(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cleaned = val.replace(/[^0-9.]/g, '');
    setLocalValue(cleaned);
  };

  return (
    <input
      id={id}
      type="text"
      placeholder={placeholder}
      value={getDisplayValue()}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={className}
    />
  );
};

const formatAmount = (val: number | string, isAge: boolean = false, isInteger: boolean = false) => {
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return '';
  
  if (isAge) {
    return num.toString().padStart(2, '0');
  }

  if (isInteger) {
    return Math.round(num).toString();
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const Input = ({
  label,
  icon: Icon,
  type,
  value,
  onChange,
  suffix,
  options,
  disableTitleCase,
  isInteger,
  containerClassName,
  inputClassName,
  className,
  ...props
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const isNumeric = type === 'number';
  const isAgeField = props.id === 'field-age' || props.id === 'field-target-age';
  const isIntegerField = props.id === 'field-dependents' || props.id === 'field-years-to-retire' || isInteger;

  // For numeric inputs, we want to show formatted value when not focused,
  // and clear it (or show raw) when focused.
  const getDisplayValue = () => {
    if (isNumeric) {
      if (isFocused) return localValue;
      return value || value === 0 ? formatAmount(value, isAgeField, isIntegerField) : '';
    }
    return value;
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (isNumeric) {
      // Store current value to restore if nothing changed
      setLocalValue(value ? value.toString() : '');
    }
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (isNumeric) {
      const cleaned = localValue.replace(/[^0-9.]/g, '');
      const numValue = parseFloat(cleaned);
      if (!isNaN(numValue)) {
        onChange({ target: { value: numValue } });
      } else if (localValue === '') {
        onChange({ target: { value: 0 } });
      }
    }
    if (props.onBlur) props.onBlur(e);
  };

  const handleChange = (e: any) => {
    let val = e.target.value;
    
    if (isNumeric) {
      // Allow only digits and decimal point
      const cleaned = val.replace(/[^0-9.]/g, '');
      setLocalValue(cleaned);
      // We don't call parent onChange yet to allow "disappearing" effect and raw typing
    } else {
      // Text inputs: Title Case
      const formatted = disableTitleCase ? val : toTitleCase(val);
      onChange({ target: { value: formatted } });
    }
  };

  return (
    <div className={cn("space-y-2 flex-1", className?.includes('flex-none') ? '' : 'min-w-[140px]', containerClassName)}>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-2 px-1 min-h-[2.5rem]">
          {Icon && <Icon size={12} className="text-slate-300" />}
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          {...props}
          type={isNumeric ? "text" : type}
          value={getDisplayValue()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className={cn(
            "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-slate-700 placeholder:text-slate-300 text-sm font-medium",
            suffix && "pr-10",
            inputClassName
          )}
        />
        {props.list && options && (
          <datalist id={props.list}>
            {options.map((opt: string) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        )}
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
};

const Select = ({ label, icon: Icon, options, ...props }: any) => (
  <div className={cn("space-y-2 flex-1", props.className?.includes('flex-none') ? '' : 'min-w-[140px]')}>
    {label && (
      <label className="text-[10px] font-bold text-slate-400 flex items-center gap-2 px-1 min-h-[2.5rem]">
        {Icon && <Icon size={12} className="text-slate-300" />}
        {label}
      </label>
    )}
    <div className="relative">
      <select
        {...props}
        className={cn(
          "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-slate-700 appearance-none text-sm font-medium cursor-pointer",
          props.className
        )}
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronRight size={16} className="rotate-90" />
      </div>
    </div>
  </div>
);

// --- STORAGE KEYS & MIGRATION ---
const STORAGE_KEYS = {
  step: '_app_8c6a073e_step',
  activeTab: '_app_8c6a073e_active_tab',
  data: '_app_8c6a073e_data'
};

// Migrate old un-prefixed keys if present on initial load
if (typeof window !== 'undefined') {
  try {
    const oldData = localStorage.getItem('need_base_solution_data');
    const newData = localStorage.getItem(STORAGE_KEYS.data);
    if (oldData && !newData) {
      localStorage.setItem(STORAGE_KEYS.data, oldData);
      const oldStep = localStorage.getItem('need_base_solution_step');
      if (oldStep) localStorage.setItem(STORAGE_KEYS.step, oldStep);
      const oldTab = localStorage.getItem('need_base_solution_active_tab');
      if (oldTab) localStorage.setItem(STORAGE_KEYS.activeTab, oldTab);
    }
  } catch (e) {
    console.error('Migration error', e);
  }
}

// --- Main App Component ---

export default function App() {
  const [step, setStep] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.step);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (parsed >= 1 && parsed <= 5) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to read step from storage', e);
      }
    }
    return 1;
  });
  const [activeTab, setActiveTab] = useState<'simpanan' | 'perlindungan' | 'pelaburan'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.activeTab);
        if (saved === 'simpanan' || saved === 'perlindungan' || saved === 'pelaburan') {
          return saved;
        }
      } catch (e) {
        console.error('Failed to read activeTab from storage', e);
      }
    }
    return 'simpanan';
  });
  const [data, setData] = useState<FinancialData>(INITIAL_DATA);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<TakafulPolicy | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfFormat, setPdfFormat] = useState<'a4' | 'mobile'>('a4');

  // Pusaka & Faraid lifted states
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouse, setSpouse] = useState<'none' | 'suami' | 'isteri'>('none');
  const [mother, setMother] = useState<boolean>(false);
  const [father, setFather] = useState<boolean>(false);
  const [sons, setSons] = useState<number>(0);
  const [daughters, setDaughters] = useState<number>(0);

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const isMobileFmt = pdfFormat === 'mobile';
      const pdf = isMobileFmt 
        ? new jsPDF({ orientation: 'p', unit: 'in', format: [2.38, 4.85] })
        : new jsPDF('p', 'mm', 'a4');
        
      const pageIds = isMobileFmt
        ? [
            'mobile-pdf-page-1',
            'mobile-pdf-page-2',
            'mobile-pdf-page-3',
            'mobile-pdf-page-4',
            'mobile-pdf-page-5',
            'mobile-pdf-page-6',
            'mobile-pdf-page-7',
            'mobile-pdf-page-8'
          ]
        : ['pdf-page-1', 'pdf-page-2', 'pdf-page-3', 'pdf-page-4', 'pdf-page-5', 'pdf-page-6'];
      
      for (let i = 0; i < pageIds.length; i++) {
        const element = document.getElementById(pageIds[i]);
        if (!element) continue;
        
        const canvas = await toCanvas(element, {
          pixelRatio: 2, // Sharp high-resolution render
          backgroundColor: '#ffffff',
          skipFonts: true,
          fontEmbedCSS: ''
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) {
          pdf.addPage();
        }
        
        if (isMobileFmt) {
          // For mobile format, coordinates and size match our custom format in inches (5.4" vertical screen size)
          pdf.addImage(imgData, 'PNG', 0, 0, 2.38, 4.85);
        } else {
          const imgWidth = 210; // A4 width in mm
          const imgHeight = 297; // A4 height in mm
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }
      }
      
      const formatSuffix = isMobileFmt ? '_Mobil' : '_Cetak';
      const fileName = `Laporan_Kewangan_${data.name ? data.name.trim().replace(/\s+/g, '_') : 'Pelanggan'}${formatSuffix}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Gagal menjana PDF', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Load data on mount
  React.useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEYS.data);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && typeof parsed === 'object') {
          const resolved = {
            ...INITIAL_DATA,
            ...parsed,
            assets: Array.isArray(parsed.assets) ? parsed.assets : [],
            debts: Array.isArray(parsed.debts) ? parsed.debts : [],
            takafulPolicies: Array.isArray(parsed.takafulPolicies) ? parsed.takafulPolicies : [],
            sinkingFundItems: Array.isArray(parsed.sinkingFundItems) ? parsed.sinkingFundItems : (INITIAL_DATA.sinkingFundItems || [])
          };
          setData(resolved);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved data', e);
    }
  }, []);

  // Sync policyForm draft when policy selection changes
  React.useEffect(() => {
    if (selectedPolicyId) {
      const policy = data.takafulPolicies?.find(p => p.id === selectedPolicyId);
      if (policy) {
        setPolicyForm({ ...policy });
        setSaveStatus('idle');
      } else {
        setPolicyForm(null);
      }
    } else {
      setPolicyForm(null);
    }
  }, [selectedPolicyId, data.takafulPolicies]);

  const updateForm = (updates: Partial<TakafulPolicy>) => {
    setPolicyForm(prev => prev ? { ...prev, ...updates } : null);
    setSaveStatus('idle');
  };

  // Save step and tab when they change
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.step, step.toString());
    } catch (e) {
      console.error(e);
    }
  }, [step]);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  const steps = [
    { id: 1, title: 'Profil', icon: User },
    { id: 2, title: 'Aliran Tunai', icon: TrendingUp },
    { id: 3, title: 'Aset & Hutang', icon: Wallet },
    { id: 4, title: 'Analisa', icon: ShieldCheck },
    { id: 5, title: 'Pusaka & Faraid', icon: Scale },
  ];

  // --- Handlers ---

  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    // "Harijadi akan datang" - often insurance age is next birthday if more than 6 months or simple calculation
    // User asked for "umur harijadi akan datang" - usually Age + 1 or rounded
    return age + 1;
  };

  const calculateDobFromAge = (age: number) => {
    const today = new Date();
    const year = today.getFullYear() - (age - 1); // Assuming age is "next birthday"
    return `${year}-01-01`;
  };

  const updateData = (updates: Partial<FinancialData>) => {
    setData(prev => {
      const newData = (() => {
        if (updates.dob !== undefined) {
          const syncedAge = calculateAge(updates.dob);
          return { ...prev, ...updates, age: syncedAge };
        } else if (updates.age !== undefined) {
          const syncedDob = calculateDobFromAge(updates.age);
          return { ...prev, ...updates, dob: syncedDob };
        } else {
          return { ...prev, ...updates };
        }
      })();
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
  };

  const addSinkingFundItem = () => {
    const newItem: SinkingFundItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: '',
      target: 0
    };
    const currentItems = data.sinkingFundItems || [];
    updateData({ sinkingFundItems: [...currentItems, newItem] });
  };

  const updateSinkingFundItem = (id: string, updates: Partial<SinkingFundItem>) => {
    const currentItems = data.sinkingFundItems || [];
    const updatedItems = currentItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    updateData({ sinkingFundItems: updatedItems });
  };

  const deleteSinkingFundItem = (id: string) => {
    const currentItems = data.sinkingFundItems || [];
    const updatedItems = currentItems.filter(item => item.id !== id);
    updateData({ sinkingFundItems: updatedItems });
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    setData(prev => {
      const newData = {
        ...prev,
        assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a)
      };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
  };

  const addAsset = () => {
    const id = Math.random().toString(36).substring(2, 9);
    const newAsset: Asset = { id, category: ASSET_CATEGORIES[0], value: 0 };
    setData(prev => {
      const newData = { ...prev, assets: [...prev.assets, newAsset] };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
  };

  const removeAsset = (id: string) => {
    setData(prev => {
      const newData = { ...prev, assets: prev.assets.filter(a => a.id !== id) };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
  };

  const addDebt = () => {
    const id = Math.random().toString(36).substring(2, 9);
    const newDebt: Debt = { id, category: DEBT_CATEGORIES[0], value: 0 };
    setData(prev => {
      const newData = { ...prev, debts: [...prev.debts, newDebt] };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
  };

  const removeDebt = (id: string) => {
    setData(prev => {
      const newData = { ...prev, debts: prev.debts.filter(d => d.id !== id) };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
  };

  const updateDebt = (id: string, updates: Partial<Debt>) => {
    setData(prev => {
      const newData = {
        ...prev,
        debts: prev.debts.map(d => d.id === id ? { ...d, ...updates } : d)
      };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
  };

  const exportRef = React.useRef<HTMLDivElement>(null);

  const addPolicy = () => {
    const id = Math.random().toString(36).substring(2, 9);
    const count = (data.takafulPolicies || []).length + 1;
    const newPolicy: TakafulPolicy = {
      id,
      name: `Sijil Takaful ${count}`,
      company: '',
      yearStarted: '',
      yearEnded: '',
      monthlyContribution: 0,
      deathBenefit: 0,
      ciBenefit: 0,
      wasiNamePercent: '',
      hibahIncreasePercent: '',
      roomAndBoard: '',
      medicalCardLimit: 0,
      hasWaiver: false,
      isSaved: false
    };
    
    setData(prev => {
      const newData = {
        ...prev,
        takafulPolicies: [...(prev.takafulPolicies || []), newPolicy]
      };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
    
    // Select the new policy immediately
    setSelectedPolicyId(id);
  };

  const removePolicy = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setData(prev => {
      const newData = {
        ...prev,
        takafulPolicies: (prev.takafulPolicies || []).filter(p => p.id !== id)
      };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
    if (selectedPolicyId === id) {
      setSelectedPolicyId(null);
    }
  };

  const savePolicy = () => {
    if (!policyForm) return;
    setSaveStatus('saving');
    
    setData(prev => {
      const existingPolicies = prev.takafulPolicies || [];
      const index = existingPolicies.findIndex(p => p.id === policyForm.id);
      let updatedPolicies = [...existingPolicies];
      
      const savedPolicy = { ...policyForm, isSaved: true };
      
      if (index > -1) {
        updatedPolicies[index] = savedPolicy;
      } else {
        updatedPolicies.push(savedPolicy);
      }
      
      const newData = { ...prev, takafulPolicies: updatedPolicies };
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(newData));
      return newData;
    });
    
    setTimeout(() => {
      setSaveStatus('saved');
    }, 400);
  };

  const resetData = () => {
    if (window.confirm('Adakah anda pasti untuk memadam semua data dan mulakan semula?')) {
      localStorage.removeItem(STORAGE_KEYS.data);
      localStorage.removeItem(STORAGE_KEYS.step);
      localStorage.removeItem(STORAGE_KEYS.activeTab);
      setData(INITIAL_DATA);
      setStep(1);
      setActiveTab('simpanan');
      setSelectedPolicyId(null);
      setPolicyForm(null);
      setSaveStatus('idle');
    }
  };

  // --- Calculations ---

  const results = useMemo(() => {
    const annualIncome = data.monthlyIncome * 12;
    const annualExpenses = data.monthlyExpenses * 12;
    const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0);
    const totalDebts = data.debts.reduce((sum, d) => sum + d.value, 0);
    const netWorth = totalAssets - totalDebts;

    // Takaful Needs
    const deathBenefit = annualIncome * 10;
    const tpdBenefit = annualIncome * 10;
    const ciBenefit = annualIncome * 5;

    const incomeProtection = deathBenefit; // Base for chart
    const budgetIncomeProtection = annualIncome * 0.10;
    const debtSettlement = totalDebts;
    const totalTakafulNeed = incomeProtection + debtSettlement;

    // Retirement
    const yearsToRetire = Math.max(0, data.targetRetirementAge - data.age);
    
    // 1. Calculate future monthly income adjusted for inflation (Pendapatan Bulanan Masa Depan)
    const futureMonthlyIncomeRaw = data.monthlyIncome * Math.pow(1 + (data.inflationRate / 100), yearsToRetire);
    
    // 2. Adjust for retirement lifestyle (Penggantian Pendapatan Persaraan)
    const requiredMonthlyIncomeRetirement = futureMonthlyIncomeRaw * (data.lifestyleAdjustmentRate / 100);
    const futureAnnualExpenses = requiredMonthlyIncomeRetirement * 12;
    
    // 3. Capital needed at retirement (Assuming 5% return/dividend yield)
    // Pattern: Annual Income / 0.05 (or Annual Income * 20)
    const requiredCapital = futureAnnualExpenses / 0.05;
    
    // Future value of current assets (growing at assetGrowthRate)
    const futureValueAssets = totalAssets * Math.pow(1 + (data.assetGrowthRate / 100), yearsToRetire);
    
    const shortfall = Math.max(0, requiredCapital - futureValueAssets);

    // Emergency Fund (3 or 6 months)
    const emergencyFundMonths = data.emergencyFundMonths || 3;
    const emergencyFundTarget = data.monthlyIncome * emergencyFundMonths;
    const currentSavings = data.assets
      .filter(a => {
        const cat = (a.category || '').toLowerCase();
        return cat === 'tunai/simpanan' || 
               cat === 'tunai / simpanan / asb / th' ||
               cat.includes('tunai') || 
               cat.includes('simpanan') || 
               cat.includes('asb') || 
               cat.includes('th') || 
               cat.includes('tabung haji') || 
               cat.includes('saving') || 
               cat.includes('cash') || 
               cat.includes('bank') || 
               cat.includes('deposit');
      })
      .reduce((sum, a) => sum + a.value, 0);
    const savingsShortfall = Math.max(0, emergencyFundTarget - currentSavings);

    // Sinking Fund
    const sinkingFundItems = data.sinkingFundItems || [];
    const sinkingFundTarget = sinkingFundItems.reduce((sum, item) => sum + item.target, 0);
    const remainingSavingsForSinking = Math.max(0, currentSavings - emergencyFundTarget);
    const sinkingFundShortfall = Math.max(0, sinkingFundTarget - remainingSavingsForSinking);

    // Sijil Takaful cumulative metrics
    const totalTakafulContribution = (data.takafulPolicies || []).reduce((sum, p) => p.isSaved ? sum + (p.monthlyContribution || 0) : sum, 0);
    const annualTakafulContribution = totalTakafulContribution * 12;
    const totalExistingDeathBenefit = (data.takafulPolicies || []).reduce((sum, p) => p.isSaved ? sum + (p.deathBenefit || 0) : sum, 0);
    const totalExistingCIBenefit = (data.takafulPolicies || []).reduce((sum, p) => p.isSaved ? sum + (p.ciBenefit || 0) : sum, 0);

    return {
      annualIncome,
      annualExpenses,
      totalAssets,
      totalDebts,
      netWorth,
      deathBenefit,
      tpdBenefit,
      ciBenefit,
      incomeProtection,
      budgetIncomeProtection,
      debtSettlement,
      totalTakafulNeed,
      yearsToRetire,
      futureMonthlyIncomeRaw,
      requiredMonthlyIncomeRetirement,
      futureAnnualExpenses,
      requiredCapital,
      futureValueAssets,
      shortfall,
      emergencyFundTarget,
      currentSavings,
      savingsShortfall,
      sinkingFundTarget,
      remainingSavingsForSinking,
      sinkingFundShortfall,
      totalTakafulContribution,
      annualTakafulContribution,
      totalExistingDeathBenefit,
      totalExistingCIBenefit
    };
  }, [data]);

  const faraidResults = useMemo(() => {
    const hasChildren = sons > 0 || daughters > 0;
    let rows: { name: string; shareFraction: string; percentage: number; amount: number; }[] = [];
    
    let shareWife = 0;
    let shareHusband = 0;
    let shareMother = 0;
    let shareFather = 0;
    let shareSonsTotal = 0;
    let shareDaughtersTotal = 0;
    let shareBaitulmal = 0;

    const isGharrawiyyah = (spouse !== 'none') && mother && father && !hasChildren;

    if (isGharrawiyyah) {
      if (spouse === 'suami') {
        shareHusband = 1/2;
        shareMother = 1/6;
        shareFather = 1/3;
      } else {
        shareWife = 1/4;
        shareMother = 1/4;
        shareFather = 1/2;
      }
    } else {
      if (spouse === 'suami') {
        shareHusband = hasChildren ? 1/4 : 1/2;
      } else if (spouse === 'isteri') {
        shareWife = hasChildren ? 1/8 : 1/4;
      }

      if (mother) {
        shareMother = hasChildren ? 1/6 : 1/3;
      }

      if (father) {
        shareFather = 1/6;
      }

      const furudSum = shareHusband + shareWife + shareMother + (father ? 1/6 : 0);
      let remaining = 1 - furudSum;

      if (furudSum > 1) {
        const aulScale = 1 / furudSum;
        if (spouse === 'suami') shareHusband *= aulScale;
        if (spouse === 'isteri') shareWife *= aulScale;
        if (mother) shareMother *= aulScale;
        if (father) shareFather = (1/6) * aulScale;
        remaining = 0;
      }

      if (hasChildren) {
        if (sons > 0) {
          const totalUnits = (sons * 2) + daughters;
          const sharePerUnit = remaining / totalUnits;
          shareSonsTotal = (sons * 2) * sharePerUnit;
          shareDaughtersTotal = daughters * sharePerUnit;
          remaining = 0;
        } else {
          let daughterFurud = daughters === 1 ? 1/2 : 2/3;
          if (remaining >= daughterFurud) {
            shareDaughtersTotal = daughterFurud;
            remaining -= daughterFurud;
          } else {
            shareDaughtersTotal = remaining;
            remaining = 0;
          }

          if (father) {
            shareFather += remaining;
            remaining = 0;
          } else {
            shareBaitulmal = remaining;
            remaining = 0;
          }
        }
      } else {
        if (father) {
          shareFather += remaining;
          remaining = 0;
        } else {
          shareBaitulmal = remaining;
          remaining = 0;
        }
      }
    }

    const getFraction = (val: number): string => {
      if (val < 0.0001) return '0';
      const tolerance = 0.0019;
      const fractions = [
        { d: 2, n: 1, s: '1/2' },
        { d: 3, n: 1, s: '1/3' },
        { d: 3, n: 2, s: '2/3' },
        { d: 4, n: 1, s: '1/4' },
        { d: 4, n: 3, s: '3/4' },
        { d: 6, n: 1, s: '1/6' },
        { d: 6, n: 5, s: '5/6' },
        { d: 8, n: 1, s: '1/8' },
        { d: 8, n: 3, s: '3/8' },
        { d: 8, n: 5, s: '5/8' },
        { d: 8, n: 7, s: '7/8' },
        { d: 12, n: 1, s: '1/12' },
        { d: 12, n: 5, s: '5/12' },
        { d: 12, n: 7, s: '7/12' },
        { d: 24, n: 1, s: '1/24' },
        { d: 24, n: 5, s: '5/24' },
        { d: 24, n: 7, s: '7/24' },
        { d: 24, n: 11, s: '11/24' },
        { d: 24, n: 13, s: '13/24' },
        { d: 24, n: 17, s: '17/24' },
        { d: 24, n: 19, s: '19/24' },
        { d: 24, n: 23, s: '23/24' },
      ];
      
      const match = fractions.find(f => Math.abs((f.n / f.d) - val) < tolerance);
      if (match) return match.s;
      
      const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
      const denom = 3072;
      const numer = Math.round(val * denom);
      const divisor = gcd(numer, denom);
      return `${numer/divisor}/${denom/divisor}`;
    };

    const targetEstate = estateValue || results.netWorth;

    if (shareHusband > 0) {
      rows.push({
        name: 'Suami',
        shareFraction: getFraction(shareHusband),
        percentage: shareHusband * 100,
        amount: shareHusband * targetEstate
      });
    }

    if (shareWife > 0) {
      rows.push({
        name: 'Isteri',
        shareFraction: getFraction(shareWife),
        percentage: shareWife * 100,
        amount: shareWife * targetEstate
      });
    }

    if (shareMother > 0) {
      rows.push({
        name: 'Ibu',
        shareFraction: getFraction(shareMother),
        percentage: shareMother * 100,
        amount: shareMother * targetEstate
      });
    }

    if (shareFather > 0) {
      rows.push({
        name: 'Bapa',
        shareFraction: getFraction(shareFather),
        percentage: shareFather * 100,
        amount: shareFather * targetEstate
      });
    }

    if (shareSonsTotal > 0 && sons > 0) {
      const perSon = shareSonsTotal / sons;
      rows.push({
        name: `${sons} Anak Lelaki (Setiap Seorang)`,
        shareFraction: getFraction(perSon),
        percentage: perSon * 100,
        amount: perSon * targetEstate
      });
    }

    if (shareDaughtersTotal > 0 && daughters > 0) {
      const perDaughter = shareDaughtersTotal / daughters;
      rows.push({
        name: `${daughters} Anak Perempuan (Setiap Seorang)`,
        shareFraction: getFraction(perDaughter),
        percentage: perDaughter * 100,
        amount: perDaughter * targetEstate
      });
    }

    if (shareBaitulmal > 0) {
      rows.push({
        name: 'Waris lain / Baitulmal',
        shareFraction: getFraction(shareBaitulmal),
        percentage: shareBaitulmal * 100,
        amount: shareBaitulmal * targetEstate
      });
    }

    return rows;
  }, [estateValue, spouse, mother, father, sons, daughters, results.netWorth]);

  // --- Render Steps ---

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                id="field-name"
                label="Nama penuh" 
                icon={User} 
                value={data.name} 
                onChange={(e: any) => updateData({ name: e.target.value })} 
                placeholder="cth: Ahmad Bin Ismail"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  id="field-dob"
                  label="Tarikh lahir" 
                  type="date" 
                  value={data.dob} 
                  onChange={(e: any) => updateData({ dob: e.target.value })} 
                />
                <Input 
                  id="field-age"
                  label="Umur semasa" 
                  type="number" 
                  value={data.age} 
                  onChange={(e: any) => updateData({ age: parseInt(e.target.value) || 0 })} 
                />
              </div>
              <Input 
                id="field-job"
                label="Pekerjaan" 
                icon={Briefcase} 
                value={data.job} 
                onChange={(e: any) => updateData({ job: e.target.value })} 
                placeholder="cth: Jurutera"
              />
              <Input 
                id="field-employer"
                label="Majikan" 
                icon={Building2} 
                value={data.employer} 
                onChange={(e: any) => updateData({ employer: e.target.value })} 
                placeholder="cth: Petronas"
              />
              <Select 
                id="field-marital"
                label="Status perkahwinan" 
                value={data.maritalStatus} 
                options={['Bujang', 'Berkahwin', 'Duda/Balu']} 
                onChange={(e: any) => updateData({ maritalStatus: e.target.value })}
              />
              <Input 
                id="field-dependents"
                label="Jumlah tanggungan" 
                icon={Users} 
                type="number" 
                value={data.dependents} 
                onChange={(e: any) => updateData({ dependents: parseInt(e.target.value) || 0 })} 
              />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card id="income-card" className="p-4 bg-emerald-50/30 border-emerald-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                    <TrendingUp size={16} />
                  </div>
                  <h3 className="font-bold text-sm text-emerald-900">Pendapatan</h3>
                </div>
                <div className="space-y-3">
                  <Input 
                    id="field-monthly-income"
                    label="Pendapatan bulanan (RM)" 
                    type="number" 
                    value={data.monthlyIncome} 
                    onChange={(e: any) => updateData({ monthlyIncome: parseFloat(e.target.value) || 0 })} 
                  />
                  <div className="p-3 bg-white border border-emerald-100 rounded-lg">
                    <div className="text-[9px] text-emerald-600 font-bold mb-0.5">Anggaran tahunan</div>
                    <div className="text-xl font-mono font-bold text-emerald-700">
                      RM {formatCurrency(data.monthlyIncome * 12)}
                    </div>
                  </div>
                </div>
              </Card>
 
              <Card id="expense-card" className="p-4 bg-rose-50/30 border-rose-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-rose-500 text-white rounded-lg">
                    <Wallet size={16} />
                  </div>
                  <h3 className="font-bold text-sm text-rose-900">Perbelanjaan</h3>
                </div>
                <div className="space-y-3">
                  <Input 
                    id="field-monthly-expenses"
                    label="Perbelanjaan bulanan (RM)" 
                    type="number" 
                    value={data.monthlyExpenses} 
                    onChange={(e: any) => updateData({ monthlyExpenses: parseFloat(e.target.value) || 0 })} 
                  />
                   <div className="p-3 bg-white border border-rose-100 rounded-lg">
                    <div className="text-[9px] text-rose-600 font-bold mb-0.5">Anggaran tahunan</div>
                    <div className="text-xl font-mono font-bold text-rose-700">
                      RM {formatCurrency(data.monthlyExpenses * 12)}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Rumusan Aliran Tunai */}
            <Card id="cashflow-summary-card" className="p-5 bg-slate-50 border border-slate-200/60 rounded-[1.5rem] shadow-sm">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2 select-none mb-4">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                Rumusan Aliran Tunai (Pendapatan - Perbelanjaan)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                {/* Pendapatan Bulanan */}
                <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-black text-emerald-800/60 uppercase tracking-wider">Jumlah Pendapatan</div>
                    <div className="text-xs text-slate-400 mt-0.5">Bulanan (Anggaran Tahunan)</div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-mono font-black text-emerald-700">RM {formatCurrency(data.monthlyIncome)}</div>
                    <div className="text-[10px] font-mono text-emerald-600/80">RM {formatCurrency(data.monthlyIncome * 12)}/thn</div>
                  </div>
                </div>

                {/* Perbelanjaan Bulanan */}
                <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-black text-rose-800/60 uppercase tracking-wider">Jumlah Perbelanjaan</div>
                    <div className="text-xs text-slate-400 mt-0.5">Bulanan (Anggaran Tahunan)</div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-mono font-black text-rose-700">RM {formatCurrency(data.monthlyExpenses)}</div>
                    <div className="text-[10px] font-mono text-rose-600/80">RM {formatCurrency(data.monthlyExpenses * 12)}/thn</div>
                  </div>
                </div>

                {/* Aliran Tunai Bersih (Baki) */}
                {(() => {
                  const monthlyNet = data.monthlyIncome - data.monthlyExpenses;
                  const annualNet = monthlyNet * 12;
                  const isPositive = monthlyNet > 0;
                  const isNegative = monthlyNet < 0;
                  
                  let bgClass = "bg-slate-100/60 border-slate-200";
                  let textClass = "text-slate-700";
                  let subtextClass = "text-slate-500";
                  let statusLabel = "Aliran Tunai Bersih (Sifar)";
                  let badgeBg = "bg-slate-200 text-slate-700";

                  if (isPositive) {
                    bgClass = "bg-emerald-500/10 border-emerald-200/60";
                    textClass = "text-emerald-700";
                    subtextClass = "text-emerald-600";
                    statusLabel = "Lebihan (Surplus)";
                    badgeBg = "bg-emerald-500 text-white";
                  } else if (isNegative) {
                    bgClass = "bg-rose-500/10 border-rose-200/60";
                    textClass = "text-rose-600";
                    subtextClass = "text-rose-500";
                    statusLabel = "Defisit (Kurangan)";
                    badgeBg = "bg-rose-500 text-white";
                  }

                  return (
                    <div className={cn("p-4 border rounded-xl flex flex-col justify-between transition-colors", bgClass)}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-black text-slate-800/60 uppercase tracking-wider">Aliran Tunai Bersih</div>
                          <div className="text-xs text-slate-400 mt-0.5">Pendapatan - Perbelanjaan</div>
                        </div>
                        <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full", badgeBg)}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className={cn("text-xl font-mono font-black", textClass)}>
                          RM {formatCurrency(monthlyNet)}
                        </div>
                        <div className={cn("text-[10px] font-mono", subtextClass)}>
                          RM {formatCurrency(annualNet)}/thn
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Formula & Status Text */}
              <div className="mt-4 p-3 bg-white border border-slate-100 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-800">Formula Aliran Tunai:</span>
                  <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">RM {formatCurrency(data.monthlyIncome)} (Pendapatan)</span>
                  <span className="text-slate-400 font-bold">-</span>
                  <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">RM {formatCurrency(data.monthlyExpenses)} (Belanja)</span>
                  <span className="text-slate-400 font-bold">=</span>
                  <span className={cn("font-mono font-bold px-1.5 py-0.5 rounded border", 
                    data.monthlyIncome - data.monthlyExpenses > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                    data.monthlyIncome - data.monthlyExpenses < 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-600 border-slate-100"
                  )}>
                    RM {formatCurrency(data.monthlyIncome - data.monthlyExpenses)}
                  </span>
                </div>
                
                {data.monthlyIncome - data.monthlyExpenses > 0 ? (
                  <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 self-start lg:self-auto">
                    Tahniah! Anda mempunyai baki aliran tunai bulanan yang positif.
                  </div>
                ) : data.monthlyIncome - data.monthlyExpenses < 0 ? (
                  <div className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 self-start lg:self-auto">
                    Amaran! Perbelanjaan bulanan anda melebihi pendapatan bulanan anda. Sila semak semula bajet anda.
                  </div>
                ) : (
                  <div className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 self-start lg:self-auto">
                    Aliran tunai anda berada pada tahap seimbang.
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        );

      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-4 mb-4">
              <HelpCircle className="text-amber-500 shrink-0 mt-1" size={20} />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">Cara kira Nilai Bersih</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Sila klik butang <strong>+ Tambah</strong> di bawah untuk memasukkan nilai aset (seperti baki bank, simpanan KWSP, ASB, hartanah kediaman, hartanah pelaburan) 
                  dan hutang anda. Nilai Bersih akan dikira secara automatik berdasarkan perbezaan antara jumlah aset dan hutang.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Assets Section */}
              <div id="assets-section" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" size={20} />
                    Senarai aset
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.assets.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                      Tiada aset ditambahkan lagi.
                    </div>
                  )}
                  {data.assets.map(asset => (
                    <div key={asset.id} className="flex flex-col sm:flex-row sm:items-end gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-4 relative group">
                      <Input 
                        id={`asset-cat-${asset.id}`}
                        label="Kategori" 
                        type="text"
                        value={asset.category} 
                        list="asset-categories-list"
                        options={ASSET_CATEGORIES}
                        disableTitleCase={true}
                        onChange={(e: any) => updateAsset(asset.id, { category: e.target.value })}
                      />
                      <Input 
                        id={`asset-val-${asset.id}`}
                        label="Nilai (RM)" 
                        type="number" 
                        value={asset.value} 
                        onChange={(e: any) => updateAsset(asset.id, { value: parseFloat(e.target.value) || 0 })}
                      />
                      <button 
                         id={`asset-del-${asset.id}`}
                        onClick={() => removeAsset(asset.id)}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors group flex-none self-end sm:self-auto"
                        title="Padam"
                      >
                        <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Debts Section */}
              <div id="debts-section" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Wallet className="text-rose-500" size={20} />
                    Senarai hutang
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.debts.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                      Tiada hutang ditambahkan lagi.
                    </div>
                  )}
                  {data.debts.map(debt => (
                    <div key={debt.id} className="flex flex-col sm:flex-row sm:items-end gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-4 relative group">
                      <Input 
                        id={`debt-cat-${debt.id}`}
                        label="Kategori" 
                        type="text"
                        value={debt.category} 
                        list="debt-categories-list"
                        options={DEBT_CATEGORIES}
                        disableTitleCase={true}
                        onChange={(e: any) => updateDebt(debt.id, { category: e.target.value })}
                      />
                      <Input 
                        id={`debt-val-${debt.id}`}
                        label="Jumlah (RM)" 
                        type="number" 
                        value={debt.value} 
                        onChange={(e: any) => updateDebt(debt.id, { value: parseFloat(e.target.value) || 0 })}
                      />
                      <button 
                        id={`debt-del-${debt.id}`}
                        onClick={() => removeDebt(debt.id)}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors group flex-none self-end sm:self-auto"
                        title="Padam"
                      >
                        <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
               <div className="bg-emerald-500 p-4 rounded-xl text-white">
                  <div className="text-[10px] font-bold opacity-80 mb-1">Jumlah Aset</div>
                  <div className="text-2xl font-mono font-bold">RM {formatCurrency(results.totalAssets)}</div>
               </div>
               <div className="bg-rose-500 p-4 rounded-xl text-white">
                  <div className="text-[10px] font-bold opacity-80 mb-1">Jumlah Hutang</div>
                  <div className="text-2xl font-mono font-bold">RM {formatCurrency(results.totalDebts)}</div>
               </div>
               <div className="bg-slate-800 p-4 rounded-xl text-white">
                  <div className="text-[10px] font-bold opacity-80 mb-1">Nilai Bersih</div>
                  <div className="text-2xl font-mono font-bold">RM {formatCurrency(results.netWorth)}</div>
               </div>
            </div>

            {/* Floating Add Buttons */}
            <div className="fixed bottom-28 right-6 z-50 flex flex-col sm:flex-row gap-3 no-print">
               <button
                 id="float-add-asset"
                 onClick={addAsset}
                 className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-full shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all border-0 cursor-pointer text-xs sm:text-sm"
               >
                 <Plus size={16} />
                 <span>Tambah Aset</span>
               </button>
               <button
                 id="float-add-debt"
                 onClick={addDebt}
                 className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-3 rounded-full shadow-xl shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all border-0 cursor-pointer text-xs sm:text-sm"
               >
                 <Plus size={16} />
                 <span>Tambah Hutang</span>
               </button>
            </div>
          </motion.div>
        );

      case 4:
        const pieData = [
          { name: 'Income Protection', value: results.incomeProtection, color: '#0d8de7' },
          { name: 'Debt Settlement', value: results.debtSettlement, color: '#f43f5e' },
        ];

        const tabs = [
          { id: 'simpanan', label: 'Simpanan', icon: Wallet },
          { id: 'perlindungan', label: 'Perlindungan', icon: ShieldCheck },
          { id: 'pelaburan', label: 'Pelaburan', icon: Target },
        ] as const;

        return (
          <div className="space-y-12">
            <motion.div 
              id="report-capture-area"
              ref={exportRef}
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-4 p-2 md:p-6 rounded-[1.5rem] bg-[#fcfdfe]"
            >
              {/* Header / Intro */}
              <div className="text-center space-y-1 bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2 opacity-5">
                    <PieChartIcon size={60} />
                 </div>
                 <h2 className="text-xl font-display font-black text-slate-900">Analisis Keperluan Kewangan</h2>
                 <p className="text-xs text-slate-500 font-medium">Disediakan secara eksklusif untuk <br /> <span className="text-primary-600 font-bold">{data.name || 'Hamba Allah'}</span></p>
                 <div className="flex justify-center flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[8px] font-bold text-slate-500 tracking-wider transition-colors">{data.job || 'Kerjaya'}</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[8px] font-bold text-slate-500 tracking-wider transition-colors">{data.age} Tahun</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[8px] font-bold text-slate-500 tracking-wider transition-colors">{data.maritalStatus}</span>
                 </div>

                  <div className="grid grid-cols-4 gap-1 pt-4 mt-4 border-t border-slate-100">
                    <div className="text-center border-r border-slate-100">
                      <div className="text-[8px] font-black text-slate-400 mb-1 tracking-tight leading-none">Pendapatan<br/>tahunan</div>
                      <div className="text-xs font-mono font-black text-slate-800">RM {formatCurrency(data.monthlyIncome * 12)}</div>
                    </div>
                    <div className="text-center border-r border-slate-100">
                      <div className="text-[8px] font-black text-slate-400 mb-1 tracking-tight leading-none">Perbelanjaan<br/>tahunan</div>
                      <div className="text-xs font-mono font-black text-slate-800">RM {formatCurrency(data.monthlyExpenses * 12)}</div>
                    </div>
                    <div className="text-center border-r border-slate-100">
                      <div className="text-[8px] font-black text-slate-400 mb-1 tracking-tight leading-none">Total<br/>aset</div>
                      <div className="text-xs font-mono font-black text-slate-800">RM {formatCurrency(results.totalAssets)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] font-black text-slate-400 mb-1 tracking-tight leading-none">Total<br/>liabiliti</div>
                      <div className="text-xs font-mono font-black text-slate-800">RM {formatCurrency(results.totalDebts)}</div>
                    </div>
                 </div>
              </div>

              {/* Tab Switcher - Shown in UI, maybe simplified in print if needed but keeping it for now */}
              <div className="flex justify-center p-1 bg-slate-100 rounded-2xl max-w-md mx-auto no-print">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all",
                        activeTab === t.id 
                          ? "bg-white text-primary-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="min-h-[600px]">
                <AnimatePresence mode="wait">
                  {activeTab === 'simpanan' && (
                    <motion.div 
                      key="simpanan"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8"
                    >
                      {/* Tab Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
                            <Wallet size={20} />
                          </div>
                          <div>
                            <h3 className="text-lg font-display font-black text-slate-900 leading-tight">Sistem Agihan Tabungan</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Langkah membahagikan aset tunai untuk pelbagai keperluan hidup</p>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 flex items-center justify-between gap-3 sm:justify-start">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Tunai Sedia Ada:</span>
                          <span className="text-base font-mono font-black text-slate-800">RM {formatCurrency(results.currentSavings)}</span>
                        </div>
                      </div>

                      {/* Two Main Columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* 1. EMERGENCY FUND (TABUNG KECEMASAN) */}
                        <div className="space-y-6">
                          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-6 relative overflow-hidden">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">1. Emergency Fund (Tabung Kecemasan)</h4>
                              </div>
                              <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full uppercase tracking-wider">dana serta merta</span>
                            </div>

                            <p className="text-slate-500 text-xs font-medium leading-relaxed">
                              Dana kecemasan sangat penting untuk melindungi anda sekiranya berlaku musibah kemalangan kecil, paip bocor, dompet hilang, batuk demam atau worst case scenario jika kehilangan pekerjaan.
                            </p>

                            {/* Option Selector */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pilih Tempoh Jaminan (Bulan Pendapatan)</label>
                              <div className="flex bg-slate-100 rounded-xl p-1 w-full">
                                <button 
                                  type="button"
                                  onClick={() => updateData({ emergencyFundMonths: 3 })}
                                  className={cn(
                                    "flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                                    (data.emergencyFundMonths || 3) === 3 
                                      ? "bg-white text-emerald-700 shadow-sm" 
                                      : "text-slate-500 hover:text-slate-700"
                                  )}
                                >
                                  3 Bulan Pendapatan
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => updateData({ emergencyFundMonths: 6 })}
                                  className={cn(
                                    "flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                                    (data.emergencyFundMonths || 3) === 6 
                                      ? "bg-white text-emerald-700 shadow-sm" 
                                      : "text-slate-500 hover:text-slate-700"
                                  )}
                                >
                                  6 Bulan Pendapatan
                                </button>
                              </div>
                            </div>

                            {/* Comparison Metrics */}
                            <div className="grid grid-cols-1 gap-3">
                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sasaran Simpanan ({(data.emergencyFundMonths || 3)} bln)</div>
                                <div className="text-lg font-mono font-black text-slate-900">RM {formatCurrency(results.emergencyFundTarget)}</div>
                                <div className="text-[9px] text-slate-400 mt-1 font-medium">
                                  (RM {formatCurrency(data.monthlyIncome)} x {data.emergencyFundMonths || 3} bulan)
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tunai Sedia Ada</div>
                                <div className="text-lg font-mono font-black text-emerald-600">RM {formatCurrency(results.currentSavings)}</div>
                                <div className="text-[9px] text-slate-400 mt-1 font-medium">
                                  Berdasarkan aset Tunai / Simpanan / ASB / TH
                                </div>
                              </div>

                              <div className={cn(
                                "p-4 rounded-2xl border transition-colors",
                                results.savingsShortfall > 0 
                                  ? "bg-rose-50/50 border-rose-100 text-rose-900" 
                                  : "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                              )}>
                                <div className="text-[9px] font-black uppercase tracking-widest mb-1">
                                  {results.savingsShortfall > 0 ? "Jumlah Kekurangan (Shortfall)" : "Status Simpanan"}
                                </div>
                                <div className={cn(
                                  "text-lg font-mono font-black",
                                  results.savingsShortfall > 0 ? "text-rose-600" : "text-emerald-600"
                                )}>
                                  {results.savingsShortfall > 0 
                                    ? `RM ${formatCurrency(results.savingsShortfall)}` 
                                    : "Mencukupi"
                                  }
                                </div>
                                <div className="text-[9px] opacity-80 mt-1 font-medium">
                                  {results.savingsShortfall > 0 
                                    ? "Perlu tambahan simpanan" 
                                    : "Simpanan mencukupi"
                                  }
                                </div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-slate-400 uppercase tracking-widest">Status Pencapaian</span>
                                <span className={cn(
                                  results.savingsShortfall > 0 ? "text-amber-600" : "text-emerald-600"
                                )}>
                                  {Math.round(Math.min(100, (results.currentSavings / results.emergencyFundTarget) * 100))}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-500 rounded-full",
                                    results.savingsShortfall > 0 ? "bg-amber-500" : "bg-emerald-500"
                                  )}
                                  style={{ width: `${Math.min(100, (results.currentSavings / results.emergencyFundTarget) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Alert Status Card */}
                            <div className={cn(
                              "p-4 rounded-2xl flex items-start gap-3 border",
                              results.savingsShortfall > 0 
                                ? "bg-amber-50/50 border-amber-100/80 text-amber-900" 
                                : "bg-emerald-50/50 border-emerald-100/80 text-emerald-900"
                            )}>
                              {results.savingsShortfall > 0 ? (
                                <>
                                  <div className="p-1.5 bg-amber-500 text-white rounded-lg flex-none mt-0.5">
                                    <HelpCircle size={16} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <h5 className="text-xs font-black uppercase tracking-wider">Perlu Tambahan Dana</h5>
                                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                                      Simpanan semasa anda belum mencukupi sasaran kecemasan. Anda memerlukan tambahan sebanyak <span className="font-extrabold text-amber-900">RM {formatCurrency(results.savingsShortfall)}</span> lagi.
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="p-1.5 bg-emerald-500 text-white rounded-lg flex-none mt-0.5">
                                    <ShieldCheck size={16} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <h5 className="text-xs font-black uppercase tracking-wider">Tahniah! Simpanan Mencukupi</h5>
                                    <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                                      Dana kecemasan anda berada dalam tahap selamat dan mencukupi untuk kelangsungan hidup selama {data.emergencyFundMonths || 3} bulan sekiranya berlaku sebarang gangguan pendapatan.
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="p-4 bg-slate-900 rounded-2xl text-white">
                            <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                              <strong>NASIHAT:</strong> Pastikan dana kecemasan ini disimpan dalam instrumen berisiko rendah dan sangat cair (liquid) seperti akaun simpanan biasa, ASB (Amanah Saham Bumiputera), atau Tabung Haji yang boleh dikeluarkan dengan segera apabila diperlukan.
                            </p>
                          </div>
                        </div>

                        {/* 2. SINKING FUND (TABUNGAN SEPANJANG TAHUN) */}
                        <div className="space-y-6">
                          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">2. Sinking Fund (Tabung Berasas Matlamat)</h4>
                              </div>
                              <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full uppercase tracking-wider">Matlamat Khas</span>
                            </div>

                            <p className="text-slate-500 text-xs font-medium leading-relaxed">
                              Sinking Fund disediakan khusus untuk perbelanjaan bukan kecemasan yang boleh dijangka waktunya (misalnya: cukai jalan, takaful kenderaan, perbelanjaan perayaan, atau yuran sekolah anak-anak).
                            </p>

                            {/* Item List */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senarai Matlamat Sinking Fund</label>
                                <button
                                  type="button"
                                  onClick={addSinkingFundItem}
                                  className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Plus size={12} />
                                  Tambah Matlamat
                                </button>
                              </div>

                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {(data.sinkingFundItems || []).length === 0 ? (
                                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                                    Tiada matlamat ditambahkan lagi. Klik butang di atas untuk menambah.
                                  </div>
                                ) : (
                                  (data.sinkingFundItems || []).map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 bg-slate-50/50 p-2 border border-slate-100 rounded-xl hover:border-slate-200 transition-all">
                                      <div className="flex-1">
                                        <input
                                          type="text"
                                          placeholder="Nama perbelanjaan (cth: Cukai Jalan)"
                                          value={item.name}
                                          onChange={(e) => updateSinkingFundItem(item.id, { name: e.target.value })}
                                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 text-slate-700 placeholder:text-slate-300"
                                        />
                                      </div>
                                      <div className="relative w-28 flex-none">
                                        <FormattedNumberInput
                                          placeholder="0.00"
                                          value={item.target || 0}
                                          onChange={(val) => updateSinkingFundItem(item.id, { target: val })}
                                          className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 text-slate-700 text-right"
                                        />
                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 select-none">
                                          RM
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => deleteSinkingFundItem(item.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                        title="Padam"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Sinking Metrics Comparison */}
                            <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4">
                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jumlah Sasaran Sinking</div>
                                <div className="text-lg font-mono font-black text-slate-900">RM {formatCurrency(results.sinkingFundTarget)}</div>
                                <div className="text-[9px] text-slate-400 mt-1 font-medium">
                                  Hasil jumlah sasaran di atas
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tunai Baki Sedia Ada</div>
                                <div className="text-lg font-mono font-black text-amber-600">RM {formatCurrency(results.remainingSavingsForSinking)}</div>
                                <div className="text-[9px] text-slate-400 mt-1 font-medium">
                                  (Simpanan - Sasaran Kecemasan)
                                </div>
                              </div>

                              <div className={cn(
                                "p-4 rounded-2xl border transition-colors",
                                results.sinkingFundShortfall > 0 
                                  ? "bg-rose-50/50 border-rose-100 text-rose-900" 
                                  : "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                              )}>
                                <div className="text-[9px] font-black uppercase tracking-widest mb-1">
                                  {results.sinkingFundShortfall > 0 ? "Jumlah Kekurangan (Shortfall)" : "Status Agihan"}
                                </div>
                                <div className={cn(
                                  "text-lg font-mono font-black",
                                  results.sinkingFundShortfall > 0 ? "text-rose-600" : "text-emerald-600"
                                )}>
                                  {results.sinkingFundShortfall > 0 
                                    ? `RM ${formatCurrency(results.sinkingFundShortfall)}` 
                                    : "Mencukupi"
                                  }
                                </div>
                                <div className="text-[9px] opacity-80 mt-1 font-medium">
                                  {results.sinkingFundShortfall > 0 
                                    ? "Perlu tambahan simpanan" 
                                    : "Simpanan mencukupi"
                                  }
                                </div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-slate-400 uppercase tracking-widest">Status Agihan Sinking Fund</span>
                                <span className={cn(
                                  results.sinkingFundShortfall > 0 ? "text-amber-600" : "text-emerald-600"
                                )}>
                                  {results.sinkingFundTarget > 0 ? Math.round(Math.min(100, (results.remainingSavingsForSinking / results.sinkingFundTarget) * 100)) : 100}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-500 rounded-full",
                                    results.sinkingFundShortfall > 0 ? "bg-amber-500" : "bg-emerald-500"
                                  )}
                                  style={{ width: `${results.sinkingFundTarget > 0 ? Math.min(100, (results.remainingSavingsForSinking / results.sinkingFundTarget) * 100) : 100}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Sinking Alert Card */}
                            <div className={cn(
                              "p-4 rounded-2xl flex items-start gap-3 border",
                              results.sinkingFundShortfall > 0 
                                ? "bg-amber-50/50 border-amber-100/80 text-amber-900" 
                                : "bg-emerald-50/50 border-emerald-100/80 text-emerald-900"
                            )}>
                              {results.sinkingFundShortfall > 0 ? (
                                <>
                                  <div className="p-1.5 bg-amber-500 text-white rounded-lg flex-none mt-0.5">
                                    <HelpCircle size={16} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <h5 className="text-xs font-black uppercase tracking-wider">Perlukan Tambahan Simpanan</h5>
                                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                                      Simpanan bersih (selepas tolak dana kecemasan) masih belum mencukupi matlamat sinking fund anda. Anda memerlukan tambahan <span className="font-extrabold text-amber-900">RM {formatCurrency(results.sinkingFundShortfall)}</span> lagi.
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="p-1.5 bg-emerald-500 text-white rounded-lg flex-none mt-0.5">
                                    <ShieldCheck size={16} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <h5 className="text-xs font-black uppercase tracking-wider">Tahniah! Sinking Fund Selamat</h5>
                                    <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                                      Anda mempunyai simpanan tunai lebihan yang mencukupi untuk memenuhi kesemua sasaran Sinking Fund anda bernilai <span className="font-extrabold text-emerald-900">RM {formatCurrency(results.sinkingFundTarget)}</span> tanpa mengganggu dana kecemasan anda!
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'perlindungan' && (
                    <motion.div 
                      key="perlindungan"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8"
                    >
                      {/* Section A: Ringkasan & Keperluan Analisis */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-600 text-white rounded-lg shadow-md shadow-primary-600/20">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h3 className="text-lg font-display font-bold text-slate-900">Analisis Keperluan Takaful</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Syarat anjuran perlindungan berasaskan profil kewangan</p>
                          </div>
                        </div>

                        {/* Penerangan Income Protection: Malapetaka Kewangan (Financial Disaster) - Musibah 3D */}
                        <div className="bg-gradient-to-br from-rose-50/90 via-amber-50/40 to-slate-50 border border-rose-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                              <AlertTriangle size={18} />
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                                  Malapetaka Kewangan (Financial Disaster)
                                </span>
                                <span className="text-[11px] font-bold text-rose-950">
                                  Konsep & Kepentingan Income Protection
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                <strong>Income Protection</strong> adalah benteng kecemasan utama untuk menghadapi <strong>MALAPETAKA KEWANGAN (FINANCIAL DISASTER)</strong>. Apabila berlaku musibah <strong>3D</strong>, individu akan <strong>hilang kemampuan untuk bekerja</strong> dan menjana pendapatan:
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                            <div className="bg-white/95 border border-rose-200/70 rounded-xl p-3 shadow-2xs">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0"></span>
                                <span className="text-[11px] font-black text-rose-900 tracking-wide">1. DEATH (Kematian)</span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-snug">
                                Punca pendapatan keluarga terhenti serta-merta secara kekal, meninggalkan komitmen & beban sara hidup kepada waris serta anak-anak.
                              </p>
                            </div>

                            <div className="bg-white/95 border border-amber-200/70 rounded-xl p-3 shadow-2xs">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0"></span>
                                <span className="text-[11px] font-black text-amber-900 tracking-wide">2. DISABILITY (Hilang Upaya)</span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-snug">
                                Hilang kemampuan fizikal untuk terus bekerja (TPD), manakala kos perubatan, penjagaan diri, dan sara hidup terus berjalan seperti biasa.
                              </p>
                            </div>

                            <div className="bg-white/95 border border-purple-200/70 rounded-xl p-3 shadow-2xs">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0"></span>
                                <span className="text-[11px] font-black text-purple-900 tracking-wide">3. DISEASE (Penyakit Kritikal)</span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-snug">
                                Hilang daya & stamina untuk bekerja dalam jangka panjang semasa tempoh rawatan, di samping kos perubatan khas dan ubat-ubatan tinggi.
                              </p>
                            </div>
                          </div>
                        </div>
   
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-4 bg-white border border-slate-200 rounded-[1rem] shadow-sm space-y-3">
                              <div>
                                  <div className="text-[11px] font-black text-slate-900 tracking-tight mb-2 uppercase">A. Income Protection (Disyorkan)</div>
                                  
                                  <div className="space-y-2">
                                     <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
                                      <span className="text-[9px] font-bold text-slate-600">Kematian / TPD (10x Gajian)</span>
                                      <span className="text-xs font-mono font-bold text-slate-900">RM {formatCurrency(results.deathBenefit)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
                                      <span className="text-[9px] font-bold text-slate-600">Penyakit Kritikal (5x Gajian)</span>
                                      <span className="text-xs font-mono font-bold text-slate-900">RM {formatCurrency(results.ciBenefit)}</span>
                                    </div>
                                  </div>
                              </div>
                              
                              <div className="p-3 bg-primary-50 rounded-lg border border-primary-100 flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-primary-700">Bajet Caruman (10%)</span>
                                  <span className="text-sm font-mono font-black text-primary-600">RM {formatCurrency(Math.round(results.budgetIncomeProtection / 12))} / bln</span>
                              </div>
                            </div>
   
                            <div className="p-4 bg-white border border-slate-200 rounded-[1rem] shadow-sm flex flex-col justify-between space-y-4">
                              <div>
                                <div className="text-[11px] font-black text-slate-900 tracking-tight mb-2 uppercase">B. Debt Settlement (Hutang)</div>
                                <div className="text-2xl font-mono font-bold text-rose-500">RM {formatCurrency(results.debtSettlement)}</div>
                                <p className="text-[9px] text-slate-400 font-medium mt-1">Guna perlindungan Takaful untuk melangsaikan semua baki pinjaman tertunggak sekiranya berlaku musibah.</p>
                              </div>
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-500">Status Synced Aliran Tunai</span>
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 font-mono">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
                                  ONLINE
                                </span>
                              </div>
                            </div>
                          </div>
   
                          <div className="bg-white border border-slate-200/60 rounded-[1rem] p-4 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
                            <div className="space-y-2 flex-grow">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perbandingan Perlindungan</div>
                              <h4 className="text-base font-bold text-slate-800">Status Keperluan vs Polisi Sedia Ada</h4>
                              <div className="space-y-2 pt-2">
                                <div>
                                  <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                                    <span>Income Protection + Debt Settlement (Disasarkan RM {formatCurrency(results.totalTakafulNeed)})</span>
                                    <span className="font-mono text-slate-800">
                                      RM {formatCurrency(results.totalExistingDeathBenefit)} ({results.totalTakafulNeed > 0 ? Math.round((results.totalExistingDeathBenefit / results.totalTakafulNeed) * 100) : 0}%)
                                    </span>
                                  </div>
                                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(100, results.totalTakafulNeed > 0 ? (results.totalExistingDeathBenefit / results.totalTakafulNeed) * 100 : 0)}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                                    <span>Penyakit Kritikal (Disasarkan RM {formatCurrency(results.ciBenefit)})</span>
                                    <span className="font-mono text-slate-800">
                                      RM {formatCurrency(results.totalExistingCIBenefit)} ({results.ciBenefit > 0 ? Math.round((results.totalExistingCIBenefit / results.ciBenefit) * 100) : 0}%)
                                    </span>
                                  </div>
                                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(100, results.ciBenefit > 0 ? (results.totalExistingCIBenefit / results.ciBenefit) * 100 : 0)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-center shrink-0 border-l border-slate-100 pl-4">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Sasaran keperluan</div>
                              <div className="text-sm font-black text-slate-800 font-mono">RM {formatCurrency(results.totalTakafulNeed)}</div>
                              <div className="h-[100px] w-[100px] min-h-0 mt-1">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={20}
                                      outerRadius={35}
                                      paddingAngle={4}
                                      dataKey="value"
                                    >
                                      {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                      ))}
                                    </Pie>
                                    <Tooltip 
                                      formatter={(value: number) => `RM ${formatCurrency(value)}`}
                                      contentStyle={{ fontSize: '9px', borderRadius: '6px', padding: '4px' }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              
                              {/* Custom Legend */}
                              <div className="flex flex-col gap-1 mt-2 text-[9px] font-bold">
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full inline-block bg-[#0d8de7]"></span>
                                  <span>Income Protection:</span>
                                  <span className="font-mono text-slate-800">RM {formatCurrency(results.incomeProtection)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full inline-block bg-[#f43f5e]"></span>
                                  <span>Debt Settlement:</span>
                                  <span className="font-mono text-slate-800">RM {formatCurrency(results.debtSettlement)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section B: Sijil Takaful Manual Module */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-900 text-white rounded-lg shadow-md">
                            <Wallet size={18} />
                          </div>
                          <div>
                            <h3 className="text-lg font-display font-bold text-slate-900">Review Sijil Takaful</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pendaftaran & Pemantauan Sijil Takaful Manual (Tally dengan Aliran Tunai)</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                          
                          {/* Left Sidebar (List of Sijils) */}
                          <div className="md:col-span-4 space-y-4">
                            <div className="bg-[#eff6ff]/30 border border-blue-100 p-4 rounded-xl space-y-2">
                              <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider block">Status Caruman Tahunan</span>
                              <div className="text-2xl font-mono font-black text-blue-600 leading-none">
                                RM {formatCurrency(results.annualTakafulContribution)} <span className="text-[10px] text-slate-400 font-bold">/ Thn</span>
                              </div>
                              <div className="text-[9px] text-slate-500 font-bold flex justify-between items-center pt-2">
                                <span>Purata Bulanan:</span>
                                <span>RM {formatCurrency(results.totalTakafulContribution)} / Bln</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={addPolicy}
                              className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-slate-900/10"
                            >
                              <Plus size={16} /> + TAMBAH SIJIL
                            </button>

                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                              {(!data.takafulPolicies || data.takafulPolicies.length === 0) ? (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px] font-bold">
                                  Tiada sijil takafal berdaftar. Sila klik butang + TAMBAH SIJIL di atas.
                                </div>
                              ) : (
                                data.takafulPolicies.map((p, idx) => (
                                  <div
                                    key={p.id}
                                    onClick={() => setSelectedPolicyId(p.id)}
                                    className={cn(
                                      "p-3 rounded-xl border transition-all cursor-pointer relative group flex justify-between items-center",
                                      selectedPolicyId === p.id 
                                        ? "bg-[#eff6ff]/60 border-blue-400 shadow-sm" 
                                        : "bg-white border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                    <div className="space-y-1 pr-6 min-w-0">
                                      <div className="text-xs font-black text-slate-800 truncate">
                                        {p.name || `Sijil Takaful ${idx + 1}`}
                                      </div>
                                      <div className="text-[9px] text-slate-500 font-semibold truncate flex items-center gap-1">
                                        <span>Syarikat:</span>
                                        <span className="text-slate-700 font-black">{p.company || 'SILA ISI'}</span>
                                      </div>
                                      <div className="text-[9px] text-blue-600 font-bold font-mono">
                                        RM {formatCurrency(p.monthlyContribution)} / Bln
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {p.isSaved ? (
                                        <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">Saved</span>
                                      ) : (
                                        <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">Draft</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => removePolicy(p.id, e)}
                                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg shrink-0 hover:scale-105 transition-transform cursor-pointer relative z-10"
                                        title="Padam Sijil"
                                        aria-label="Padam Sijil"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Right Form Editor */}
                          <div className="md:col-span-8 bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-6 min-h-[350px]">
                            {!policyForm ? (
                              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
                                <div className="p-4 bg-slate-100 rounded-full text-slate-400 shadow-sm border border-slate-200/40">
                                  <ShieldCheck size={36} className="opacity-60" />
                                </div>
                                <div className="max-w-xs space-y-1">
                                  <h4 className="text-sm font-black text-slate-700">Modul Rekod Perlindungan Manual</h4>
                                  <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                                    Sila pilih mana-mana sijil sedia ada di sebelah kiri untuk disunting, atau klik butang <strong className="text-slate-600">+ TAMBAH SIJIL</strong> untuk memulakan pendaftaran sijil baharu.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-5 animate-in fade-in duration-200">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Format Rekod</span>
                                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                      {policyForm.name} 
                                      <span className="text-[9px] font-normal text-slate-400">({policyForm.id})</span>
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">Kemaskini Nama:</span>
                                    <input
                                      type="text"
                                      value={policyForm.name}
                                      onChange={(e) => updateForm({ name: e.target.value })}
                                      className="px-2.5 py-1 text-slate-700 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-500 max-w-[150px]"
                                    />
                                  </div>
                                </div>

                                {/* Form Section 1: Maklumat Asas */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    MAKLUMAT ASAS SIJIL
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Syarikat Takaful</label>
                                      <input
                                        type="text"
                                        placeholder="cth: Takaful Ikhlas / AIA"
                                        value={policyForm.company}
                                        onChange={(e) => updateForm({ company: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Caruman Bulanan (RM/bln)</label>
                                      <FormattedNumberInput
                                        placeholder="0.00"
                                        value={policyForm.monthlyContribution || 0}
                                        onChange={(val) => updateForm({ monthlyContribution: val })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Tahun Sijil Mulai</label>
                                      <input
                                        type="text"
                                        placeholder="cth: 2018"
                                        value={policyForm.yearStarted}
                                        onChange={(e) => updateForm({ yearStarted: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Tahun Tamat Polisi</label>
                                      <input
                                        type="text"
                                        placeholder="cth: 2060"
                                        value={policyForm.yearEnded}
                                        onChange={(e) => updateForm({ yearEnded: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Form Section 2: Income Protection */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    INCOME PROTECTION (PENGGANTIAN PENDAPATAN)
                                  </h5>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Manfaat Kematian / Lumpuh (RM)</label>
                                      <FormattedNumberInput
                                        placeholder="0.00"
                                        value={policyForm.deathBenefit || 0}
                                        onChange={(val) => updateForm({ deathBenefit: val })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Manfaat Penyakit Kritikal (RM)</label>
                                      <FormattedNumberInput
                                        placeholder="0.00"
                                        value={policyForm.ciBenefit || 0}
                                        onChange={(val) => updateForm({ ciBenefit: val })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Penamaan Waris / Wasiy (%)</label>
                                      <input
                                        type="text"
                                        placeholder="cth: 100%"
                                        value={policyForm.wasiNamePercent}
                                        onChange={(e) => updateForm({ wasiNamePercent: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Penambahan Hibah (%)</label>
                                      <input
                                        type="text"
                                        placeholder="cth: 50%"
                                        value={policyForm.hibahIncreasePercent}
                                        onChange={(e) => updateForm({ hibahIncreasePercent: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Form Section 3: Medical Card */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    MEDICAL CARD & HAD MINIMUM
                                  </h5>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Kelayakan Bilik (Room & Board) (RM)</label>
                                      <input
                                        type="text"
                                        placeholder="cth: RM 200 / Sehari"
                                        value={policyForm.roomAndBoard}
                                        onChange={(e) => updateForm({ roomAndBoard: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-600 mb-1 block">Had Siling Had Medical Card (RM/thn)</label>
                                      <FormattedNumberInput
                                        placeholder="0.00"
                                        value={policyForm.medicalCardLimit || 0}
                                        onChange={(val) => updateForm({ medicalCardLimit: val })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                  </div>
                                  <div className="pt-2 flex items-center justify-between pb-1">
                                    <div className="space-y-0.5">
                                      <span className="text-xs font-bold text-slate-700 block">Waiver Caruman / Payor Waiver</span>
                                      <p className="text-[9px] text-slate-400 font-medium">Melindungi pemegang polisi dengan mengecualikan caruman jika disahkan menghidap Penyakit Kritikal.</p>
                                    </div>
                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={policyForm.hasWaiver}
                                        onChange={(e) => updateForm({ hasWaiver: e.target.checked })}
                                        className="w-5 h-5 accent-blue-600 cursor-pointer border border-slate-300 rounded"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Save Record Actions Button */}
                                <div className="pt-3">
                                  {saveStatus === 'saved' ? (
                                    <motion.div
                                      initial={{ scale: 0.98 }}
                                      animate={{ scale: 1 }}
                                      className="w-full py-4 px-6 bg-emerald-600 font-bold text-xs text-center rounded-2xl text-white flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/20"
                                    >
                                      <ShieldCheck size={18} /> REKOD SIJIL BERJAYA DISIMPAN! SINKRONISASI SELESAI
                                    </motion.div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={savePolicy}
                                      disabled={saveStatus === 'saving'}
                                      className={cn(
                                        "w-full py-4 px-6 rounded-2xl text-xs font-black transition-all border shadow-lg cursor-pointer flex items-center justify-center gap-2",
                                        saveStatus === 'saving'
                                          ? "bg-slate-300 text-slate-600 border-slate-300 cursor-not-allowed"
                                          : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 shadow-blue-600/10 active:scale-[0.99]"
                                      )}
                                    >
                                      {saveStatus === 'saving' ? (
                                        <>
                                          <RefreshCcw size={16} className="animate-spin" /> MENYIMPAN REKOD...
                                        </>
                                      ) : (
                                        <>
                                          <ShieldCheck size={16} /> SIMPAN REKOD
                                        </>
                                      )}
                                    </button>
                                  )}
                                  <p className="text-[9px] font-bold text-slate-400 mt-2 text-center select-none leading-relaxed">
                                    PENTING: Menekan butang ini menyimpan rekod ini secara kekal di komputer sedia ada. Segala status caruman dan perlindungan akan diselaraskan ke dalam baki kewangan keseluruhan.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'pelaburan' && (
                    <motion.div 
                      key="pelaburan"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-md shadow-emerald-600/20">
                          <Target size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-display font-bold text-slate-900">Perancangan & Dana Persaraan</h3>
                        </div>
                      </div>

                      {/* Side-by-side layout for Inputs & Results */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Column: Input Parameters Section */}
                        <div className="lg:col-span-5 space-y-4">
                          <div className="bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-6 space-y-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2 select-none">
                              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                              Pembolehubah Persaraan (Sila Ubah Untuk Simulasi)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                              <Input 
                                id="field-target-age"
                                label="Sasaran umur bersara" 
                                icon={Target} 
                                type="number" 
                                value={data.targetRetirementAge} 
                                onChange={(e: any) => updateData({ targetRetirementAge: parseInt(e.target.value) || 0 })} 
                              />
                              <Input 
                                id="field-years-to-retire"
                                label="Tempoh sebelum bersara (tahun)" 
                                icon={RefreshCcw} 
                                type="number" 
                                value={Math.max(0, data.targetRetirementAge - data.age)} 
                                onChange={(e: any) => {
                                  const years = parseInt(e.target.value) || 0;
                                  updateData({ targetRetirementAge: data.age + years });
                                }} 
                              />
                              <Input 
                                id="field-lifestyle-rate"
                                label="Gaya hidup selepas bersara (%)" 
                                icon={Users} 
                                type="number" 
                                value={data.lifestyleAdjustmentRate} 
                                onChange={(e: any) => updateData({ lifestyleAdjustmentRate: parseFloat(e.target.value) || 0 })} 
                                suffix="%"
                              />
                              <Input 
                                id="field-inflation"
                                label="Kadar inflasi tahunan (%)" 
                                icon={HelpCircle} 
                                type="number" 
                                step="0.1"
                                value={data.inflationRate} 
                                onChange={(e: any) => updateData({ inflationRate: parseFloat(e.target.value) || 0 })} 
                                suffix="%"
                              />
                              <Input 
                                id="field-growth"
                                label="Pulangan aset tahunan (%)" 
                                icon={TrendingUp} 
                                type="number" 
                                step="0.1"
                                value={data.assetGrowthRate} 
                                onChange={(e: any) => updateData({ assetGrowthRate: parseFloat(e.target.value) || 0 })} 
                                suffix="%"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Results Summary & Chart */}
                        <div className="lg:col-span-7 space-y-4">
                          {/* Unjuran Summary Block */}
                          <div className="p-5 bg-gradient-to-r from-blue-900 to-slate-900 rounded-[1.2rem] text-white relative overflow-hidden shadow-lg shadow-blue-950/15">
                            <div className="relative z-10 space-y-2">
                              <h4 className="text-blue-300 text-[10px] font-black uppercase tracking-widest">Unjuran Persaraan</h4>
                              <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
                                Anda akan bersara dalam masa <span className="text-white font-black">{results.yearsToRetire} tahun</span>. 
                                Pendapatan tahunan anda diselaraskan inflasi ({data.inflationRate}%) dan gaya hidup ({data.lifestyleAdjustmentRate}%) dijangka menjadi <span className="text-white font-black">RM {formatCurrency(results.futureAnnualExpenses)}</span> setahun (RM {formatCurrency(Math.round(results.futureAnnualExpenses / 12))} sebulan).
                              </p>
                            </div>
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                              <Target size={180} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <div className="p-4 bg-[#ecfdf5] border border-emerald-100 rounded-[1rem] shadow-sm space-y-4">
                                <div className="text-[9px] font-black text-emerald-700 bg-emerald-200/40 px-2 py-1 rounded-full inline-block">Masa depan @ umur {data.targetRetirementAge}</div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-[8px] font-black text-emerald-800/40">Modal perlu</div>
                                    <div className="text-lg font-mono font-black text-slate-800">RM {formatCurrency(results.requiredCapital)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[8px] font-black text-emerald-800/40">Unjuran aset</div>
                                    <div className="text-lg font-mono font-black text-emerald-600">RM {formatCurrency(results.futureValueAssets)}</div>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-emerald-200/60">
                                  <div className="text-[8px] text-emerald-800/40 font-black mb-1">Shortfall</div>
                                  <div className={cn(
                                    "text-2xl font-mono font-black tracking-tighter",
                                    results.shortfall > 0 ? "text-rose-500" : "text-emerald-500"
                                  )}>
                                    RM {formatCurrency(results.shortfall)}
                                  </div>
                                </div>
                            </div>

                            <div className="h-[200px] w-full bg-white border border-slate-200/60 rounded-[1rem] p-3 shadow-sm flex flex-col">
                               <div className="flex-1 min-h-0">
                                 <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={[
                                     { name: 'Target', value: results.requiredCapital },
                                     { name: 'Unjuran', value: results.futureValueAssets }
                                   ]} barGap={10}>
                                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }} />
                                     <YAxis hide />
                                     <Tooltip 
                                       contentStyle={{ borderRadius: '8px', fontSize: '9px', padding: '4px' }}
                                       formatter={(value: number) => `RM ${formatCurrency(value)}`} 
                                     />
                                     <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                       <Cell fill="#dee5ed" />
                                       <Cell fill="#10b981" />
                                     </Bar>
                                   </BarChart>
                                 </ResponsiveContainer>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Huraian & Formula Lengkap Pengiraan Persaraan */}
                      <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/90 rounded-[1.5rem] p-5 sm:p-6 space-y-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                              <Calculator size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                                Huraian & Kaedah Pengiraan Unjuran Persaraan
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Panduan terperinci bagaimana setiap nilai Modal Perlu, Unjuran Aset, dan Shortfall dihitung
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-blue-100/70 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-full self-start sm:self-auto">
                            Formula Saintifik
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Langkah 1: Tempoh Bersara */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Langkah 1
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-700">
                                {results.yearsToRetire} Tahun Baki
                              </span>
                            </div>
                            <h5 className="text-xs font-black text-slate-900">1. Tempoh Sebelum Bersara</h5>
                            <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] font-mono text-slate-700 space-y-0.5">
                              <p className="text-slate-400 text-[9px] uppercase font-bold">Formula:</p>
                              <p>Umur Bersara ({data.targetRetirementAge}) − Umur Semasa ({data.age}) = <strong>{results.yearsToRetire} tahun</strong></p>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Tempoh masa yang anda miliki untuk mengumpul modal dan membiarkan aset anda berkembang secara kompaun sebelum berhenti bekerja.
                            </p>
                          </div>

                          {/* Langkah 2: Penggantian Pendapatan Masa Depan */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Langkah 2
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-700">
                                RM {formatCurrency(results.futureAnnualExpenses)} / thn
                              </span>
                            </div>
                            <h5 className="text-xs font-black text-slate-900">2. Sasaran Pendapatan Persaraan (Inflasi & Gaya Hidup)</h5>
                            
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] space-y-2.5">
                              {/* 2A: Pendapatan + Inflasi */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[10.5px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                  <span>2A. Pendapatan Masa Depan (Kesan Inflasi {data.inflationRate}%)</span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-600 pl-3">
                                  RM {formatCurrency(data.monthlyIncome)} × (1 + {data.inflationRate}%)^{results.yearsToRetire}
                                </p>
                                <p className="font-mono font-bold text-blue-900 pl-3 text-[11px]">
                                  = RM {formatCurrency(results.futureMonthlyIncomeRaw)} / bulan
                                </p>
                              </div>

                              {/* 2B: Pelarasan Gaya Hidup */}
                              <div className="space-y-1 pt-2 border-t border-slate-200/70">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[10.5px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                  <span>2B. Pelarasan Gaya Hidup Persaraan ({data.lifestyleAdjustmentRate}%)</span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-600 pl-3">
                                  RM {formatCurrency(results.futureMonthlyIncomeRaw)} × {data.lifestyleAdjustmentRate}%
                                </p>
                                <p className="font-mono font-bold text-blue-900 pl-3 text-[11px]">
                                  = RM {formatCurrency(Math.round(results.futureAnnualExpenses / 12))} / bulan
                                </p>
                              </div>

                              {/* 2C: Jumlah Setahun */}
                              <div className="space-y-1 pt-2 border-t border-slate-200/70">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[10.5px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  <span>2C. Jumlah Pendapatan Persaraan Setahun (12 Bulan)</span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-600 pl-3">
                                  RM {formatCurrency(Math.round(results.futureAnnualExpenses / 12))} × 12 bulan
                                </p>
                                <p className="font-mono font-black text-emerald-800 pl-3 text-xs">
                                  = RM {formatCurrency(results.futureAnnualExpenses)} / tahun
                                </p>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Pengiraan bermula daripada <strong>Pendapatan Semasa (RM {formatCurrency(data.monthlyIncome)})</strong>, digandakan dengan inflasi tahunan ({data.inflationRate}%), dan diselaraskan pada {data.lifestyleAdjustmentRate}% gaya hidup persaraan bagi mengekalkan kualiti hidup selesa.
                            </p>
                          </div>

                          {/* Langkah 3: Modal Perlu */}
                          <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Langkah 3 (Target Modal)
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-900">
                                RM {formatCurrency(results.requiredCapital)}
                              </span>
                            </div>
                            <h5 className="text-xs font-black text-slate-900">3. Pengiraan Modal Perlu (Rule of 5% / 20x)</h5>
                            <div className="p-2.5 bg-emerald-50/70 rounded-lg text-[11px] font-mono text-emerald-950 space-y-0.5 border border-emerald-100">
                              <p className="text-emerald-700 text-[9px] uppercase font-bold">Formula Dividen 5% (Dividen Yield):</p>
                              <p className="text-[10px]">
                                Pendapatan Bersara Setahun ÷ 5% (atau × 20 tahun)
                              </p>
                              <p className="font-bold">
                                RM {formatCurrency(results.futureAnnualExpenses)} ÷ 0.05 = <strong>RM {formatCurrency(results.requiredCapital)}</strong>
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              <strong>Mengapa bahagi 5%?</strong> Supaya dengan modal <strong>RM {formatCurrency(results.requiredCapital)}</strong> ini, dividen tahunan 5% (cth: ASB/KWSP/Tabung Haji) akan menghasilkan tunai <strong>RM {formatCurrency(results.futureAnnualExpenses)} setahun (RM {formatCurrency(Math.round(results.futureAnnualExpenses / 12))}/bulan)</strong> tanpa anda perlu memakan modal pokok.
                            </p>
                          </div>

                          {/* Langkah 4: Unjuran Aset Semasa */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Langkah 4
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-600">
                                RM {formatCurrency(results.futureValueAssets)}
                              </span>
                            </div>
                            <h5 className="text-xs font-black text-slate-900">4. Unjuran Nilai Aset Semasa (Kompaun)</h5>
                            <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] font-mono text-slate-700 space-y-0.5">
                              <p className="text-slate-400 text-[9px] uppercase font-bold">Formula Gandaan Aset ({data.assetGrowthRate}% / thn):</p>
                              <p className="text-[10px]">
                                Aset Semasa (RM {formatCurrency(results.totalAssets)}) × (1+{data.assetGrowthRate}%)^{results.yearsToRetire}
                              </p>
                              <p className="font-bold text-purple-950">
                                = <strong>RM {formatCurrency(results.futureValueAssets)}</strong>
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Nilai keseluruhan aset sedia ada anda (RM {formatCurrency(results.totalAssets)}) apabila dilaburkan dan berkembang pada kadar pulangan tahunan {data.assetGrowthRate}% sehingga umur {data.targetRetirementAge}.
                            </p>
                          </div>
                        </div>

                        {/* Langkah 5: Status Jurang (Shortfall) */}
                        <div className={cn(
                          "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                          results.shortfall > 0 
                            ? "bg-rose-50/80 border-rose-200 text-rose-900" 
                            : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                        )}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-current shadow-2xs">
                                Langkah 5: Jurang (Shortfall)
                              </span>
                              <span className="text-xs font-black">
                                Modal Perlu − Unjuran Aset
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed font-medium">
                              RM {formatCurrency(results.requiredCapital)} − RM {formatCurrency(results.futureValueAssets)} = <strong className="font-mono text-sm">RM {formatCurrency(results.shortfall)}</strong>
                            </p>
                            <p className="text-[11px] opacity-80">
                              {results.shortfall > 0 
                                ? `Anda perlu menambah simpanan/pelaburan konsisten untuk menampung jurang sebanyak RM ${formatCurrency(results.shortfall)} sebelum bersara.` 
                                : `Tahniah! Unjuran nilai aset anda mencukupi dan melebihi keperluan modal persaraan.`}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-black uppercase opacity-70 block">Baki Shortfall</span>
                            <span className="text-xl font-mono font-black">
                              RM {formatCurrency(results.shortfall)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <div className="flex flex-col items-center gap-4 py-8">
               <div className="flex flex-wrap justify-center gap-3">

               </div>
               <div className="flex flex-wrap justify-center gap-3 mt-1">
                  <button 
                    id="btn-reset-main"
                    onClick={resetData}
                    className="px-8 py-2 text-rose-500 rounded-xl font-bold hover:bg-rose-50 transition-all flex items-center gap-2 no-print"
                  >
                    <RefreshCcw size={14} /> Mula Baru & Padam Data
                  </button>
               </div>
               <p className="text-[10px] text-slate-400 font-bold mt-4">Generated by INFAQ Consultancy</p>
            </div>
          </div>
        );

      case 5:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 animate-in fade-in duration-200"
          >
            <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
               <PusakaFaraid 
                 netWorth={results.netWorth}
                 completedSteps={completedSteps}
                 setCompletedSteps={setCompletedSteps}
                 estateValue={estateValue}
                 setEstateValue={setEstateValue}
                 spouse={spouse}
                 setSpouse={setSpouse}
                 mother={mother}
                 setMother={setMother}
                 father={father}
                 setFather={setFather}
                 sons={sons}
                 setSons={setSons}
                 daughters={daughters}
                 setDaughters={setDaughters}
               />
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-sans selection:bg-primary-100 pb-20">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm z-50 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
                <ShieldCheck size={22} strokeWidth={2.5} />
             </div>
             <div>
                <h1 className="font-display font-black text-xl tracking-tight text-slate-900 leading-none flex flex-wrap items-baseline gap-x-1.5">
                  <span>NEED-<span className="text-primary-500">BASED</span> SOLUTION</span>
                  <span className="text-xs font-normal text-slate-400 lowercase italic">by</span>
                  <span className="text-sm font-black text-primary-600 uppercase tracking-wider">INFAQ Consultancy</span>
                </h1>
             </div>
          </div>
          
          <div className="hidden lg:flex gap-2">
             {steps.map(s => (
               <button 
                key={s.id}
                onClick={() => setStep(s.id)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center gap-2 border-0 bg-transparent outline-none focus:ring-0",
                  step === s.id ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
               >
                 <span className={cn("inline-block w-1.5 h-1.5 rounded-full", step === s.id ? "bg-primary-400" : "bg-slate-300")}></span>
                 {s.title}
               </button>
             ))}
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 no-print">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-bold tracking-wider">Disimpan secara automatik</span>
            </div>
            

            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-md shadow-primary-600/15 cursor-pointer no-print select-none border-0"
            >
              {isGeneratingPDF ? (
                <>
                  <RefreshCcw size={12} className="animate-spin" />
                  <span>Menjana...</span>
                </>
              ) : (
                <>
                  <FileDown size={12} />
                  <span>Eksport PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto pt-24 px-4 pb-20">
        {/* Progress Tracker Mobile */}
        <div className="lg:hidden flex justify-between mb-6 overflow-x-auto pb-4 gap-3 scrollbar-hide">
           {steps.map(s => (
             <button 
              key={s.id} 
              onClick={() => setStep(s.id)}
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border cursor-pointer outline-none focus:ring-0",
                step === s.id ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-600/20" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
              )}
             >
               {s.id}
             </button>
           ))}
        </div>
 
        <div className="mb-10">
           <header className="space-y-2">
              <div className="flex items-center gap-2 text-primary-500">
                 <div className="p-1.5 bg-primary-50 rounded-lg">
                    {(() => {
                        const Icon = steps[step-1]?.icon || User;
                        return <Icon size={16} strokeWidth={2.5} />;
                    })()}
                 </div>
                 <span className="text-[9px] font-black">{steps[step-1]?.title || ""}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-slate-900 leading-tight">
                {step === 1 && "Kenali profil anda."}
                {step === 2 && "Analisis aliran tunai."}
                {step === 3 && "Kunci kira-kira aset."}
                {step === 4 && "Hala tuju strategi."}
                {step === 5 && "Pengurusan pusaka & Faraid."}
              </h2>
              <p className="text-slate-500 text-base font-medium max-w-2xl">
                {step === 1 && "Sila isikan maklumat peribadi untuk pengiraan yang tepat."}
                {step === 2 && "Berapakah pendapatan dan belanja bulanan anda?"}
                {step === 3 && "Senaraikan aset dan hutang anda."}
                {step === 4 && "Matlamat dan hala tuju anda."}
                {step === 5 && "Langkah demi langkah pengurusan harta pusaka dan kalkulator faraid."}
              </p>
           </header>
        </div>

        <AnimatePresence mode="wait">
          <div key={step}>
            {renderStep()}
          </div>
        </AnimatePresence>

        {/* Footer Navigation */}
        <div className="mt-20 flex items-center justify-between py-8 border-t border-slate-200/60 bg-[#fcfdfe] z-40 sticky bottom-0 no-print">
           <button
            id="nav-back"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-0 hover:bg-slate-100 text-slate-600"
           >
             <ChevronLeft size={20} /> Kembali
           </button>
           
           {step < steps.length ? (
             <button
              id="nav-next"
              onClick={() => setStep(s => Math.min(steps.length, s + 1))}
              className="flex items-center gap-2 px-10 py-4 bg-primary-600 text-white rounded-2xl font-bold transition-all hover:bg-primary-700 shadow-xl shadow-primary-600/25 active:scale-[0.98] group"
             >
               Seterusnya <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
             </button>
           ) : (
             <div className="flex flex-wrap items-center gap-3">
               <button
                id="nav-export-footer"
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-[#059669] disabled:bg-[#a7f3d0] text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/15 cursor-pointer no-print select-none border-0"
               >
                 {isGeneratingPDF ? (
                   <RefreshCcw size={18} className="animate-spin" />
                 ) : (
                   <FileDown size={18} />
                 )}
                 {isGeneratingPDF ? 'Menjana PDF...' : 'Muat Turun Laporan PDF'}
               </button>
               <button
                id="nav-restart"
                onClick={() => {
                  setData(INITIAL_DATA);
                  setStep(1);
                  setCompletedSteps({});
                  setEstateValue(0);
                  setSpouse('none');
                  setMother(false);
                  setFather(false);
                  setSons(0);
                  setDaughters(0);
                }}
                className="px-8 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-all border border-slate-200"
               >
                 Mula semula
               </button>
             </div>
           )}
        </div>
      </main>

      {/* Web App Footer with INFAQ Consultancy Attribution */}
      <footer className="max-w-6xl mx-auto px-4 py-8 border-t border-slate-200/60 mt-12 text-center text-xs text-slate-400 font-medium no-print">
        <p>© {new Date().getFullYear()} NEED-BASED SOLUTION by INFAQ Consultancy. Hak Cipta Terpelihara.</p>
      </footer>

      {/* Hidden container specifically for PDF Export */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden' }} className="no-print bg-slate-50">
        {/* Mobile Format Pages (8 pages, neat and compact mobile-friendly layouts) */}
        {/* Mobile Page 1: Cover & Profil */}
        <div id="mobile-pdf-page-1" className="w-[412px] h-[840px] bg-white text-slate-800 p-6 flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
                  <ShieldCheck size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="font-display font-black text-[10px] tracking-tight text-slate-900 leading-none">
                    NEED-BASED SOLUTION
                  </h1>
                  <p className="text-[6px] text-slate-400 font-bold tracking-wider mt-0.5 uppercase">by INFAQ Consultancy</p>
                </div>
              </div>
              <span className="text-[6.5px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                LAPORAN RASMI
              </span>
            </div>

            {/* Title */}
            <div className="my-6 text-center">
              <h2 className="text-base font-black text-slate-900 tracking-tight leading-snug">LAPORAN PERANCANGAN KEWANGAN PERIBADI</h2>
              <p className="text-[8.5px] text-slate-500 mt-1 max-w-[300px] mx-auto">Analisis kedudukan kewangan semasa, perlindungan takaful, persaraan, dan pengurusan harta pusaka.</p>
              <p className="text-[8px] text-slate-400 mt-2 font-medium">Tarikh: {new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Client Profile */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 mt-4">
              <h3 className="text-[8px] font-black text-slate-900 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <User size={10} className="text-primary-500 animate-pulse" /> PROFIL PELANGGAN
              </h3>
              <div className="space-y-1.5 text-[9px]">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Nama Penuh:</span>
                  <span className="font-bold text-slate-800">{data.name || 'Hamba Allah'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Umur Semasa:</span>
                  <span className="font-bold text-slate-800">{data.age} tahun</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Tarikh Lahir:</span>
                  <span className="font-bold text-slate-800">{data.dob || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Pekerjaan:</span>
                  <span className="font-bold text-slate-800">{data.job || 'Bekerja Sendiri'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Syarikat / Majikan:</span>
                  <span className="font-bold text-slate-800">{data.employer || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Status Perkahwinan:</span>
                  <span className="font-bold text-slate-800">{data.maritalStatus}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Bilangan Tanggungan:</span>
                  <span className="font-bold text-slate-800">{data.dependents} orang</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Page 1 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[7px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 1 daripada 8</span>
          </div>
        </div>

        {/* Mobile Page 2: Aliran Tunai Bulanan */}
        <div id="mobile-pdf-page-2" className="w-[412px] h-[840px] bg-white text-slate-800 p-6 flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                NEED-BASED SOLUTION <span className="text-[5px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span>
              </span>
              <span className="text-[7px] text-slate-400 font-medium">Aliran Tunai Semasa</span>
            </div>

            <div className="mb-4">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <TrendingUp className="text-primary-500" size={12} /> 1. RINGKASAN ALIRAN TUNAI BULANAN
              </h2>
              <p className="text-[8px] text-slate-500 mt-0.5">Analisis kemasukan dan perbelanjaan tunai bulanan.</p>
            </div>

            {/* Vertical Flow Cards */}
            <div className="space-y-2.5 mb-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[7px] font-black text-emerald-700/60 uppercase tracking-widest block">Pendapatan Bulanan</span>
                  <p className="text-xs font-black text-emerald-800 mt-0.5">RM {formatCurrency(data.monthlyIncome)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[7px] text-emerald-600 font-bold block">RM {formatCurrency(data.monthlyIncome * 12)} / thn</span>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[7px] font-black text-rose-700/60 uppercase tracking-widest block">Perbelanjaan Bulanan</span>
                  <p className="text-xs font-black text-rose-800 mt-0.5">RM {formatCurrency(data.monthlyExpenses)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[7px] text-rose-600 font-bold block">RM {formatCurrency(data.monthlyExpenses * 12)} / thn</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[7px] font-black text-slate-700/60 uppercase tracking-widest block">Aliran Tunai Bersih (Surplus)</span>
                    <p className={`text-xs font-black mt-0.5 ${data.monthlyIncome - data.monthlyExpenses > 0 ? 'text-emerald-800' : data.monthlyIncome - data.monthlyExpenses < 0 ? 'text-rose-800' : 'text-slate-800'}`}>
                      RM {formatCurrency(data.monthlyIncome - data.monthlyExpenses)}
                    </p>
                  </div>
                  <span className={`text-[6.5px] font-black px-2 py-0.5 rounded-full uppercase ${data.monthlyIncome - data.monthlyExpenses > 0 ? 'bg-emerald-100 text-emerald-800' : data.monthlyIncome - data.monthlyExpenses < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'}`}>
                    {data.monthlyIncome - data.monthlyExpenses > 0 ? 'Positif' : data.monthlyIncome - data.monthlyExpenses < 0 ? 'Defisit' : 'Seimbang'}
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis Text Box */}
            <div className="p-3 rounded-xl bg-slate-900 text-white text-[8.5px] leading-relaxed">
              <p className="font-bold text-slate-200 mb-1">Analisis & Cadangan:</p>
              {data.monthlyIncome - data.monthlyExpenses > 0 ? (
                <p className="text-slate-300">
                  Aliran tunai anda berada pada kedudukan <span className="text-emerald-400 font-bold">Positif</span> dengan lebihan <span className="font-bold text-emerald-400">RM {formatCurrency(data.monthlyIncome - data.monthlyExpenses)}</span> sebulan (<span className="text-emerald-400 font-bold">{data.monthlyIncome > 0 ? ((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome * 100).toFixed(1) : 0}%</span> daripada pendapatan). Disarankan menyalurkan lebihan ini secara konsisten ke dalam instrumen pelaburan berisiko rendah/sederhana dan tabung kecemasan sehingga mencapai sasaran minimum.
                </p>
              ) : data.monthlyIncome - data.monthlyExpenses < 0 ? (
                <p className="text-slate-300">
                  Aliran tunai anda berada pada kedudukan <span className="text-rose-400 font-bold">Negatif</span> dengan defisit <span className="font-bold text-rose-400">RM {formatCurrency(Math.abs(data.monthlyIncome - data.monthlyExpenses))}</span> sebulan. Ini mengundang risiko pembocoran tabungan jangka panjang. Cadangan kami adalah untuk mengenal pasti dan memotong perbelanjaan kehendak serta-merta atau mengambil langkah meningkatkan punca pendapatan sampingan.
                </p>
              ) : (
                <p className="text-slate-300">
                  Aliran tunai bulanan anda berada pada tahap <span className="text-slate-300 font-bold">Seimbang</span> tanpa sebarang baki tambahan. Anda disarankan agar merangka pelan belanjawan bajet bulanan yang lebih ketat untuk mewujudkan sekurang-kurangnya 10% lebihan pendapatan bersih bagi tujuan simpanan masa hadapan.
                </p>
              )}
            </div>
          </div>

          {/* Footer Page 2 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[7px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 2 daripada 8</span>
          </div>
        </div>

        {/* Mobile Page 3: Net Worth */}
        <div id="mobile-pdf-page-3" className="w-[412px] h-[840px] bg-white text-slate-800 p-6 flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                NEED-BASED SOLUTION <span className="text-[5px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span>
              </span>
              <span className="text-[7px] text-slate-400 font-medium">Kunci Kira-kira Aset & Liabiliti</span>
            </div>

            <div className="mb-3">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Wallet className="text-primary-500" size={12} /> 2. KUNCI KIRA-KIRA & NILAI BERSIH
              </h2>
              <p className="text-[8px] text-slate-500 mt-0.5">Analisis pemilikan aset berbanding beban hutang.</p>
            </div>

            {/* Net Worth Banner */}
            <div className="bg-[#f0fdf4] border border-emerald-100 rounded-xl p-3.5 mb-4 text-center">
              <span className="text-[7px] font-black text-emerald-800/60 uppercase tracking-widest block">NILAI BERSIH SEMASA (NET WORTH)</span>
              <p className={`text-lg font-black mt-1 ${results.netWorth >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                RM {formatCurrency(results.netWorth)}
              </p>
              <p className="text-[8px] text-emerald-700/80 mt-1 max-w-[280px] mx-auto font-medium">
                Nilai bersih positif bermakna nilai aset mengatasi jumlah liabiliti/hutang keseluruhan.
              </p>
            </div>

            {/* Assets and Debts list */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assets column */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[7px] font-black text-slate-900 uppercase">JUMLAH ASET</span>
                  <span className="text-[8px] font-black text-emerald-700 font-mono">RM {formatCurrency(results.totalAssets)}</span>
                </div>
                <div className="space-y-1 max-h-[160px] overflow-hidden">
                  {data.assets.slice(0, 5).map((asset) => (
                    <div key={asset.id} className="p-1.5 bg-slate-50 rounded-lg flex justify-between items-center text-[7.5px]">
                      <span className="font-bold text-slate-700 truncate max-w-[90px]">{asset.category}</span>
                      <span className="font-black text-slate-800 font-mono">RM {formatCurrency(asset.value)}</span>
                    </div>
                  ))}
                  {data.assets.length > 5 && (
                    <p className="text-[7px] text-slate-400 italic text-center">+ {data.assets.length - 5} aset lagi</p>
                  )}
                  {data.assets.length === 0 && (
                    <p className="text-[7px] text-slate-400 italic text-center">Tiada aset direkodkan.</p>
                  )}
                </div>
              </div>

              {/* Debts column */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[7px] font-black text-slate-900 uppercase">JUMLAH LIABILITI</span>
                  <span className="text-[8px] font-black text-rose-700 font-mono">RM {formatCurrency(results.totalDebts)}</span>
                </div>
                <div className="space-y-1 max-h-[160px] overflow-hidden">
                  {data.debts.slice(0, 5).map((debt) => (
                    <div key={debt.id} className="p-1.5 bg-slate-50 rounded-lg flex justify-between items-center text-[7.5px]">
                      <span className="font-bold text-slate-700 truncate max-w-[90px]">{debt.category}</span>
                      <span className="font-black text-slate-800 font-mono">RM {formatCurrency(debt.value)}</span>
                    </div>
                  ))}
                  {data.debts.length > 5 && (
                    <p className="text-[7px] text-slate-400 italic text-center">+ {data.debts.length - 5} hutang lagi</p>
                  )}
                  {data.debts.length === 0 && (
                    <p className="text-[7px] text-slate-400 italic text-center text-emerald-600 font-bold">Hebat, tiada hutang!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick summary status of Solvency */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-4 text-[8px] leading-relaxed text-slate-600">
              <p className="font-bold text-slate-800">Status Kedudukan Solven:</p>
              {results.netWorth > 100000 ? (
                <p>Kedudukan kekayaan bersih anda berada pada tahap yang <span className="text-emerald-600 font-extrabold">Mantap & Kukuh</span>. Sebahagian besar nilai aset merupakan hak mutlak anda secara solven.</p>
              ) : results.netWorth >= 0 ? (
                <p>Kedudukan kekayaan bersih anda adalah <span className="text-amber-600 font-extrabold">Positif</span>. Berhati-hati bagi mengelakkan penambahan liabiliti tidak produktif.</p>
              ) : (
                <p>Kedudukan kekayaan bersih anda berada pada paras <span className="text-rose-600 font-extrabold">Defisit Solven</span>. Jumlah hutang melebihi nilai pasaran semua aset anda.</p>
              )}
            </div>
          </div>

          {/* Footer Page 3 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[7px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 3 daripada 8</span>
          </div>
        </div>

        {/* Mobile Page 4: Emergency & Sinking Funds */}
        <div id="mobile-pdf-page-4" className="w-[412px] h-[840px] bg-white text-slate-800 p-6 flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                NEED-BASED SOLUTION <span className="text-[5px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span>
              </span>
              <span className="text-[7px] text-primary-600 font-extrabold uppercase tracking-wider">1. SIMPANAN</span>
            </div>

            <div className="mb-4">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Target className="text-primary-500" size={12} /> 1. SIMPANAN
              </h2>
              <p className="text-[8px] text-slate-500 mt-0.5">Analisa keperluan kewangan menggunakan kaedah NBS untuk simpanan, perlindungan dan pelaburan</p>
            </div>

            {/* Box 1: Tabung Kecemasan */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mb-3">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-[8px] border-b border-slate-200 pb-1 flex justify-between items-center">
                <span>1. Emergency Fund (Tabung Kecemasan)</span>
                <span className="text-emerald-700 font-bold">Sasaran: {data.emergencyFundMonths || 3} Bulan</span>
              </h3>
              <div className="space-y-1.5">
                <div className="p-2 bg-white border border-slate-100 rounded-lg flex justify-between items-center text-[8px]">
                  <div>
                    <div className="font-black text-slate-400 uppercase tracking-widest text-[6.5px]">Sasaran ({(data.emergencyFundMonths || 3)} bln)</div>
                    <div className="text-[10px] font-mono font-black text-slate-900">RM {formatCurrency(results.emergencyFundTarget)}</div>
                  </div>
                  <div className="text-[6.5px] text-slate-400 font-medium text-right">
                    (RM {formatCurrency(data.monthlyIncome)} x {data.emergencyFundMonths || 3} bln)
                  </div>
                </div>

                <div className="p-2 bg-white border border-slate-100 rounded-lg flex justify-between items-center text-[8px]">
                  <div>
                    <div className="font-black text-slate-400 uppercase tracking-widest text-[6.5px]">Tunai Sedia Ada</div>
                    <div className="text-[10px] font-mono font-black text-emerald-600">RM {formatCurrency(results.currentSavings)}</div>
                  </div>
                  <div className="text-[6.5px] text-slate-400 font-medium text-right">
                    Tunai/Simpanan/ASB/TH
                  </div>
                </div>

                <div className={cn(
                  "p-2 rounded-lg border flex justify-between items-center text-[8px]",
                  results.savingsShortfall > 0 
                    ? "bg-rose-50/50 border-rose-100 text-rose-900" 
                    : "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                )}>
                  <div>
                    <div className="font-black uppercase tracking-widest text-[6.5px]">
                      {results.savingsShortfall > 0 ? "Kekurangan (Shortfall)" : "Status"}
                    </div>
                    <div className={cn(
                      "text-[10px] font-mono font-black",
                      results.savingsShortfall > 0 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {results.savingsShortfall > 0 
                        ? `RM ${formatCurrency(results.savingsShortfall)}` 
                        : "Mencukupi"
                      }
                    </div>
                  </div>
                  <div className="text-[6.5px] opacity-80 font-medium text-right">
                    {results.savingsShortfall > 0 ? "Perlu tambahan" : "Simpanan mencukupi"}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-0.5 bg-white p-1.5 border border-slate-100 rounded-lg">
                  <div className="flex justify-between items-center text-[6px] font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">Pencapaian</span>
                    <span className={cn(
                      results.savingsShortfall > 0 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {Math.round(Math.min(100, (results.currentSavings / results.emergencyFundTarget) * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        results.savingsShortfall > 0 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, (results.currentSavings / results.emergencyFundTarget) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Sinking Fund */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mb-3">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-[8px] border-b border-slate-200 pb-1 flex justify-between items-center">
                <span>2. Sinking Fund (Tabung Berasas Matlamat)</span>
                <span className="text-indigo-700 font-bold">Sasaran Khas</span>
              </h3>
              <div className="space-y-1.5">
                <div className="p-2 bg-white border border-slate-100 rounded-lg flex justify-between items-center text-[8px]">
                  <div>
                    <div className="font-black text-slate-400 uppercase tracking-widest text-[6.5px]">Jumlah Sasaran</div>
                    <div className="text-[10px] font-mono font-black text-slate-900">RM {formatCurrency(results.sinkingFundTarget)}</div>
                  </div>
                  <div className="text-[6.5px] text-slate-400 font-medium text-right">
                    Jumlah sasaran terkumpul
                  </div>
                </div>

                <div className="p-2 bg-white border border-slate-100 rounded-lg flex justify-between items-center text-[8px]">
                  <div>
                    <div className="font-black text-slate-400 uppercase tracking-widest text-[6.5px]">Tunai Baki Sedia Ada</div>
                    <div className="text-[10px] font-mono font-black text-amber-600">RM {formatCurrency(results.remainingSavingsForSinking)}</div>
                  </div>
                  <div className="text-[6.5px] text-slate-400 font-medium text-right">
                    (Simpanan - Kecemasan)
                  </div>
                </div>

                <div className={cn(
                  "p-2 rounded-lg border flex justify-between items-center text-[8px]",
                  results.sinkingFundShortfall > 0 
                    ? "bg-rose-50/50 border-rose-100 text-rose-900" 
                    : "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                )}>
                  <div>
                    <div className="font-black uppercase tracking-widest text-[6.5px]">
                      {results.sinkingFundShortfall > 0 ? "Kekurangan (Shortfall)" : "Status Agihan"}
                    </div>
                    <div className={cn(
                      "text-[10px] font-mono font-black",
                      results.sinkingFundShortfall > 0 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {results.sinkingFundShortfall > 0 
                        ? `RM ${formatCurrency(results.sinkingFundShortfall)}` 
                        : "Mencukupi"
                      }
                    </div>
                  </div>
                  <div className="text-[6.5px] opacity-80 font-medium text-right">
                    {results.sinkingFundShortfall > 0 ? "Perlu tambahan" : "Mencukupi"}
                  </div>
                </div>

                {/* Sinking Fund Items List if any exist */}
                {(data.sinkingFundItems || []).length > 0 && (
                  <div className="p-1.5 bg-white border border-slate-100 rounded-lg space-y-0.5">
                    <div className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest">Senarai Matlamat</div>
                    <div className="grid grid-cols-1 gap-0.5 max-h-[40px] overflow-hidden">
                      {(data.sinkingFundItems || []).slice(0, 2).map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-[7px]">
                          <span className="text-slate-600 font-medium truncate max-w-[120px]">{item.name || 'Matlamat Khas'}</span>
                          <span className="font-mono font-bold text-slate-800">RM {formatCurrency(item.target || 0)}</span>
                        </div>
                      ))}
                    </div>
                    {(data.sinkingFundItems || []).length > 2 && (
                      <div className="text-[5.5px] text-slate-400 italic text-right">+{(data.sinkingFundItems || []).length - 2} lagi</div>
                    )}
                  </div>
                )}

                {/* Progress bar */}
                <div className="space-y-0.5 bg-white p-1.5 border border-slate-100 rounded-lg">
                  <div className="flex justify-between items-center text-[6px] font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">Agihan Sinking Fund</span>
                    <span className={cn(
                      results.sinkingFundShortfall > 0 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {results.sinkingFundTarget > 0 ? Math.round(Math.min(100, (results.remainingSavingsForSinking / results.sinkingFundTarget) * 100)) : 100}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        results.sinkingFundShortfall > 0 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${results.sinkingFundTarget > 0 ? Math.min(100, (results.remainingSavingsForSinking / results.sinkingFundTarget) * 100) : 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tip */}
            <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100 text-amber-800 text-[7px] leading-relaxed">
              <span className="font-black block uppercase text-[6.5px] mb-0.5">Panduan Simpanan:</span>
              Asas kestabilan bermula dengan mencukupkan sasaran tabung kecemasan terlebih dahulu sebelum memindahkan dana bagi dana khusus (sinking fund). Pastikan dana diletakkan di tempat cair (liquid) dan selamat.
            </div>
          </div>

          {/* Footer Page 4 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[7px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 4 daripada 8</span>
          </div>
        </div>

        {/* Mobile Page 5: Analisa Takaful & Pendapatan */}
        <div id="mobile-pdf-page-5" className="w-[412px] h-[840px] bg-white text-slate-800 p-6 flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                NEED-BASED SOLUTION <span className="text-[5px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span>
              </span>
              <span className="text-[7px] text-primary-600 font-extrabold uppercase tracking-wider">2. PERLINDUNGAN</span>
            </div>

            <div className="mb-3">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="text-primary-500" size={12} /> 2. PERLINDUNGAN
              </h2>
              <p className="text-[7.5px] text-slate-500 mt-0.5 leading-tight">Penggantian pendapatan (Income Protection) menghadapi <strong>Malapetaka Kewangan 3D (Death, Disability, Disease)</strong> akibat hilang kemampuan bekerja.</p>
            </div>

            {/* Box: Target & Existing */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mb-4 text-[9px]">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-[8px] border-b border-slate-200 pb-1.5">
                Keperluan Takaful (Income Replacement)
              </h3>
              
              <div className="flex justify-between border-b border-slate-150/60 pb-1">
                <span className="text-slate-400">Ganti Gaji (10x tahunan):</span>
                <span className="font-bold text-slate-800 font-mono">RM {formatCurrency(results.deathBenefit)}</span>
              </div>
              
              <div className="flex justify-between border-b border-slate-150/60 pb-1">
                <span className="text-slate-400">Beban Hutang Sedia Ada:</span>
                <span className="font-bold text-slate-800 font-mono">RM {formatCurrency(results.debtSettlement)}</span>
              </div>

              <div className="flex justify-between border-b border-slate-150/60 pb-1">
                <span className="text-slate-800 font-bold">Jumlah Keperluan Takaful:</span>
                <span className="font-black text-slate-900 font-mono">RM {formatCurrency(results.totalTakafulNeed)}</span>
              </div>

              <div className="flex justify-between border-b border-slate-150/60 pb-1 bg-emerald-50/50 p-1 rounded">
                <span className="text-emerald-700 font-bold">Pampasan Sedia Ada (Kematian):</span>
                <span className="font-black text-emerald-800 font-mono">RM {formatCurrency(results.totalExistingDeathBenefit)}</span>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-bold">Jurang Perlindungan:</span>
                <span className={`font-mono font-black ${results.totalTakafulNeed - results.totalExistingDeathBenefit > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {results.totalTakafulNeed - results.totalExistingDeathBenefit > 0 
                    ? `RM ${formatCurrency(results.totalTakafulNeed - results.totalExistingDeathBenefit)}` 
                    : 'Perlindungan Mencukupi! 🎉'}
                </span>
              </div>
            </div>

            {/* Contribution and Summary */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[8.5px] space-y-1.5 mb-3">
              <span className="font-black text-slate-400 uppercase tracking-wider block text-[7px]">Caruman Polisi Semasa:</span>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Caruman Takaful Bulanan:</span>
                <span className="font-mono font-black text-primary-600">RM {formatCurrency(results.totalTakafulContribution)} / bln</span>
              </div>
              <p className="text-slate-500 leading-normal border-t border-slate-200/80 pt-2 text-[8px]">
                {results.totalTakafulNeed - results.totalExistingDeathBenefit > 0 ? (
                  <span>Anda dinasihatkan untuk menampung jurang perlindungan sebanyak <span className="text-rose-600 font-bold">RM {formatCurrency(results.totalTakafulNeed - results.totalExistingDeathBenefit)}</span> melalui pelan caruman Takaful Hibah baharu, bagi memastikan kebajikan waris dilindungi.</span>
                ) : (
                  <span className="text-emerald-700 font-medium">Hebat! Pampasan sedia ada anda berada dalam keadaan mencukupi untuk melunaskan baki hutang berserta kelangsungan hidup waris.</span>
                )}
              </p>
            </div>

            {/* Sijil Takaful List if any exist */}
            {(data.takafulPolicies || []).filter(p => p.isSaved).length > 0 && (
              <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-1 mb-4">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-0.5">Senarai Sijil Takaful Aktif (Manual)</div>
                <div className="space-y-1">
                  {(data.takafulPolicies || []).filter(p => p.isSaved).slice(0, 4).map((policy, idx) => (
                    <div key={policy.id || idx} className="flex justify-between items-center text-[7.5px] border-b border-slate-50 pb-0.5 last:border-0">
                      <span className="text-slate-600 font-medium truncate max-w-[150px]">
                        {policy.name || `Sijil ${idx + 1}`} <span className="text-slate-400 font-normal">({policy.company || 'Syarikat'})</span>
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        Pampasan: RM {formatCurrency(policy.deathBenefit || 0)} <span className="text-slate-300 mx-1">|</span> RM {formatCurrency(policy.monthlyContribution || 0)}/Bln
                      </span>
                    </div>
                  ))}
                </div>
                {(data.takafulPolicies || []).filter(p => p.isSaved).length > 4 && (
                  <div className="text-[6px] text-slate-400 italic text-right">+{(data.takafulPolicies || []).filter(p => p.isSaved).length - 4} lagi sijil berdaftar</div>
                )}
              </div>
            )}
          </div>

          {/* Footer Page 5 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[7px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 5 daripada 8</span>
          </div>
        </div>

        {/* Mobile Page 6: Strategi Persaraan */}
        <div id="mobile-pdf-page-6" className="w-[412px] h-[840px] bg-white text-slate-800 p-6 flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                NEED-BASED SOLUTION <span className="text-[5px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span>
              </span>
              <span className="text-[7px] text-primary-600 font-extrabold uppercase tracking-wider">3. PELABURAN</span>
            </div>

            <div className="mb-4">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <TrendingUp className="text-primary-500" size={12} /> 3. PELABURAN
              </h2>
              <p className="text-[8px] text-slate-500 mt-0.5">Analisis baki masa persediaan serta unjuran sasaran modal hidup bersara.</p>
            </div>

            {/* Stats Block */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 mb-4 text-[9px]">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-[8px] border-b border-slate-200 pb-1 flex justify-between">
                <span>Profil Persaraan Sasaran</span>
                <span className="text-primary-600 font-bold">{results.yearsToRetire} Tahun Lagi</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
                <div>
                  <span className="text-slate-400 block text-[7px]">Umur Bersara:</span>
                  <span className="font-bold text-slate-800">{data.targetRetirementAge} Tahun</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px]">Perbelanjaan Setahun:</span>
                  <span className="font-bold text-slate-800 font-mono">RM {formatCurrency(Math.round(results.futureAnnualExpenses))}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px]">Kadar Inflasi:</span>
                  <span className="font-bold text-slate-800 font-mono">{data.inflationRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px]">Kadar Dividen:</span>
                  <span className="font-bold text-slate-800 font-mono">{data.assetGrowthRate}% / thn</span>
                </div>
              </div>
            </div>

            {/* Capital needed vs Current projection */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-[9px] mb-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <div>
                  <span className="text-slate-400 block text-[7px]">Modal Bersara Diperlukan (Capital Needed):</span>
                  <span className="font-black text-slate-900 font-mono">RM {formatCurrency(results.requiredCapital)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[7px]">Jurang Sasaran (Shortfall):</span>
                  <span className={`font-mono font-black ${results.shortfall > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {results.shortfall > 0 ? `RM ${formatCurrency(results.shortfall)}` : 'Selesai / Mencukupi! 🎉'}
                  </span>
                </div>
              </div>
            </div>

            {/* Compound Assets List if assets exist */}
            {data.assets.length > 0 && (
              <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-1 mb-3 text-[9px]">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-0.5">Pembentukan Dana Gandaan (Aset Kompaun Semasa)</div>
                <div className="space-y-1">
                  {data.assets.slice(0, 4).map((asset, idx) => {
                    const futureVal = asset.value * Math.pow(1 + (data.assetGrowthRate / 100), results.yearsToRetire);
                    return (
                      <div key={asset.id || idx} className="flex justify-between items-center text-[7.5px] border-b border-slate-50 pb-0.5 last:border-0">
                        <span className="text-slate-600 font-medium truncate max-w-[150px]">
                          {asset.category}
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          Semasa: RM {formatCurrency(asset.value)} <span className="text-slate-300 mx-1">→</span> Unjuran: <span className="text-emerald-600">RM {formatCurrency(Math.round(futureVal))}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {data.assets.length > 4 && (
                  <div className="text-[6px] text-slate-400 italic text-right">+ {data.assets.length - 4} lagi aset sedia ada dipulangkan kompaun</div>
                )}
              </div>
            )}

            {/* Strategy Advice block */}
            <div className="p-3 rounded-xl bg-slate-900 text-white text-[8px] leading-relaxed">
              <span className="font-bold text-slate-200 block mb-0.5">Strategi Meluaskan Modal Persaraan:</span>
              {results.shortfall > 0 ? (
                <span>Bagi mengatasi baki jurang persaraan sebanyak <span className="font-bold text-rose-400">RM {formatCurrency(results.shortfall)}</span>, anda dinasihatkan agar mula memperuntukkan pelaburan tambahan bulanan secara konsisten ke dalam akaun berisiko sederhana tinggi.</span>
              ) : (
                <span className="text-emerald-400 font-medium">Tahniah! Aset anda yang sedia ada dijangka berkembang dengan baik pada kadar dividen semasa dan mampu menyara perbelanjaan hidup bulanan persaraan sepenuhnya.</span>
              )}
            </div>
          </div>

          {/* Footer Page 6 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[7px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 6 daripada 8</span>
          </div>
        </div>

        {/* Mobile Page 7: Pusaka Checklist */}
        <div id="mobile-pdf-page-7" className="w-[412px] h-[840px] bg-white text-slate-800 p-6 flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                NEED-BASED SOLUTION <span className="text-[5px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span>
              </span>
              <span className="text-[7px] text-slate-400 font-medium">Pengurusan Pusaka</span>
            </div>

            <div className="mb-4">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Scale className="text-primary-500" size={12} /> 6. TERTIB PENGURUSAN HARTA PUSAKA
              </h2>
              <p className="text-[8px] text-slate-500 mt-0.5">Senarai semak dan tertib agihan pusaka mengikut perundangan Syariah.</p>
            </div>

            {/* Checklist of 5 Steps */}
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1 text-[9px]">
                <span className="font-black text-slate-900 uppercase text-[8px]">5 TERTIB UTAMA HARTA PUSAKA</span>
                <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded text-[7.5px]">
                  {Object.values(completedSteps).filter(Boolean).length} / 5 Selesai
                </span>
              </div>

              {[
                { num: 1, title: "1. Pengurusan Jenazah", desc: "Perbelanjaan memandikan, mengafankan, mengebumikan." },
                { num: 2, title: "2. Pelunasan Hutang", desc: "Hutang kepada Allah (Zakat, Fidyah) & sesama manusia." },
                { num: 3, title: "3. Tuntutan Harta Sepencarian", desc: "Hak milik mutlak pasangan yang dituntut sebelum pusaka dibahagi." },
                { num: 4, title: "4. Pelaksanaan Wasiat", desc: "Pemberian kepada bukan waris (maksimum 1/3 daripada baki harta)." },
                { num: 5, title: "5. Pembahagian Faraid", desc: "Agihan baki harta bersih kepada waris mengikut ketetapan faraid." }
              ].map((step) => {
                const isDone = completedSteps[step.num];
                return (
                  <div key={step.num} className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-1.5 text-[8.5px]">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[7px] font-black ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {isDone ? "✓" : step.num}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800">{step.title}</span>
                        <span className={`text-[6.5px] font-extrabold px-1 py-0.2 rounded-full uppercase tracking-wider ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {isDone ? 'Selesai' : 'Sedia'}
                        </span>
                      </div>
                      <p className="text-[7.5px] text-slate-400 font-medium leading-normal">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Page 7 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[7px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 7 daripada 8</span>
          </div>
        </div>

        {/* Mobile Page 8: Kalkulator Faraid */}
        <div id="mobile-pdf-page-8" className="w-[412px] h-[840px] bg-white text-slate-800 p-6 flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                NEED-BASED SOLUTION <span className="text-[5px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span>
              </span>
              <span className="text-[7px] text-slate-400 font-medium">Agihan Faraid</span>
            </div>

            <div className="mb-3">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Scale className="text-primary-500" size={12} /> 7. PENGIRAAN NYATA AGIHAN FARAID
              </h2>
              <p className="text-[8px] text-slate-500 mt-0.5">Analisis pengagihan harta pusaka bersih mengikut nisbah rasmi waris terpilih.</p>
            </div>

            {/* Waris Inputs Summary */}
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl space-y-1 mb-3 text-[8px]">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Waris yang Layak:</span>
              <div className="flex flex-wrap gap-1">
                {spouse !== 'none' && (
                  <span className="bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-700 capitalize text-[7.5px]">
                    Pasangan: {spouse}
                  </span>
                )}
                {mother && (
                  <span className="bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-700 text-[7.5px]">
                    Ibu Kandung
                  </span>
                )}
                {father && (
                  <span className="bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-700 text-[7.5px]">
                    Bapa Kandung
                  </span>
                )}
                {sons > 0 && (
                  <span className="bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-700 text-[7.5px]">
                    {sons} Anak Lelaki
                  </span>
                )}
                {daughters > 0 && (
                  <span className="bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-700 text-[7.5px]">
                    {daughters} Anak Perempuan
                  </span>
                )}
                {spouse === 'none' && !mother && !father && sons === 0 && daughters === 0 && (
                  <span className="text-slate-400 italic text-[7.5px]">Tiada waris terpilih.</span>
                )}
              </div>
            </div>

            {/* Faraid Table */}
            <div className="border border-slate-150 rounded-lg overflow-hidden mb-3 text-[8px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[7px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-2 py-1">Waris</th>
                    <th className="px-1 py-1 text-center">Nisbah</th>
                    <th className="px-1 py-1 text-center">Peratus</th>
                    <th className="px-2 py-1 text-right">Agihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[7.5px] font-medium text-slate-700">
                  {faraidResults.length > 0 ? (
                    faraidResults.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-2 py-1 font-bold text-slate-800">{row.name}</td>
                        <td className="px-1 py-1 text-center font-bold text-primary-600 font-mono">{row.shareFraction}</td>
                        <td className="px-1 py-1 text-center font-mono text-slate-500">{row.percentage.toFixed(1)}%</td>
                        <td className="px-2 py-1 text-right font-black text-slate-900 font-mono">RM {formatCurrency(row.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-2 py-3 text-center text-slate-400 italic">
                        Baki harta RM {formatCurrency(estateValue || results.netWorth)} diserahkan sepenuhnya kepada Baitulmal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Disclaimer and signature */}
            <div className="p-2 rounded-xl border border-amber-100 bg-[#fffbeb] text-[7px] text-amber-700 leading-normal font-bold">
              NASIHAT / PENAFIAN: Dokumen ini dijana secara automatik sebagai rujukan simulasi perancangan am sahaja. Rujukan rasmi harus dirujuk kepada Mahkamah Syariah atau Pejabat Pusaka Kecil.
            </div>
          </div>

          {/* Footer Page 8 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[7px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 8 daripada 8</span>
          </div>
        </div>

        {/* Page 1: Executive Summary & Cash Flow */}
        <div id="pdf-page-1" className="w-[794px] h-[1123px] bg-white text-slate-800 p-[45px] flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <ShieldCheck size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="font-display font-black text-lg tracking-tight text-slate-900 leading-none flex items-baseline gap-1.5">
                    <span>NEED-BASED SOLUTION</span>
                    <span className="text-[9px] font-medium text-slate-400 lowercase italic">by</span>
                    <span className="text-xs font-black text-primary-600 uppercase tracking-wider">INFAQ Consultancy</span>
                  </h1>
                  <p className="text-[7.5px] text-slate-400 font-bold tracking-widest uppercase mt-1">Sistem Perancangan Kewangan</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-wider">
                  LAPORAN RASMI
                </span>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Tarikh: {new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Title */}
            <div className="my-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">LAPORAN PERANCANGAN KEWANGAN PERIBADI</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Analisis kedudukan kewangan semasa, perlindungan takaful, persaraan, dan pembahagian harta pusaka.</p>
            </div>

            {/* Client Profile */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-8">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={14} className="text-primary-500" /> Profil Pelanggan
              </h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Nama Penuh:</span>
                  <span className="font-bold text-slate-800">{data.name || 'Hamba Allah'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Umur Semasa:</span>
                  <span className="font-bold text-slate-800">{data.age} tahun</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Tarikh Lahir:</span>
                  <span className="font-bold text-slate-800">{data.dob || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Pekerjaan:</span>
                  <span className="font-bold text-slate-800">{data.job || 'Bekerja Sendiri'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Syarikat / Majikan:</span>
                  <span className="font-bold text-slate-800">{data.employer || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-medium">Status Perkahwinan:</span>
                  <span className="font-bold text-slate-800">{data.maritalStatus}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5 col-span-2">
                  <span className="text-slate-400 font-medium">Bilangan Tanggungan:</span>
                  <span className="font-bold text-slate-800">{data.dependents} orang</span>
                </div>
              </div>
            </div>

            {/* Cash Flow Analysis Section */}
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-primary-500" /> Ringkasan Aliran Tunai Bulanan
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-emerald-700/60 uppercase tracking-widest">Pendapatan</span>
                  <p className="text-lg font-black text-emerald-800 mt-1">RM {formatCurrency(data.monthlyIncome)}</p>
                  <p className="text-[9px] text-emerald-600 mt-0.5 font-bold">RM {formatCurrency(data.monthlyIncome * 12)} / thn</p>
                </div>
                
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-rose-700/60 uppercase tracking-widest">Perbelanjaan</span>
                  <p className="text-lg font-black text-rose-800 mt-1">RM {formatCurrency(data.monthlyExpenses)}</p>
                  <p className="text-[9px] text-rose-600 mt-0.5 font-bold">RM {formatCurrency(data.monthlyExpenses * 12)} / thn</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-slate-700/60 uppercase tracking-widest">Aliran Tunai Bersih</span>
                  <p className={`text-lg font-black mt-1 ${data.monthlyIncome - data.monthlyExpenses > 0 ? 'text-emerald-800' : data.monthlyIncome - data.monthlyExpenses < 0 ? 'text-rose-800' : 'text-slate-800'}`}>
                    RM {formatCurrency(data.monthlyIncome - data.monthlyExpenses)}
                  </p>
                  <div className="mt-1 flex justify-center">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${data.monthlyIncome - data.monthlyExpenses > 0 ? 'bg-emerald-100 text-emerald-800' : data.monthlyIncome - data.monthlyExpenses < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'}`}>
                      {data.monthlyIncome - data.monthlyExpenses > 0 ? 'Positif (Lebihan)' : data.monthlyIncome - data.monthlyExpenses < 0 ? 'Negatif (Defisit)' : 'Seimbang'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash Flow Health & Recommendation */}
              <div className="p-4 rounded-xl bg-slate-900 text-white text-xs leading-relaxed">
                <p className="font-bold text-slate-200 mb-1">Analisis Aliran Tunai:</p>
                {data.monthlyIncome - data.monthlyExpenses > 0 ? (
                  <p className="text-slate-300">
                    Sistem mengesan aliran tunai anda berada pada kedudukan <span className="text-emerald-400 font-bold">Positif</span> dengan lebihan sebanyak <span className="font-bold text-emerald-400">RM {formatCurrency(data.monthlyIncome - data.monthlyExpenses)}</span> sebulan (<span className="text-emerald-400 font-bold">{data.monthlyIncome > 0 ? ((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome * 100).toFixed(1) : 0}%</span> daripada pendapatan). Lebihan ini sangat bernilai untuk disalurkan ke dalam tabung kecemasan, dana persaraan, serta simpanan bermatlamat (Sinking Fund).
                  </p>
                ) : data.monthlyIncome - data.monthlyExpenses < 0 ? (
                  <p className="text-slate-300">
                    Sistem mengesan aliran tunai anda berada pada kedudukan <span className="text-rose-400 font-bold">Negatif</span> dengan defisit sebanyak <span className="font-bold text-rose-400">RM {formatCurrency(Math.abs(data.monthlyIncome - data.monthlyExpenses))}</span> sebulan. Keadaan ini berisiko tinggi dan boleh menjejaskan kestabilan kewangan anda jangka panjang. Adalah disarankan untuk menyemak kembali pecahan belanjawan bulanan bagi mengurangkan perbelanjaan tidak kritikal dengan kadar segera.
                  </p>
                ) : (
                  <p className="text-slate-300">
                    Aliran tunai bulanan anda berada pada tahap <span className="text-slate-300 font-bold">Seimbang</span> tanpa sebarang baki tunai tambahan. Anda dinasihatkan supaya mencari peluang mengoptimumkan perbelanjaan atau meningkatkan pendapatan tambahan bagi mewujudkan lebihan simpanan demi perlindungan masa hadapan.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Page 1 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 1 daripada 6</span>
          </div>
        </div>

        {/* Page 2: Net Worth (Aset & Hutang) */}
        <div id="pdf-page-2" className="w-[794px] h-[1123px] bg-white text-slate-800 p-[45px] flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>NEED-BASED SOLUTION <span className="text-[8px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span></span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Kunci Kira-kira Aset & Liabiliti</span>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Wallet className="text-primary-500" size={18} /> KUNCI KIRA-KIRA PERIBADI & NILAI BERSIH
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Pecahan penuh hak milik aset serta liabiliti/hutang yang ditanggung.</p>
            </div>

            {/* Net Worth Callout Banner */}
            <div className="bg-[#f0fdf4] border border-emerald-100 rounded-2xl p-5 mb-8 text-center">
              <span className="text-[10px] font-black text-emerald-800/60 uppercase tracking-widest block">NILAI BERSIH SEMASA (NET WORTH)</span>
              <p className={`text-3xl font-black mt-2 ${results.netWorth >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                RM {formatCurrency(results.netWorth)}
              </p>
              <p className="text-xs text-emerald-700/80 mt-1 font-medium max-w-lg mx-auto">
                Nilai bersih anda mewakili jumlah baki kekayaan selepas menolak semua hutang daripada nilai aset sedia ada. Nilai bersih yang positif membuktikan kedudukan solven yang mantap.
              </p>
            </div>

            {/* Assets and Debts Lists Side-by-Side */}
            <div className="grid grid-cols-2 gap-6">
              {/* Assets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Senarai Aset
                  </h3>
                  <span className="text-xs font-black text-emerald-700 font-mono">RM {formatCurrency(results.totalAssets)}</span>
                </div>

                <div className="space-y-2 max-h-[450px] overflow-hidden">
                  {data.assets.length > 0 ? (
                    data.assets.map((asset, index) => (
                      <div key={asset.id || index} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg text-xs">
                        <span className="font-bold text-slate-700 truncate max-w-[180px]">{asset.category}</span>
                        <span className="font-mono font-bold text-slate-900">RM {formatCurrency(asset.value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                      Tiada aset didaftarkan.
                    </div>
                  )}
                </div>
              </div>

              {/* Debts Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-rose-500 rounded-full"></span> Senarai Liabiliti / Hutang
                  </h3>
                  <span className="text-xs font-black text-rose-700 font-mono">RM {formatCurrency(results.totalDebts)}</span>
                </div>

                <div className="space-y-2 max-h-[450px] overflow-hidden">
                  {data.debts.length > 0 ? (
                    data.debts.map((debt, index) => (
                      <div key={debt.id || index} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg text-xs">
                        <span className="font-bold text-slate-700 truncate max-w-[180px]">{debt.category}</span>
                        <span className="font-mono font-bold text-slate-900">RM {formatCurrency(debt.value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                      Bagus! Anda tiada rekod hutang.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Page 2 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 2 daripada 6</span>
          </div>
        </div>

        {/* Page 3: Laporan Analisa Simpanan (Emergency & Sinking Fund) */}
        <div id="pdf-page-3" className="w-[794px] h-[1123px] bg-white text-slate-800 p-[45px] flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>NEED-BASED SOLUTION <span className="text-[8px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span></span>
              </span>
              <span className="text-[11px] text-primary-600 font-black uppercase tracking-wider">1. SIMPANAN</span>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Wallet className="text-primary-500" size={30} /> 1. SIMPANAN
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Analisa tabungan kecemasan serta pembentukan tabung bermatlamat (Sinking Fund).</p>
            </div>

            {/* Intro text */}
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/60 mb-6 text-xs text-slate-700 leading-relaxed font-medium">
              Simpanan kecairan adalah benteng pertama pertahanan kewangan anda. Sebelum memulakan pelaburan atau perlindungan jangka panjang, dana kecemasan sekurang-kurangnya 3 hingga 6 bulan perbelanjaan harus diwujudkan bagi mengelakkan kemurungan kewangan sekiranya berlaku kecelakaan, kehilangan pendapatan, atau krisis luar jangkaan.
            </div>

            {/* Simpanan Details */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              
              {/* Box 1: Tabung Kecemasan (Emergency Fund) */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                <h3 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2 flex justify-between">
                  <span>Tabung Kecemasan</span>
                  <span className="text-emerald-700 font-bold">Sasaran: {data.emergencyFundMonths || 3} Bulan</span>
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3.5 bg-white border border-slate-100 rounded-xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sasaran Diperlukan ({(data.emergencyFundMonths || 3)} Bulan Gaji)</div>
                    <div className="text-base font-mono font-black text-slate-900">RM {formatCurrency(results.emergencyFundTarget)}</div>
                    <div className="text-[8.5px] text-slate-400 font-medium mt-0.5">
                      Formula: RM {formatCurrency(data.monthlyIncome)} (Gaji) x {data.emergencyFundMonths || 3} bulan
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-100 rounded-xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tunai & Simpanan Sedia Ada</div>
                    <div className="text-base font-mono font-black text-emerald-600">RM {formatCurrency(results.currentSavings)}</div>
                    <div className="text-[8.5px] text-slate-400 font-medium mt-0.5">
                      Berdasarkan baki akaun Tunai, Tabung Haji, ASB, & Simpanan biasa
                    </div>
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-xl border",
                    results.savingsShortfall > 0 
                      ? "bg-rose-50/70 border-rose-100 text-rose-900" 
                      : "bg-emerald-50/70 border-emerald-100 text-emerald-900"
                  )}>
                    <div className="text-[9px] font-black uppercase tracking-widest mb-1">
                      {results.savingsShortfall > 0 ? "Jumlah Kekurangan (Shortfall)" : "Status Simpanan"}
                    </div>
                    <div className={cn(
                      "text-base font-mono font-black",
                      results.savingsShortfall > 0 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {results.savingsShortfall > 0 
                        ? `RM ${formatCurrency(results.savingsShortfall)}` 
                        : "Simpanan Mencukupi!"
                      }
                    </div>
                    <div className="text-[8.5px] opacity-80 font-medium mt-0.5">
                      {results.savingsShortfall > 0 
                        ? "Anda perlu meningkatkan caruman simpanan bulanan" 
                        : "Tahniah! Tabung kecemasan anda selamat"
                      }
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 bg-white p-3 border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-center text-[8.5px] font-black">
                      <span className="text-slate-400 uppercase tracking-widest">Status Pencapaian Dana Kecemasan</span>
                      <span className={cn(
                        results.savingsShortfall > 0 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {Math.round(Math.min(100, (results.currentSavings / results.emergencyFundTarget) * 100))}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          results.savingsShortfall > 0 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(100, (results.currentSavings / results.emergencyFundTarget) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Sinking Fund (Tabung Khas) */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                <h3 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2 flex justify-between">
                  <span>Tabung Berasas Matlamat (Sinking Fund)</span>
                  <span className="text-indigo-700 font-bold">Dana Bertujuan</span>
                </h3>

                <div className="space-y-3">
                  <div className="p-3.5 bg-white border border-slate-100 rounded-xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jumlah Sasaran Sinking Fund</div>
                    <div className="text-base font-mono font-black text-slate-900">RM {formatCurrency(results.sinkingFundTarget)}</div>
                    <div className="text-[8.5px] text-slate-400 font-medium mt-0.5">
                      Jumlah keseluruhan matlamat jangka pendek dan sederhana
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-100 rounded-xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tunai Lebihan Diagihkan</div>
                    <div className="text-base font-mono font-black text-amber-600">RM {formatCurrency(results.remainingSavingsForSinking)}</div>
                    <div className="text-[8.5px] text-slate-400 font-medium mt-0.5">
                      Baki lebihan: RM {formatCurrency(results.currentSavings)} (Simpanan) - RM {formatCurrency(results.emergencyFundTarget)} (Kecemasan)
                    </div>
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-xl border",
                    results.sinkingFundShortfall > 0 
                      ? "bg-rose-50/50 border-rose-100 text-rose-900" 
                      : "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                  )}>
                    <div className="text-[9px] font-black uppercase tracking-widest mb-1">
                      {results.sinkingFundShortfall > 0 ? "Jumlah Kekurangan (Shortfall)" : "Status Sinking Fund"}
                    </div>
                    <div className={cn(
                      "text-base font-mono font-black",
                      results.sinkingFundShortfall > 0 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {results.sinkingFundShortfall > 0 
                        ? `RM ${formatCurrency(results.sinkingFundShortfall)}` 
                        : "Sinking Fund Mencukupi!"
                      }
                    </div>
                    <div className="text-[8.5px] opacity-80 font-medium mt-0.5">
                      {results.sinkingFundShortfall > 0 
                        ? "Ada jurang sasaran matlamat khusus" 
                        : "Semua dana khusus anda mencukupi"
                      }
                    </div>
                  </div>

                  {/* Sinking Fund Items List if any exist */}
                  {(data.sinkingFundItems || []).length > 0 && (
                    <div className="p-3.5 bg-white border border-slate-100 rounded-xl space-y-1.5">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Senarai Matlamat Simpanan Khusus</div>
                      <div className="space-y-1 max-h-[85px] overflow-hidden">
                        {(data.sinkingFundItems || []).slice(0, 4).map((item) => (
                          <div key={item.id} className="flex justify-between items-center text-[9px] border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                            <span className="text-slate-600 font-bold truncate max-w-[150px]">{item.name || 'Matlamat Khas'}</span>
                            <span className="font-mono font-black text-slate-800">RM {formatCurrency(item.target || 0)}</span>
                          </div>
                        ))}
                      </div>
                      {(data.sinkingFundItems || []).length > 4 && (
                        <div className="text-[7.5px] text-slate-400 italic text-right">+{(data.sinkingFundItems || []).length - 4} lagi matlamat khusus berdaftar</div>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 bg-white p-3 border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-center text-[8.5px] font-black">
                      <span className="text-slate-400 uppercase tracking-widest">Status Agihan Sinking Fund</span>
                      <span className={cn(
                        results.sinkingFundShortfall > 0 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {results.sinkingFundTarget > 0 ? Math.round(Math.min(100, (results.remainingSavingsForSinking / results.sinkingFundTarget) * 100)) : 100}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          results.sinkingFundShortfall > 0 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${results.sinkingFundTarget > 0 ? Math.min(100, (results.remainingSavingsForSinking / results.sinkingFundTarget) * 100) : 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Advice and Recommendation block */}
            <div className="mt-6 bg-slate-900 text-white p-4 rounded-xl border border-slate-850 flex flex-col gap-2 text-xs leading-relaxed">
              <span className="font-bold text-emerald-400 uppercase tracking-widest text-[10px]">Strategi & Nasihat Simpanan:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 font-medium text-[11px]">
                <li><strong>Asingkan Tabung Kecemasan:</strong> Simpan di instrumen kecairan tinggi seperti akaun bank berasingan, ASB (Sijil/Tabung), atau Tabung Haji. Jangan melabur dana ini di instrumen berisiko tinggi.</li>
                <li><strong>Kaedah Sinking Fund:</strong> Pecahkan simpanan mengikut matlamat khusus (Road tax, cuti tahunan, perayaan, deposit hartanah) untuk mengelakkan ketirisan simpanan utama kecemasan anda.</li>
                <li><strong>Disiplin Potongan Autokratik:</strong> Gunakan arahan sedia ada (Standing Instruction) bulanan setiap kali menerima gaji bagi menjamin pematuhan simpanan konsisten.</li>
              </ul>
            </div>

          </div>

          {/* Footer Page 3 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 3 daripada 6</span>
          </div>
        </div>

        {/* Page 4: Laporan Analisa Perlindungan (Takaful) */}
        <div id="pdf-page-4" className="w-[794px] h-[1123px] bg-white text-slate-800 p-[45px] flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>NEED-BASED SOLUTION <span className="text-[8px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span></span>
              </span>
              <span className="text-[11px] text-primary-600 font-black uppercase tracking-wider">2. PERLINDUNGAN</span>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <ShieldCheck className="text-primary-500" size={30} /> 2. PERLINDUNGAN
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Penggantian pendapatan (Income Protection) dan pelunasan liabiliti semasa musibah.</p>
            </div>

            {/* Intro text: Malapetaka Kewangan (Financial Disaster) - Musibah 3D */}
            <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200/80 mb-6 text-xs text-slate-700 leading-relaxed font-medium space-y-1.5">
              <div className="flex items-center gap-2 font-black text-rose-900 text-[11px] uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                <span>Benteng Malapetaka Kewangan (Financial Disaster) — Musibah 3D</span>
              </div>
              <p>
                <strong>Income Protection</strong> adalah benteng kewangan utama sekiranya berlaku <strong>MALAPETAKA KEWANGAN (FINANCIAL DISASTER)</strong>. Apabila musibah <strong>3D</strong> (<strong>DEATH</strong> - Kematian, <strong>DISABILITY</strong> - Hilang Upaya Kekal/TPD, atau <strong>DISEASE</strong> - Penyakit Kritikal) melanda, individu akan <strong>hilang kemampuan untuk bekerja</strong>. Perlindungan yang lengkap memastikan kelangsungan sara hidup waris terjamin dan segala liabiliti hutang dapat dilunaskan sepenuhnya.
              </p>
            </div>

            {/* Three Column Variables Grid */}
            <div className="grid grid-cols-3 gap-4 text-xs mb-5">
              
              {/* Column A: Income Protection */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-1">A. Penggantian Pendapatan (Disyorkan)</div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Kematian / TPD (10x Gaji):</span>
                  <span className="font-bold text-slate-800 font-mono">RM {formatCurrency(results.deathBenefit)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Penyakit Kritikal (5x Gaji):</span>
                  <span className="font-bold text-slate-800 font-mono">RM {formatCurrency(results.ciBenefit)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center font-bold text-primary-600 text-[9px]">
                  <span>Caruman Disyorkan (10%):</span>
                  <span className="font-mono">RM {formatCurrency(Math.round(results.budgetIncomeProtection / 12))} / Bln</span>
                </div>
              </div>

              {/* Column B: Debt Settlement */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-1">B. Pelunasan Liabiliti / Hutang</div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Baki Hutang Semasa:</span>
                  <span className="font-bold text-rose-600 font-mono">RM {formatCurrency(results.debtSettlement)}</span>
                </div>
                <p className="text-[8.5px] text-slate-400 leading-normal mt-1 font-medium">
                  Hutang wajib dilunaskan penuh sebelum pembagian harta pusaka dilakukan mengikut syarak.
                </p>
              </div>

              {/* Column C: Status Keperluan vs Sedia Ada */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-1">C. Kedudukan Sijil Sedia Ada</div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Sedia Ada (Kematian):</span>
                  <span className="font-mono font-bold text-emerald-600">RM {formatCurrency(results.totalExistingDeathBenefit)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Sedia Ada (Kritikal):</span>
                  <span className="font-mono font-bold text-emerald-600">RM {formatCurrency(results.totalExistingCIBenefit)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center font-bold text-primary-600 text-[9px]">
                  <span>Jumlah Caruman Aktif:</span>
                  <span className="font-mono">RM {formatCurrency(results.totalTakafulContribution)} / Bln</span>
                </div>
              </div>

            </div>

            {/* Sijil Takaful List if any exist */}
            {(data.takafulPolicies || []).filter(p => p.isSaved).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 mb-5 text-xs">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Senarai Sijil Takaful Berdaftar (Manual)</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {(data.takafulPolicies || []).filter(p => p.isSaved).slice(0, 6).map((policy, idx) => (
                    <div key={policy.id || idx} className="flex justify-between items-center text-[9.5px] border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                      <span className="text-slate-600 font-bold truncate max-w-[160px]">
                        {policy.name || `Sijil ${idx + 1}`} <span className="text-slate-400 font-normal">({policy.company || 'Syarikat'})</span>
                      </span>
                      <span className="font-mono font-black text-slate-700">
                        Pampasan: RM {formatCurrency(policy.deathBenefit || 0)} <span className="text-slate-300 mx-1">|</span> Caruman: RM {formatCurrency(policy.monthlyContribution || 0)}/Bln
                      </span>
                    </div>
                  ))}
                </div>
                {(data.takafulPolicies || []).filter(p => p.isSaved).length > 6 && (
                  <div className="text-[8px] text-slate-400 italic text-right">+{(data.takafulPolicies || []).filter(p => p.isSaved).length - 6} lagi sijil berdaftar terpelihara</div>
                )}
              </div>
            )}

            {/* Progress and Shortfall Callout banner */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Keperluan Kasar (A + B)</span>
                <span className="font-black text-slate-800 font-mono text-base block">RM {formatCurrency(results.totalTakafulNeed)}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Jurang Perlindungan (Shortfall)</span>
                  <span className={cn(
                    "font-mono font-black text-sm",
                    results.totalTakafulNeed > results.totalExistingDeathBenefit ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {results.totalTakafulNeed > results.totalExistingDeathBenefit 
                      ? `Kekurangan RM ${formatCurrency(results.totalTakafulNeed - results.totalExistingDeathBenefit)}` 
                      : "Perlindungan Mencukupi!"
                    }
                  </span>
                </div>
                <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, results.totalTakafulNeed > 0 ? (results.totalExistingDeathBenefit / results.totalTakafulNeed) * 100 : 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Advice and Recommendation block */}
            <div className="mt-6 bg-slate-900 text-white p-4 rounded-xl border border-slate-850 flex flex-col gap-2 text-xs leading-relaxed">
              <span className="font-bold text-rose-400 uppercase tracking-widest text-[10px]">Strategi & Nasihat Perlindungan:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 font-medium text-[11px]">
                <li><strong>Guna Polisi Term Takaful:</strong> Bagi menampung jurang (shortfall) yang besar dengan caruman rendah, polisi berjangka (Term Takaful) adalah penyelesaian terbaik berbanding Investment-Linked biasa.</li>
                <li><strong>Lindungi Hutang Gergasi:</strong> Pastikan pembiayaan perumahan anda dilindungi sepenuhnya oleh MRTT/MLTT semasa pembelian harta, manakala hutang lain dilindungi secara peribadi.</li>
                <li><strong>Semakan Berkala 3-5 Tahun:</strong> Apabila pendapatan meningkat atau komitmen isi rumah berubah, jurang perlindungan takaful anda perlu dicalculate semula bagi menjamin keutuhan kedudukan kewangan.</li>
              </ul>
            </div>

          </div>

          {/* Footer Page 4 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 4 daripada 6</span>
          </div>
        </div>

        {/* Page 5: Laporan Analisa Pelaburan (Dana Persaraan) */}
        <div id="pdf-page-5" className="w-[794px] h-[1123px] bg-white text-slate-800 p-[45px] flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>NEED-BASED SOLUTION <span className="text-[8px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span></span>
              </span>
              <span className="text-[11px] text-primary-600 font-black uppercase tracking-wider">3. PELABURAN</span>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <TrendingUp className="text-primary-500" size={30} /> 3. PELABURAN
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Pengumpulan modal perisai inflasi untuk mengekalkan kesejahteraan gaya hidup bersara.</p>
            </div>

            {/* Intro text */}
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/60 mb-6 text-xs text-slate-700 leading-relaxed font-medium">
              Pelaburan jangka panjang berpaksikan kesan kompaun (compounding interest) adalah jentera utama untuk menumbuhkan dana persaraan. Dengan mengunjurkan kadar pulangan aset mengatasi inflasi tahunan, modal mencukupi dapat disasarkan bagi menampung gaya hidup bersara impian anda.
            </div>

            {/* Three Column Variables Grid */}
            <div className="grid grid-cols-3 gap-4 text-xs mb-5">
              
              {/* Column A: Pembolehubah Persaraan */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-1">A. Pembolehubah Simulasi</div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Umur Bersara Sasaran:</span>
                  <span className="font-bold text-slate-800">{data.targetRetirementAge} Tahun</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Baki Tempoh Bekerja:</span>
                  <span className="font-bold text-slate-800">{results.yearsToRetire} Tahun Baki</span>
                </div>
                <div className="flex justify-between items-center py-0.5 font-bold text-primary-600 text-[9px] pt-1.5 border-t border-slate-200/60">
                  <span>Gaya Hidup Bersara:</span>
                  <span>{data.lifestyleAdjustmentRate}% Belanja Semasa</span>
                </div>
              </div>

              {/* Column B: Andaian Kadar & Inflasi */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-1">B. Andaian Ekonomi & Aset</div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Kadar Inflasi Tahunan:</span>
                  <span className="font-bold text-slate-800">{data.inflationRate}%</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Pulangan Aset (ROI):</span>
                  <span className="font-bold text-slate-800">{data.assetGrowthRate}% / Thn</span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-800 text-[9px] pt-1.5 border-t border-slate-200/60">
                  <span>Anggaran Belanja Bersara:</span>
                  <span className="font-mono">RM {formatCurrency(Math.round(results.futureAnnualExpenses / 12))} / Bln</span>
                </div>
              </div>

              {/* Column C: Unjuran Nilai Aset */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-1">C. Status Modal & Unjuran</div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Keperluan Modal (Target):</span>
                  <span className="font-bold text-slate-800 font-mono">RM {formatCurrency(results.requiredCapital)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-bold">Unjuran Nilai Aset:</span>
                  <span className="font-mono font-bold text-emerald-600">RM {formatCurrency(results.futureValueAssets)}</span>
                </div>
                <p className="text-[8px] text-slate-400 leading-normal mt-1.5 font-medium">
                  Nilai aset terkumpul dikompoun sepanjang {results.yearsToRetire} tahun baki persaraan.
                </p>
              </div>

            </div>

            {/* Compound Assets List if assets exist */}
            {data.assets.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 mb-5 text-xs">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Pembentukan Dana Gandaan (Aset Kompaun Semasa)</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {data.assets.slice(0, 6).map((asset, idx) => {
                    const futureVal = asset.value * Math.pow(1 + (data.assetGrowthRate / 100), results.yearsToRetire);
                    return (
                      <div key={asset.id || idx} className="flex justify-between items-center text-[9px] border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                        <span className="text-slate-600 font-bold truncate max-w-[150px]">
                          {asset.category}
                        </span>
                        <span className="font-mono font-black text-slate-700">
                          Semasa: RM {formatCurrency(asset.value)} <span className="text-slate-300 mx-1">→</span> Unjuran: <span className="text-emerald-600">RM {formatCurrency(Math.round(futureVal))}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {data.assets.length > 6 && (
                  <div className="text-[8px] text-slate-400 italic text-right">+ {data.assets.length - 6} lagi portfolio aset sedang digandakan kompaun</div>
                )}
              </div>
            )}

            {/* Progress & Shortfall callout banner */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Sasaran Modal Bersara</span>
                <span className="font-black text-slate-800 font-mono text-base block">RM {formatCurrency(results.requiredCapital)}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Status Kelompangan Modal (Shortfall)</span>
                  <span className={cn(
                    "font-mono font-black text-sm",
                    results.shortfall > 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {results.shortfall > 0 
                      ? `Kekurangan RM ${formatCurrency(results.shortfall)}` 
                      : "Dana Persaraan Mencukupi!"
                    }
                  </span>
                </div>
                <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${results.requiredCapital > 0 ? Math.min(100, (results.futureValueAssets / results.requiredCapital) * 100) : 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Advice and Recommendation block */}
            <div className="mt-6 bg-slate-900 text-white p-4 rounded-xl border border-slate-850 flex flex-col gap-2 text-xs leading-relaxed">
              <span className="font-bold text-emerald-400 uppercase tracking-widest text-[10px]">Strategi & Nasihat Pelaburan Persaraan:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 font-medium text-[11px]">
                <li><strong>Kuasa Pelaburan Kompaun:</strong> Mulakan pelaburan secepat mungkin bagi memaksimumkan pusingan gandaan kompaun aset anda. Beza 5 tahun mula melabur boleh mengubah unjuran ratusan ribu ringgit.</li>
                <li><strong>Diversifikasi Portfolio Pintar:</strong> Bahagikan aset persaraan kepada kategori bersesuaian dengan selera risiko: instrumen pulangan konsisten rendah-sederhana (ASB, Tabung Haji, KWSP) & pertumbuhan tinggi (Unit Amanah, Ekuiti, ETF global).</li>
                <li><strong>Gunakan Dividen Kompaun Semula:</strong> Pastikan dividen dan pulangan tidak dikeluarkan atau dibelanjakan sebelum mencapai fasa persaraan, bagi memastikan rantaian compounding berfungsi optimum.</li>
              </ul>
            </div>

          </div>

          {/* Footer Page 5 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 5 daripada 6</span>
          </div>
        </div>

        {/* Page 6: Pusaka & Faraid */}
        <div id="pdf-page-6" className="w-[794px] h-[1123px] bg-white text-slate-800 p-[45px] flex flex-col justify-between select-none relative font-sans leading-normal">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>NEED-BASED SOLUTION <span className="text-[8px] font-bold text-slate-400 lowercase italic">by</span> <span className="text-primary-600 font-extrabold">INFAQ Consultancy</span></span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Pengurusan Pusaka & Faraid</span>
            </div>

            {/* Content Body */}
            <div className="space-y-6">
              {/* Intro Summary Box */}
              <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100/60 flex justify-between items-center">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-rose-800 uppercase tracking-wider block">Laporan Pewarisan & Faraid</span>
                  <h2 className="text-sm font-extrabold text-slate-800">Ringkasan Status Persediaan & Pengagihan Harta</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Unjuran pembahagian pusaka bersih berdasarkan keadaan waris semasa dan ketetapan syarak.</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-slate-400 font-bold block uppercase">Jumlah Harta Bersih</span>
                  <span className="text-base font-black text-slate-900 font-mono text-sm block">RM {formatCurrency(estateValue || results.netWorth)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Column 1: Senarai Semak 5 Tertib Pusaka */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-1.5 flex justify-between items-center">
                    <span>1. Senarai semak 5 tertib pusaka</span>
                    <span className="text-[9px] text-rose-600 font-bold">
                      {Object.values(completedSteps).filter(Boolean).length} / 5 Selesai
                    </span>
                  </h3>
                  <div className="space-y-2.5">
                    {[
                      { num: 1, title: "Pengurusan Jenazah", desc: "Kos mandian, kafan, kubur & pengangkutan." },
                      { num: 2, title: "Pelunasan Hutang", desc: "Hutang Allah (zakat, fidyah) & hutang manusia." },
                      { num: 3, title: "Tuntutan Harta Sepencarian", desc: "Hak pasangan sebelum pembahagian pusaka." },
                      { num: 4, title: "Pelaksanaan Wasiat", desc: "Pemberian bukan waris (maksimum 1/3 harta)." },
                      { num: 5, title: "Pembahagian Faraid / Muafakat", desc: "Nisbah rasmi waris atau persetujuan bersama." }
                    ].map((step) => {
                      const isDone = completedSteps[step.num];
                      return (
                        <div key={step.num} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {isDone ? "✓" : step.num}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-slate-800 leading-tight">{step.title}</span>
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                {isDone ? 'Selesai' : 'Sedia'}
                              </span>
                            </div>
                            <p className="text-[8.5px] text-slate-400 font-medium leading-normal mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Kalkulator & Agihan Faraid */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-1.5 flex justify-between items-center">
                    <span>2. Pengiraan Agihan Faraid</span>
                    <span className="text-[9px] text-slate-500 font-bold">Mengikut Hukum Syarak</span>
                  </h3>
                  
                  {/* Waris Inputs Summary */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Waris yang Layak / Dimasukkan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {spouse !== 'none' && (
                        <span className="text-[9px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700 capitalize">
                          Pasangan: {spouse}
                        </span>
                      )}
                      {mother && (
                        <span className="text-[9px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700">
                          Ibu Kandung
                        </span>
                      )}
                      {father && (
                        <span className="text-[9px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700">
                          Bapa Kandung
                        </span>
                      )}
                      {sons > 0 && (
                        <span className="text-[9px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700">
                          {sons} Anak Lelaki
                        </span>
                      )}
                      {daughters > 0 && (
                        <span className="text-[9px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700">
                          {daughters} Anak Perempuan
                        </span>
                      )}
                      {spouse === 'none' && !mother && !father && sons === 0 && daughters === 0 && (
                        <span className="text-[9px] font-bold text-slate-400 italic">Tiada waris dipilih.</span>
                      )}
                    </div>
                  </div>

                  {/* Agihan Faraid Table */}
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[8px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="px-3 py-2">Waris Faraid</th>
                          <th className="px-2 py-2 text-center">Nisbah</th>
                          <th className="px-2 py-2 text-center">Peratus</th>
                          <th className="px-3 py-2 text-right">Agihan (RM)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[9px] font-medium text-slate-700">
                        {faraidResults.length > 0 ? (
                          faraidResults.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-bold text-slate-800">{row.name}</td>
                              <td className="px-2 py-2 text-center font-bold text-primary-600 font-mono">{row.shareFraction}</td>
                              <td className="px-2 py-2 text-center font-mono text-slate-500">{row.percentage.toFixed(1)}%</td>
                              <td className="px-3 py-2 text-right font-black text-slate-900 font-mono">RM {formatCurrency(row.amount)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic text-[9px]">
                              Baki harta RM {formatCurrency(estateValue || results.netWorth)} diserahkan sepenuhnya kepada Baitulmal kerana tiada waris terpilih.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Note block */}
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[8px] text-amber-800 font-medium leading-relaxed">
                    <p className="font-bold mb-0.5">NOTA PERANCANGAN PUSAKA:</p>
                    Urusan pembahagian Faraid ini boleh dipermudahkan semasa hidup dengan menggunakan instrumen <span className="font-black text-amber-900">HIBAH HARTA</span> bagi mengelakkan pembekuan aset serta memastikan kebajikan pasangan dan anak-anak terpelihara secara terus tanpa tempoh tuntutan mahkamah yang lama.
                  </div>
                </div>
              </div>
              
              {/* Disclaimer block */}
              <div className="pt-4 border-t border-slate-200/60 mt-4 bg-[#fffbeb] p-3 rounded-xl border border-amber-100 flex items-start gap-2 text-[8px] text-amber-700 font-bold select-none leading-relaxed">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <div>
                  NASIHAT / PENAFIAN / DISCLAIMER: Dokumen laporan perancangan kewangan peribadi ini dijana secara automatik berdasarkan input yang diberikan oleh pengguna. Semua pengiraan, strategi perlindungan, unjuran persaraan, serta agihan pusaka adalah bersifat rujukan simulasi am sahaja dan tidak boleh dianggap sebagai nasihat pelaburan rasmi, perundangan syariah mutlak, atau representasi berkanun daripada badan penguatkuasa rasmi. Rujuk perancang kewangan bertauliah (CFP/ChFC) serta penasihat syariah berdaftar untuk merangka dokumen pengurusan rasmi.
                </div>
              </div>

            </div>
          </div>

          {/* Footer Page 6 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-medium">
            <span>NEED-BASED SOLUTION by <span className="font-bold text-slate-600">INFAQ Consultancy</span></span>
            <span>Halaman 6 daripada 6</span>
          </div>
        </div>

      </div>

      {/* Decorative background elements */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none -translate-x-1/2 translate-y-1/2"></div>
    </div>
  );
}
