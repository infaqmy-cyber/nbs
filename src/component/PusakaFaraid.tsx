import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  BookOpen, 
  Calculator, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Info,
  ShieldAlert,
  Coins,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

// --- Types ---
interface HeirsInput {
  estateValue: number;
  spouse: 'none' | 'suami' | 'isteri';
  mother: boolean;
  father: boolean;
  sons: number;
  daughters: number;
}

interface FaraidResultRow {
  name: string;
  shareFraction: string;
  percentage: number;
  amount: number;
  description: string;
}

interface PusakaFaraidProps {
  netWorth: number;
  completedSteps: Record<number, boolean>;
  setCompletedSteps: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  estateValue: number;
  setEstateValue: React.Dispatch<React.SetStateAction<number>>;
  spouse: 'none' | 'suami' | 'isteri';
  setSpouse: React.Dispatch<React.SetStateAction<'none' | 'suami' | 'isteri'>>;
  mother: boolean;
  setMother: React.Dispatch<React.SetStateAction<boolean>>;
  father: boolean;
  setFather: React.Dispatch<React.SetStateAction<boolean>>;
  sons: number;
  setSons: React.Dispatch<React.SetStateAction<number>>;
  daughters: number;
  setDaughters: React.Dispatch<React.SetStateAction<number>>;
}

export default function PusakaFaraid({ 
  netWorth,
  completedSteps,
  setCompletedSteps,
  estateValue,
  setEstateValue,
  spouse,
  setSpouse,
  mother,
  setMother,
  father,
  setFather,
  sons,
  setSons,
  daughters,
  setDaughters
}: PusakaFaraidProps) {
  const [activeSubTab, setActiveSubTab] = useState<'langkah' | 'kalkulator'>('langkah');
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  // Load user net worth shortcut
  const handleUseNetWorth = () => {
    setEstateValue(Math.max(0, Math.round(netWorth)));
  };

  const stepsData = [
    {
      num: 1,
      title: "1. Pengurusan Jenazah",
      subtitle: "Urusan pertama & paling utama",
      badge: "Wajib didahulukan",
      shortDesc: "Kos menguruskan pengebumian termasuk mandian, kafan, galian kubur, dan pengangkutan jenazah.",
      longDesc: "Segala perbelanjaan asas pengurusan jenazah hendaklah diselesaikan terlebih dahulu menggunakan baki tunai atau akaun si mati, atau tabung khairat kematian sebelum harta tersebut dibuka untuk pembayaran hutang mahupun pembahagian pusaka.",
      tips: "Sebaiknya waris mendaftar keahlian khairat kematian kariah masjid tempatan bagi mengurangkan beban sara hidup sekiranya berlaku kematian secara tiba-tiba."
    },
    {
      num: 2,
      title: "2. Pelunasan Hutang",
      subtitle: "Hutang Allah & hutang manusia",
      badge: "Wajib dilunaskan",
      shortDesc: "Melunaskan semua liabiliti tertunggak milik si mati bermula daripada harta peninggalannya.",
      longDesc: "Pelunasan hutang terbahagi kepada dua kategori:\n\n1. Hutang kepada Allah: Zakat yang belum dibayar, fidyah puasa, kaffarah sumpah, nazat serta badal haji (jika sudah wajib tetapi belum dilakukan).\n2. Hutang kepada Manusia: Pinjaman perumahan, kenderaan, kad kredit, pinjaman individu, pinjaman perniagaan, atau sebarang cagaran.\n\nWaris digalakkan menyemak semua penyata liabiliti si mati untuk mengelakkan rohnya tergantung.",
      tips: "Takaful perlindungan hutang (seperti MRTT/MLTT untuk rumah) sangat penting bagi melunaskan baki pembiayaan baki pinjaman perumahan secara automatik sekiranya berlaku musibah."
    },
    {
      num: 3,
      title: "3. Tuntutan Harta Sepencarian",
      subtitle: "Hak pasangan dalam perkahwinan",
      badge: "Sebelum perwarisan",
      shortDesc: "Tuntutan pembahagian harta diperoleh bersama semasa tempoh perkahwinan yang sah.",
      longDesc: "Harta Sepencarian merupakan hak pasangan (suami/isteri) ke atas harta yang dikumpul bersama sepanjang tempoh perkahwinan mereka. Tuntutan ini perlu difailkan di Mahkamah Syariah terlebih dahulu sebelum baki harta bersih difaraidkan. Biasanya pasangan berhak menuntut sehingga 50% atau mengikut keputusan sumbangan masing-masing yang diperakukan hakim.",
      tips: "Membuat pengisytiharan Harta Sepencarian secara bertulis semasa hidup dapat mengurangkan konflik dan memendekkan tempoh tuntutan di mahkamah kelak."
    },
    {
      num: 4,
      title: "4. Pelaksanaan Wasiat",
      subtitle: "Pemberian kepada bukan waris",
      badge: "Maksima 1/3 harta bersih",
      shortDesc: "Menunaikan hasrat terakhir si mati mengikut syarat bertulis yang dibenarkan syarak.",
      longDesc: "Wasiat merupakan amanah pembahagian harta yang berkuatkuasa selepas kematian pemiliknya. Namun wasiat hanya boleh diberikan kepada:\n\n1. Pihak selain daripada waris Faraid (seperti anak angkat, saudara baru, yayasan kebajikan, anak yatim, masjid, sahabat, dll).\n2. Kandungan nilai wasiat tidak boleh melebihi 1/3 daripada baki keseluruhan harta selepas ditolak kos urus jenazah dan semua hutang.\n\nWasiat kepada waris Faraid tidak sah kecuali sekiranya dipersetujui sepenuhnya oleh semua waris Faraid yang lain selepas kematian.",
      tips: "Untuk waris kandung, instrumen HIBAH (pemberian kasih sayang semasa hidup) adalah lebih tepat dan selamat berbanding wasiat kerana hibah terus bertukar hak milik tanpa tertakluk kepada had 1/3 atau Faraid."
    },
    {
      num: 5,
      title: "5. Pembahagian Faraid & Muafakat",
      subtitle: "Langkah penutup hak waris",
      badge: "Hukum Faraid / Muafakat",
      shortDesc: "Agihan baki harta bersih terakhir kepada waris-waris yang sah mengikut ketetapan syarak.",
      longDesc: "Pembahagian pusaka terakhir dilakukan mengikut hukum Faraid iaitu formula matematik agihan rasmi mengikut Al-Quran dan Hadis.\n\nNamun begitu, Hukum Syarak juga membenarkan kaedah MUAFAKAT (Takharuj). Semua waris boleh bersepakat untuk membahagikan harta mengikut nisbah yang mereka setujui bersama (cth: sama rata, atau melepaskan bahagian kepada ibu/adik-beradik yang lebih memerlukan) dengan syarat semua waris bersetuju secara redha tanpa sebarang paksaan.",
      tips: "Gunakan kalkulator Faraid di sebelah untuk memahami kelayakan asal waris anda sebagai panduan asas sebelum berbincang untuk keputusan muafakat."
    }
  ];

  const toggleStep = (stepNum: number) => {
    setExpandedStep(expandedStep === stepNum ? null : stepNum);
  };

  const toggleCheck = (stepNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps(prev => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }));
  };

  // Faraid calculation using standard Islamic jurisprudence (Shariah)
  const resultsTable: FaraidResultRow[] = useMemo(() => {
    const hasChildren = sons > 0 || daughters > 0;
    let rows: FaraidResultRow[] = [];
    
    let shareWife = 0;
    let shareHusband = 0;
    let shareMother = 0;
    let shareFather = 0;
    let shareSonsTotal = 0;
    let shareDaughtersTotal = 0;
    let shareBaitulmal = 0;

    // Gharrawiyyah (Umariyyatayn) check:
    // Spouse is present, Mother is present, Father is present, and NO children (sons=0, daughters=0)
    const isGharrawiyyah = (spouse !== 'none') && mother && father && !hasChildren;

    if (isGharrawiyyah) {
      if (spouse === 'suami') {
        // Husband gets 1/2
        // Mother gets 1/3 of remainder = 1/3 * (1/2) = 1/6
        // Father gets remainder as Asabah = 1/2 - 1/6 = 2/6 = 1/3
        shareHusband = 1/2;
        shareMother = 1/6;
        shareFather = 1/3;
      } else {
        // Wife gets 1/4
        // Mother gets 1/3 of remainder = 1/3 * (3/4) = 1/4
        // Father gets remainder as Asabah = 3/4 - 1/4 = 2/4 = 1/2
        shareWife = 1/4;
        shareMother = 1/4;
        shareFather = 1/2;
      }
    } else {
      // Normal Calculation Flow
      // 1. Spouses
      if (spouse === 'suami') {
        shareHusband = hasChildren ? 1/4 : 1/2;
      } else if (spouse === 'isteri') {
        shareWife = hasChildren ? 1/8 : 1/4;
      }

      // 2. Mother
      if (mother) {
        shareMother = hasChildren ? 1/6 : 1/3;
      }

      // 3. Father (base Furud)
      if (father) {
        shareFather = 1/6; // Bapa gets 1/6 base if there are children. If no children, base is also 1/6, plus asabah residue.
      }

      // Total furud allocated
      const furudSum = shareHusband + shareWife + shareMother + (father ? 1/6 : 0);
      let remaining = 1 - furudSum;

      // Handle AUL (if furudSum > 1, downscale proportionally)
      if (furudSum > 1) {
        const aulScale = 1 / furudSum;
        if (spouse === 'suami') shareHusband *= aulScale;
        if (spouse === 'isteri') shareWife *= aulScale;
        if (mother) shareMother *= aulScale;
        if (father) shareFather = (1/6) * aulScale;
        remaining = 0;
      }

      // 4. Children Share (Asabah or Furud)
      if (hasChildren) {
        if (sons > 0) {
          // Sons exist: children take remainder as Asabah
          // Ratio: Son gets 2 shares, Daughter gets 1 share
          const totalUnits = (sons * 2) + daughters;
          const sharePerUnit = remaining / totalUnits;
          shareSonsTotal = (sons * 2) * sharePerUnit;
          shareDaughtersTotal = daughters * sharePerUnit;
          remaining = 0;
        } else {
          // Only daughters (no sons)
          // Daughters are Ashabul Furud: 1 daughter = 1/2, 2+ daughters = 2/3 shared
          let daughterFurud = daughters === 1 ? 1/2 : 2/3;
          if (remaining >= daughterFurud) {
            shareDaughtersTotal = daughterFurud;
            remaining -= daughterFurud;
          } else {
            shareDaughtersTotal = remaining;
            remaining = 0;
          }

          // Leftover residue goes to Father if present
          if (father) {
            shareFather += remaining;
            remaining = 0;
          } else {
            // No father, no sons. Leftover goes to Baitulmal or other relatives (simplified as Baitulmal / Radd)
            shareBaitulmal = remaining;
            remaining = 0;
          }
        }
      } else {
        // No children.
        if (father) {
          // Father takes all remaining as Asabah
          shareFather += remaining;
          remaining = 0;
        } else {
          // No children, no father. Remainder to Baitulmal / other heirs
          shareBaitulmal = remaining;
          remaining = 0;
        }
      }
    }

    // Helper to generate fractions
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
      
      // Calculate GCD for high-resolution fraction
      const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
      const denom = 3072;
      const numer = Math.round(val * denom);
      const divisor = gcd(numer, denom);
      return `${numer/divisor}/${denom/divisor}`;
    };

    if (shareHusband > 0) {
      rows.push({
        name: 'Suami',
        shareFraction: getFraction(shareHusband),
        percentage: shareHusband * 100,
        amount: shareHusband * estateValue,
        description: hasChildren ? 'Mendapat 1/4 bahagian kerana si mati mempunyai anak.' : 'Mendapat 1/2 bahagian kerana si mati tiada bermulanya anak.'
      });
    }

    if (shareWife > 0) {
      rows.push({
        name: 'Isteri',
        shareFraction: getFraction(shareWife),
        percentage: shareWife * 100,
        amount: shareWife * estateValue,
        description: hasChildren ? 'Mendapat 1/8 bahagian kerana si mati mempunyai anak. (Jika resolves isteri > 1, mereka membilang baki pembahagian sama rata dari bahagian ini)' : 'Mendapat 1/4 bahagian kerana si mati bebas dari mempunyai anak.'
      });
    }

    if (shareMother > 0) {
      rows.push({
        name: 'Ibu',
        shareFraction: getFraction(shareMother),
        percentage: shareMother * 100,
        amount: shareMother * estateValue,
        description: isGharrawiyyah ? 'Mendapat 1/3 daripada baki setelah ditolak bahagian pasangan (Kes Khas Gharrawiyyah).' : (hasChildren ? 'Mendapat 1/6 bahagian kerana si mati mempunyai waris keturunan.' : 'Mendapat 1/3 bahagian kerana si mati tiada keturunan atau bilangan adik-beradik.')
      });
    }

    if (shareFather > 0) {
      rows.push({
        name: 'Bapa',
        shareFraction: getFraction(shareFather),
        percentage: shareFather * 100,
        amount: shareFather * estateValue,
        description: isGharrawiyyah ? 'Mendapat baki selebihnya (Asabah) selepas bahagian pasangan dan ibu (Kes Khas Gharrawiyyah).' : (sons > 0 ? 'Mendapat 1/6 fard mutlak kerana si mati mempunyai anak lelaki.' : (daughters > 0 ? 'Mendapat 1/6 fard asas serta mengaut keseluruhan baki sisa (Asabah) kerana tiada anak lelaki.' : 'Mendapat seluruh baki agihan harta secara mutlak sebagai waris Asabah.'))
      });
    }

    if (shareSonsTotal > 0 && sons > 0) {
      const perSon = shareSonsTotal / sons;
      rows.push({
        name: `${sons} Anak Lelaki (Setiap Seorang)`,
        shareFraction: getFraction(perSon),
        percentage: perSon * 100,
        amount: perSon * estateValue,
        description: `Agihan baki sisa (Asabah bil Ghair) dengan hak nisbah 2 kali ganda bahagian berbanding anak perempuan. Jumlah keseluruhan bahagian anak lelaki: RM ${(shareSonsTotal * estateValue).toLocaleString(undefined, {maximumFractionDigits:0})} (${(shareSonsTotal * 100).toFixed(1)}%).`
      });
    }

    if (shareDaughtersTotal > 0 && daughters > 0) {
      const perDaughter = shareDaughtersTotal / daughters;
      const isAsabah = sons > 0;
      rows.push({
        name: `${daughters} Anak Perempuan (Setiap Seorang)`,
        shareFraction: getFraction(perDaughter),
        percentage: perDaughter * 100,
        amount: perDaughter * estateValue,
        description: isAsabah 
          ? 'Agihan baki sisa (Asabah bil Ghair) secara bersama dengan adik-beradik lelaki dengan kadar nisbah 1 ganti.'
          : (daughters === 1 
              ? 'Mendapat fard 1/2 bahagian mutlak daripada harta pusaka kerana merupakan anak perempuan tunggal tanpa anak lelaki.' 
              : `Mendapat fard 2/3 bahagian yang dikongsi sama rata di antara semua anak perempuan (${daughters} orang) tanpa anak lelaki.`)
      });
    }

    if (shareBaitulmal > 0) {
      rows.push({
        name: 'Waris lain / Baitulmal',
        shareFraction: getFraction(shareBaitulmal),
        percentage: shareBaitulmal * 100,
        amount: shareBaitulmal * estateValue,
        description: 'Baki harta yang akan diagihkan kepada waris asabah lelaki atau bapa. Jika tiada, akan dibahagikan kepada Baitulmal'
      });
    }

    return rows;
  }, [estateValue, spouse, mother, father, sons, daughters]);

  // Overall checklist state completion metrics
  const completedCount = stepsData.filter(s => completedSteps[s.num]).length;

  return (
    <div className="space-y-6 pt-4 border-t border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-600 text-white rounded-lg shadow-md shadow-rose-600/20">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-slate-900">Pusaka & Faraid</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Langkah Pengurusan Harta Pusaka & Penyelesaian Pembahagian Faraid Kelahiran Baru</p>
          </div>
        </div>

        {/* Local Tab Switcher */}
        <div className="flex p-0.5 bg-slate-100 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('langkah')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
              activeSubTab === 'langkah' ? "bg-white text-rose-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <BookOpen size={13} />
            Langkah Pengurusan
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('kalkulator')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
              activeSubTab === 'kalkulator' ? "bg-white text-rose-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Calculator size={13} />
            Kalkulator Faraid
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'langkah' && (
          <motion.div
            key="langkah-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Steps summary box with dynamic progress meter */}
            <div className="p-4 bg-rose-50 border border-rose-100/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">Status Persediaan Waris</span>
                <h4 className="text-sm font-extrabold text-slate-800">Senarai semak 5 tertib pusaka</h4>
                <p className="text-[11px] text-slate-500 font-medium">Lengkapkan semua pengesahan langkah bagi memastikan perancangan pusaka dalam keadaan bersedia.</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-black text-slate-800 font-mono">{completedCount} / 5 Langkah</div>
                  <div className="text-[9px] font-bold text-slate-400">Pengesahan Selesai</div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-slate-200/80 flex items-center justify-center font-mono text-sm font-black text-rose-500 relative">
                  {Math.round((completedCount/5)*100)}%
                  <svg className="absolute -top-1 -left-1 w-14 h-14" style={{ transform: 'rotate(-90deg)' }}>
                    <circle 
                      cx="28" 
                      cy="28" 
                      r="24" 
                      fill="transparent" 
                      stroke="#f43f5e" 
                      strokeWidth="4" 
                      strokeDasharray="150"
                      strokeDashoffset={150 - (150 * (completedCount/5))}
                      className="transition-all duration-300"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Interactive Steps List */}
            <div className="space-y-2.5">
              {stepsData.map((step) => {
                const isExpanded = expandedStep === step.num;
                const isCompleted = completedSteps[step.num];

                return (
                  <div
                    key={step.num}
                    className={cn(
                      "border rounded-xl transition-all overflow-hidden",
                      isCompleted 
                        ? "bg-slate-50/50 border-emerald-200" 
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {/* Header line click triggers accordion split toggle */}
                    <div
                      onClick={() => toggleStep(step.num)}
                      className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => toggleCheck(step.num, e)}
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0",
                            isCompleted 
                              ? "bg-emerald-600 text-white" 
                              : "border-2 border-slate-300 hover:border-rose-500 bg-white"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 size={14} className="stroke-[3]" /> : <div className="w-2 h-2 bg-transparent rounded-full" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className={cn(
                              "text-xs font-black truncate",
                              isCompleted ? "text-slate-500 line-through" : "text-slate-800"
                            )}>
                              {step.title}
                            </h4>
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.5 rounded-full font-bold",
                              isCompleted 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-rose-50 text-rose-800"
                            )}>
                              {step.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{step.subtitle}</p>
                        </div>
                      </div>

                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Expandable step guidelines */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3.5 pb-4 pt-1 border-t border-slate-100 space-y-3.5 text-slate-700 text-xs leading-normal">
                            <p className="font-extrabold text-slate-800 leading-snug">{step.shortDesc}</p>
                            
                            <div className="text-slate-600 font-medium whitespace-pre-line pl-2 border-l-2 border-slate-300">
                              {step.longDesc}
                            </div>

                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100/60 flex items-start gap-2">
                              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">Tip & Cadangan Pakar</span>
                                <p className="text-[10px] text-amber-700 font-bold leading-normal">{step.tips}</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'kalkulator' && (
          <motion.div
            key="kalkulator-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
          >
            {/* Form Inputs Panel (5 Cols) */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-1 border-b border-slate-100 flex items-center gap-1.5">
                <Coins size={14} className="text-rose-600" />
                MASUKKAN SENARAI WARIS
              </h4>

              {/* Estate value input with shortcut */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-600 block">Jumlah Harta Pusaka Kasar (RM)</label>
                  <button
                    type="button"
                    onClick={handleUseNetWorth}
                    className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase flex items-center gap-1 bg-rose-50/70 hover:bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100/30 transition-colors"
                  >
                    <Sparkles size={10} />
                    Guna Nilai Bersih (RM {Math.round(netWorth).toLocaleString()})
                  </button>
                </div>
                <FormattedNumberInput
                  placeholder="0.00"
                  value={estateValue || 0}
                  onChange={(val) => setEstateValue(val)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all"
                />
              </div>

              {/* Spouse Type Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 block">Pasangan Si Mati yang Masih Hidup</label>
                <select
                  value={spouse}
                  onChange={(e: any) => setSpouse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all"
                >
                  <option value="none">Tiada Pasangan</option>
                  <option value="suami">Suami (Si Mati adalah Isteri)</option>
                  <option value="isteri">Isteri (Si Mati adalah Suami)</option>
                </select>
              </div>

              {/* Parents Checkboxes group */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/40 cursor-pointer select-none transition-all">
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-700 block">Ada Ibu</span>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Masih hidup</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={mother}
                    onChange={(e) => setMother(e.target.checked)}
                    className="w-4.5 h-4.5 accent-rose-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/40 cursor-pointer select-none transition-all">
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-700 block">Ada Bapa</span>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Masih hidup</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={father}
                    onChange={(e) => setFather(e.target.checked)}
                    className="w-4.5 h-4.5 accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Children Numbers input */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block">Bil. Anak Lelaki (L)</label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setSons(prev => Math.max(0, prev - 1))}
                      className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-l-lg text-xs font-black text-slate-700 hover:bg-slate-200"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={sons}
                      readOnly
                      className="w-full text-center bg-slate-50/50 border-y border-slate-200 py-1 font-mono font-bold text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSons(prev => prev + 1)}
                      className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-r-lg text-xs font-black text-slate-700 hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block">Bil. Anak Perempuan (P)</label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setDaughters(prev => Math.max(0, prev - 1))}
                      className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-l-lg text-xs font-black text-slate-700 hover:bg-slate-200"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={daughters}
                      readOnly
                      className="w-full text-center bg-slate-50/50 border-y border-slate-200 py-1 font-mono font-bold text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setDaughters(prev => prev + 1)}
                      className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-r-lg text-xs font-black text-slate-700 hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset state helper */}
              <button
                type="button"
                onClick={() => {
                  setEstateValue(0);
                  setSpouse('none');
                  setMother(false);
                  setFather(false);
                  setSons(0);
                  setDaughters(0);
                }}
                className="w-full py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer"
              >
                Kosongkan Semua Input
              </button>
            </div>

            {/* Results Calculation Display (7 Cols) */}
            <div className="md:col-span-7 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-6 min-h-[400px] flex flex-col justify-between">
                
                {/* Math breakdown results */}
                <div className="space-y-4">
                  <div className="pb-3 border-b border-slate-200/60 flex justify-between items-end">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Status Pengiraan</span>
                      <h4 className="text-sm font-extrabold text-slate-800">Unjuran Keputusan Hak Faraid</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Jumlah Diagih</span>
                      <span className="text-sm font-mono font-black text-rose-600">RM {estateValue.toLocaleString()}</span>
                    </div>
                  </div>

                  {estateValue <= 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="p-3.5 bg-white rounded-full text-slate-300 border border-slate-200 shadow-sm">
                        <Calculator size={30} className="stroke-[1.5]" />
                      </div>
                      <div className="max-w-xs space-y-1">
                        <h5 className="text-[11px] font-black text-slate-700">Kalkulator Pengiraan Faraid Automatik</h5>
                        <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                          Sila masukkan nilai kasar harta pusaka di sebelah kiri (atau klik pintasan "Guna Nilai Bersih") untuk memvisualisasikan agihan matematik mengikut hukum syarak.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5 pt-1">
                      {resultsTable.map((row, idx) => {
                        return (
                          <div key={idx} className="bg-white p-3.5 border border-slate-200 rounded-xl flex items-start gap-3.5 shadow-sm hover:border-slate-300 transition-all">
                            <div className="w-10 h-10 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg flex flex-col items-center justify-center font-mono shrink-0 select-none">
                              <span className="text-[10px] font-bold leading-none">{row.shareFraction}</span>
                              <span className="text-[8px] opacity-60 leading-none mt-1 font-sans">{Math.round(row.percentage)}%</span>
                            </div>

                            <div className="min-w-0 flex-grow space-y-1">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-800 truncate">{row.name}</span>
                                <span className="text-xs font-mono font-extrabold text-slate-900 shrink-0">RM {Math.round(row.amount).toLocaleString()}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium leading-normal">{row.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Shariah legal framework note */}
                <div className="pt-4 border-t border-slate-200/60 mt-6 bg-[#fffbeb] p-3 rounded-xl border border-amber-100 flex items-start gap-2 text-[10px] text-amber-700 font-bold select-none leading-relaxed">
                  <ShieldAlert size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    PENAFIAN / DISCLAIMER: Pengiraan ini dibina mengikut kaedah perwarisan Shariah asas (Mazhab Syafi'i) bagi waris terdekat sahaja. Sebarang kewujudan waris pihak kedua (adik-beradik si mati, datuk, nenek dsb) jika bapa tiada, boleh mengubah keputusan asal. Rujuk peguam syarie berdaftar atau sekreteriat Mahkamah Syariah untuk penentuan rasmi.
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
