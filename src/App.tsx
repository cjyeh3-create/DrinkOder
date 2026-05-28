import React, { useState, useEffect, useMemo } from "react";
import { 
  Coffee, 
  Trash2, 
  Pencil, 
  Search, 
  Download, 
  Plus, 
  Minus, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  X,
  AlertCircle
} from "lucide-react";

// Types
interface DrinkItem {
  name: string;
  price: number;
  category: string;
  description?: string;
}

interface OrderItem {
  orderId: string;
  name: string;
  drink: string;
  sugar: string;
  ice: string;
  quantity: number;
  totalPrice: number;
  timestamp?: string;
}

interface ToastItem {
  id: string;
  text: string;
}

// Google Apps Script API URL (Loaded from environment variable for security)
const API_URL = import.meta.env.VITE_API_URL || "";

// Premium static Menu data as safe fallback database
const FALLBACK_MENU: DrinkItem[] = [
  { name: "靜岡深焙抹茶拿鐵", price: 65, category: "濃厚鮮乳", description: "手刷日本進口靜岡抹茶粉，苦甜比例極緻平衡，配小農鮮乳" },
  { name: "皇家英格蘭珍珠奶茶", price: 55, category: "經典厚奶", description: "每日熬煮手作黑糖蜜珍珠，咬感Q彈，融合香濃麥香紅茶奶底" },
  { name: "嚴選大嶺高山青茶", price: 35, category: "原萃純茶", description: "南投名間鄉高山茶區手摘，茶湯翠綠蜜黃，入口回甘帶清香" },
  { name: "秘製翡翠鮮檸綠", price: 50, category: "鮮果特調", description: "屏東九如鮮榨綠檸檬，完美融入頂級翡翠綠茶，清爽首選" },
  { name: "百香雙響椰果綠", price: 55, category: "鮮果特調", description: "濃醇新鮮百香果原汁佐椰果、明列子，絕佳雙重咬嚼滿足感" },
  { name: "英倫荔枝蘋果紅", price: 60, category: "鮮果特調", description: "玫瑰蜜香紅茶底，調入天然手熬荔枝與黃金蘋果果泥" },
  { name: "極濃燕麥重拿鐵", price: 75, category: "莊園拿鐵", description: "中深烘焙精品豆配義式濃縮，更換人氣Oats燕麥乳，素食首選" }
];

// Bento sweetness buttons definition
const SUGAR_LEVELS = [
  { label: "正常", value: "正常糖" },
  { label: "七分", value: "七分糖" },
  { label: "半糖", value: "半糖" },
  { label: "微糖", value: "微糖" },
  { label: "無糖", value: "無糖" }
];

// Bento ice levels buttons definition
const ICE_LEVELS = [
  { label: "正常", value: "正常冰" },
  { label: "少冰", value: "少冰" },
  { label: "微冰", value: "微冰" },
  { label: "去冰", value: "去冰" },
  { label: "溫熱", value: "溫熱" }
];

// Dynamic color system helper for user avatar balls
const getAvatarColor = (name: string) => {
  if (!name) return { bg: "bg-slate-100", text: "text-slate-600" };
  const code = name.charCodeAt(0) % 5;
  const presets = [
    { bg: "bg-emerald-100", text: "text-emerald-700" },
    { bg: "bg-blue-100", text: "text-blue-700" },
    { bg: "bg-amber-100", text: "text-amber-700" },
    { bg: "bg-rose-100", text: "text-rose-700" },
    { bg: "bg-violet-100", text: "text-violet-700" }
  ];
  return presets[code];
};

// Get short abbreviation string from Taiwanese or English names
const getInitials = (name: string) => {
  if (!name) return "🥤";
  const clean = name.trim();
  if (clean.length === 1) return clean;
  if (clean.length === 2) return clean;
  // If English or multiword
  if (/[a-zA-Z]/.test(clean)) {
    const parts = clean.split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.slice(-2);
};

// Toast Notification component
function BentoToast({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4">
      {toasts.map((item) => (
        <div 
          key={item.id} 
          className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-lg relative overflow-hidden transition-all duration-300 animate-slide-in"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
          <div className="text-base">🌿</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">點單通知</p>
            <p className="text-[12px] text-[#0F172A] mt-0.5 leading-relaxed font-semibold break-words">{item.text}</p>
          </div>
          <button 
            type="button"
            onClick={() => removeToast(item.id)} 
            className="text-xs text-[#94A3B8] hover:text-[#0F172A] ml-2 cursor-pointer transition font-bold"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [menu, setMenu] = useState<DrinkItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Form Inputs Setup
  const [customerName, setCustomerName] = useState("");
  const [selectedDrink, setSelectedDrink] = useState<DrinkItem | null>(null);
  const [sugar, setSugar] = useState("半糖");
  const [ice, setIce] = useState("少冰");
  const [quantity, setQuantity] = useState(1);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);

  // Filtering and search values
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [searchDrinkInput, setSearchDrinkInput] = useState("");
  const [searchOrderInput, setSearchOrderInput] = useState("");

  // Toast stack
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const triggerToast = (text: string) => {
    const id = Date.now().toString() + Math.random().toString().substring(2, 6);
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch dynamic metrics or records
  const fetchRemoteData = async (forceOfflineMode = false) => {
    setIsLoading(true);
    try {
      if (forceOfflineMode) {
        throw new Error("User requested offline mock mode.");
      }

      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("API Connection failed.");
      
      const result = await res.json();
      const activeMenu = result.menu && result.menu.length > 0 ? result.menu : FALLBACK_MENU;
      setMenu(activeMenu);
      setOrders(result.orders || []);
      setIsOffline(false);
      
      if (activeMenu.length > 0) {
        setSelectedDrink(activeMenu[0]);
      }
      triggerToast("雲端同步連線成功！已取得最新菜單與本日訂單。");
    } catch (err) {
      console.warn("API Error, fallback to offline local mode:", err);
      setIsOffline(true);
      setMenu(FALLBACK_MENU);
      setSelectedDrink(FALLBACK_MENU[0]);
      
      const localSaved = localStorage.getItem("bento_drink_orders");
      if (localSaved) {
        setOrders(JSON.parse(localSaved));
      } else {
        setOrders([]);
      }
      triggerToast("伺服器端連線不可用，已自動開啟離線安全儲存機制。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRemoteData();
  }, []);

  // Backup offline changes to localStorage automatically
  useEffect(() => {
    if (isOffline) {
      localStorage.setItem("bento_drink_orders", JSON.stringify(orders));
    }
  }, [orders, isOffline]);

  // Form selection parameters helpers
  const preCalculateTotal = useMemo(() => {
    if (!selectedDrink) return 0;
    return selectedDrink.price * quantity;
  }, [selectedDrink, quantity]);

  const drinkCategoriesList = useMemo(() => {
    const list = ["全部"];
    menu.forEach(d => {
      if (d.category && !list.includes(d.category)) {
        list.push(d.category);
      }
    });
    return list;
  }, [menu]);

  // Filter search lists
  const computedMenu = useMemo(() => {
    return menu.filter(item => {
      const matchCat = categoryFilter === "全部" || item.category === categoryFilter;
      const matchSearch = item.name.toLowerCase().includes(searchDrinkInput.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchDrinkInput.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [menu, categoryFilter, searchDrinkInput]);

  const computedOrders = useMemo(() => {
    return orders.filter(o => {
      const s = searchOrderInput.toLowerCase();
      return o.name.toLowerCase().includes(s) || 
             o.drink.toLowerCase().includes(s) || 
             o.sugar.includes(s) || 
             o.ice.includes(s);
    });
  }, [orders, searchOrderInput]);

  // Static aggregates calculated efficiently
  const computedMetrics = useMemo(() => {
    const cups = orders.reduce((acc, curr) => acc + curr.quantity, 0);
    const money = orders.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const uniquePeople = new Set(orders.map(o => o.name)).size;
    return { cups, money, uniquePeople };
  }, [orders]);

  // Set order selection inside the interactive Bento Form container
  const activateEditState = (order: OrderItem) => {
    setCustomerName(order.name);
    setSugar(order.sugar);
    setIce(order.ice);
    setQuantity(order.quantity);
    setCurrentEditId(order.orderId);
    
    const matchedItem = menu.find(m => m.name === order.drink) || {
      name: order.drink,
      price: order.totalPrice / order.quantity,
      category: "特調茶品",
      description: "手熬好滋味"
    };
    setSelectedDrink(matchedItem);
    
    document.getElementById("interactive-bento-form")?.scrollIntoView({ behavior: "smooth" });
    triggerToast(`已為您載入「${order.name}」的點單以進行編輯修改。`);
  };

  const resetOrderInputs = () => {
    setCustomerName("");
    setQuantity(1);
    setSugar("半糖");
    setIce("少冰");
    setCurrentEditId(null);
    if (menu.length > 0) {
      setSelectedDrink(menu[0]);
    }
  };

  // Submit Action
  const handleOrderSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!customerName.trim()) {
      triggerToast("請輸入點購人名字哦！");
      return;
    }
    if (!selectedDrink) {
      triggerToast("請選擇想喝的飲品！");
      return;
    }

    setIsSubmitting(true);
    const orderData = {
      name: customerName.trim(),
      drink: selectedDrink.name,
      sugar,
      ice,
      quantity: parseInt(quantity.toString(), 10),
      totalPrice: preCalculateTotal
    };

    try {
      if (isOffline) {
        // Simulate network speed latency
        await new Promise(r => setTimeout(r, 450));
        
        if (currentEditId) {
          setOrders(prev => prev.map(o => o.orderId === currentEditId ? { ...o, ...orderData } : o));
          triggerToast(`「${orderData.name}」的茶飲已修改更新完成(本機)！`);
        } else {
          const dummyId = "offline-uuid-" + Date.now().toString() + Math.random().toString().substring(2,5);
          const completeLocalItem = {
            orderId: dummyId,
            timestamp: new Date().toISOString(),
            ...orderData
          };
          setOrders(prev => [completeLocalItem, ...prev]);
          triggerToast(`感謝點單！${orderData.name} 的飲料已記錄完成。`);
        }
        resetOrderInputs();
      } else {
        // Real GAS integration submission request
        const payload = {
          action: currentEditId ? "update" : "create",
          data: currentEditId ? { orderId: currentEditId, ...orderData } : orderData
        };

        const response = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("傳送失敗啦！");
        const result = await response.json();
        if (result.status === "success") {
          triggerToast(currentEditId ? "今日訂單已成功修改！" : "美味點合成功！訂單已新增同步。");
          resetOrderInputs();
          
          // Fetch latest records quietly
          const fetchRes = await fetch(API_URL);
          if (fetchRes.ok) {
            const refreshed = await fetchRes.json();
            setOrders(refreshed.orders || []);
          }
        } else {
          throw new Error(result.message || "伺服器失敗");
        }
      }
    } catch (err) {
      console.error("Submit order broken:", err);
      triggerToast("連線發生異常：請點擊右上方『本地離線模擬』按鈕測試暢快免網點餐！");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel order removal request 
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("您確定要退點這杯美味的茶飲嗎？")) return;
    
    try {
      if (isOffline) {
        setOrders(prev => prev.filter(o => o.orderId !== orderId));
        triggerToast("該點購項目已成功从本機端移除。");
        if (currentEditId === orderId) resetOrderInputs();
      } else {
        const res = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            data: { orderId }
          })
        });
        const r = await res.json();
        if (r.status === "success") {
          triggerToast("該訂單退點成功，已自後端試算表中抹除！");
          if (currentEditId === orderId) resetOrderInputs();
          
          // Refresh list
          const fetchRes = await fetch(API_URL);
          if (fetchRes.ok) {
            const refreshed = await fetchRes.json();
            setOrders(refreshed.orders || []);
          }
        } else {
          throw new Error(r.message || "退點失敗");
        }
      }
    } catch (err: any) {
      triggerToast(`退點失敗: ${err.message}`);
    }
  };

  // Export utility for orders to simple CSV
  const triggerCsvExport = () => {
    if (orders.length === 0) {
      triggerToast("目前還沒有訂單明細可以匯出哦！");
      return;
    }
    let content = "\uFEFF訂單編號,訂購人,飲料名稱,甜度,冰塊,數量,總金額\n"; // UTF-8 BOM
    orders.forEach(o => {
      content += `"${o.orderId}","${o.name}","${o.drink}","${o.sugar}","${o.ice}",${o.quantity},${o.totalPrice}\n`;
    });
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `辦公室飲料彙整表-${new Date().toISOString().slice(0,10)}.csv`);
    link.click();
    triggerToast("今日訂單 CSV 主彙整表已生成並自動下載。");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <BentoToast toasts={toasts} removeToast={removeToast} />

      {/* Premium Header: Elegant Subtle Linear Gradient Backdrop */}
      <header className="h-[96px] bg-gradient-to-r from-[#10B981] 0% to-[#059669] 100% px-8 flex items-center justify-between text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col relative z-10">
          <h1 className="margin-0 text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2">
            辦公室飲料系統 <span className="font-light opacity-80 text-sm hidden md:inline">| Office Drink ordering</span>
          </h1>
          <p className="margin-0 text-[11px] md:text-xs opacity-90 mt-0.5 tracking-wide">
            今日訂單管理與即時統計報表 — 極簡美觀的 Bento Layout
          </p>
        </div>

        {/* Action and Metric Pills */}
        <div className="flex items-center gap-3 relative z-10 text-xs text-white">
          
          {/* Quiet Status Monitor */}
          <button 
            type="button"
            onClick={() => fetchRemoteData(isOffline)} 
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-black/15 hover:bg-black/25 rounded-full border border-white/15 cursor-pointer select-none transition"
          >
            <span className={`w-2 h-2 rounded-full ${isOffline ? "bg-amber-400" : "bg-emerald-300 animate-pulse"}`}></span>
            <span className="font-bold tracking-wider">{isOffline ? "本機離線模擬" : "今日實時雲端"}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchRemoteData(isOffline)}
            className="p-1.5 bg-white/20 hover:bg-white/35 rounded-full cursor-pointer select-none transition"
            title="手動同步更新"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <div className="stats-pill bg-white/20 px-3 py-1.5 rounded-full font-semibold">
            累計：{computedMetrics.cups} 份
          </div>
          <div className="stats-pill bg-white/20 px-3 py-1.5 rounded-full font-semibold">
            總額：NT$ {computedMetrics.money}
          </div>
        </div>

        {/* Decor Background Mesh */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full filter blur-3xl transform translate-x-20 -translate-y-20"></div>
      </header>

      {/* Quick connectivity controllers for mobile */}
      <div className="sm:hidden px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
        <span className="flex items-center gap-1">
          {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
          模式: {isOffline ? "本地離線模擬" : "實時 Google 試算表"}
        </span>
        <button 
          type="button"
          onClick={() => fetchRemoteData(!isOffline)}
          className="text-[11px] underline text-emerald-600 active:text-emerald-800 hover:text-emerald-700 font-bold"
        >
          切換模式
        </button>
      </div>

      {/* Core Responsive Bento Grid Container */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        
        {/* Form Bento Module Frame (LEFT SIDEBAR in standard screens) */}
        <div id="interactive-bento-form" className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bento-card">
            
            {/* Card Section Title */}
            <div className="card-header border-b border-[#F1F5F9] px-6 py-5 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-[#1E293B] flex items-center gap-1.5">
                <Coffee className="w-5 h-5 text-emerald-500" /> {currentEditId ? "重新配置特調" : "開始泡製點單"}
              </h2>
              <span className="text-[11px] text-[#10B981] font-bold bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-emerald-100 animate-pulse-soft">
                ● 菜單已就緒
              </span>
            </div>

            {/* Edit alert banner block */}
            {currentEditId && (
              <div className="mx-6 mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-800 flex items-center justify-between animate-fade-in">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> 正修改「{customerName}」的飲品選項
                </span>
                <button 
                  type="button"
                  onClick={resetOrderInputs}
                  className="text-[9px] bg-amber-200 border border-amber-300 hover:bg-amber-300 active:scale-95 text-amber-900 px-2 py-1 rounded-lg font-bold uppercase transition"
                >
                  取消修改
                </button>
              </div>
            )}

            {/* Form section with premium inputs */}
            <form onSubmit={handleOrderSubmit} className="form-section p-6 flex flex-col gap-5">
              
              {/* User Label Name */}
              <div className="input-group">
                <label className="text-xs font-bold text-[#64748B] mb-2 uppercase tracking-wider block">
                  訂購人姓名 (例如：江江、王經理) *
                </label>
                <input 
                  type="text" 
                  placeholder="請輸入一個您方便領取的稱呼..." 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="custom-input w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-sm focus:border-[#10B981] focus:ring-4 focus:ring-emerald-50 outline-none transition"
                  required
                />
              </div>

              {/* Drink select visual menu filter library lists */}
              <div className="input-group">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    挑選茶飲 (單價) *
                  </label>
                  
                  {/* Instant Search Bar */}
                  <div className="relative w-36">
                    <input 
                      type="text"
                      placeholder="速選過濾..."
                      value={searchDrinkInput}
                      onChange={(e) => setSearchDrinkInput(e.target.value)}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-slate-50 border border-[#E2E8F0] focus:border-[#10B981] rounded-lg outline-none font-medium text-slate-800"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                  </div>
                </div>

                {/* Filter badges */}
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-[82px] overflow-y-auto">
                  {drinkCategoriesList.map((cat, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                        categoryFilter === cat 
                          ? "bg-[#10B981] text-white" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Beautiful scroll selection area */}
                <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {computedMenu.map((item, idx) => {
                    const isActive = selectedDrink && selectedDrink.name === item.name;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDrink(item)}
                        className={`p-3 rounded-xl border transition cursor-pointer text-left flex flex-col justify-between ${
                          isActive 
                            ? "bg-[#ECFDF5] border-[#10B981] ring-2 ring-emerald-50 shadow-sm" 
                            : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0F172A]">{item.name}</span>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            ${item.price} 元
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 mt-1 line-clamp-1 truncate font-light">
                          {item.description || "香純優質好茶，豐富回甘口感。"}
                        </p>
                      </div>
                    );
                  })}

                  {computedMenu.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                       找不到匹配茶款 🥺
                    </div>
                  )}
                </div>
              </div>

              {/* Sugar Bento Selection Grid block */}
              <div className="input-group">
                <label className="text-xs font-bold text-[#64748B] mb-2 uppercase tracking-wider block">
                  調整糖分甜度
                </label>
                <div className="btn-grid grid grid-cols-5 gap-1.5">
                  {SUGAR_LEVELS.map((opt, index) => {
                    const isSel = sugar === opt.value;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSugar(opt.value)}
                        className={`btn-option py-2 text-xs rounded-lg border cursor-pointer transition text-center font-bold ${
                          isSel
                            ? "bg-[#ECFDF5] border-[#10B981] text-[#059669] shadow-sm"
                            : "bg-white border-[#E2E8F0] hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ice Level Bento Selection Grid block */}
              <div className="input-group">
                <label className="text-xs font-bold text-[#64748B] mb-2 uppercase tracking-wider block">
                  調整冰度含量
                </label>
                <div className="btn-grid grid grid-cols-5 gap-1.5">
                  {ICE_LEVELS.map((opt, index) => {
                    const isSel = ice === opt.value;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setIce(opt.value)}
                        className={`btn-option py-2 text-xs rounded-lg border cursor-pointer transition text-center font-bold ${
                          isSel
                            ? "bg-[#ECFDF5] border-[#10B981] text-[#059669] shadow-sm"
                            : "bg-white border-[#E2E8F0] hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Numeric Quantity Slider Stepper bar with Live Sum */}
              <div className="flex items-center justify-between mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-[#E2E8F0]">
                <div className="input-group flex-1">
                  <label className="text-xs font-bold text-[#64748B] block">杯數數量</label>
                  <div className="quantity-stepper flex items-center gap-2.5 bg-[#F1F5F9] p-1.5 rounded-xl w-fit mt-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="step-btn w-7 h-7 bg-white rounded-lg border border-slate-200 font-extrabold flex items-center justify-center cursor-pointer text-slate-600 active:scale-90 select-none"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-extrabold text-[#0F172A] w-6 text-center text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="step-btn w-7 h-7 bg-white rounded-lg border border-slate-200 font-extrabold flex items-center justify-center cursor-pointer text-slate-600 active:scale-90 select-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-right min-w-[96px]">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase block">
                    預估總結算
                  </span>
                  <div className="text-2xl font-extrabold text-[#0F172A] mt-1 flex items-baseline justify-end gap-0.5">
                    <span className="text-xs font-normal text-slate-400">NT$</span>
                    {preCalculateTotal}
                  </div>
                  {selectedDrink && (
                    <span className="text-[9px] text-[#94A3B8] font-bold block mt-0.5">
                      (${selectedDrink.price} × {quantity})
                    </span>
                  )}
                </div>
              </div>

              {/* Main Submit Bento action button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-btn w-full mt-2 bg-[#10B981] hover:bg-[#059669] text-white py-4 px-6 rounded-2xl font-bold text-center tracking-wider text-sm cursor-pointer shadow-[0_10px_15px_-3px_rgba(16,185,129,0.35)] hover:shadow-emerald-900/10 active:scale-[0.99] transition"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>同步處理中...</span>
                  </div>
                ) : (
                  <span>{currentEditId ? "確認完成更新點單" : "送出今日點單紀錄"}</span>
                )}
              </button>

            </form>
          </div>
        </div>


        {/* List Detail Bento Module Frame (RIGHT PANEL in standard screens) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          <div className="bento-card flex-1 min-h-[500px]">
            
            {/* Card Section Header with Search controls */}
            <div className="card-header border-b border-[#F1F5F9] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-bold text-[#1E293B]">今日點單明細</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">實時同仁訂購統計與快取保障</p>
              </div>

              {/* Filter and Export tools aligned horizontally */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
                {/* Quiet search filter bar */}
                <div className="relative flex-1 sm:w-48">
                  <input 
                    type="text" 
                    placeholder="尋人、品項、甜度..."
                    value={searchOrderInput}
                    onChange={(e) => setSearchOrderInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 outline-none rounded-xl focus:bg-white text-[#0F172A] font-semibold"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                </div>

                {/* Export CSV button */}
                <button 
                  type="button"
                  onClick={triggerCsvExport}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-[#CBD5E1] text-[#1E293B] hover:bg-slate-100 rounded-xl transition cursor-pointer select-none active:scale-95 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>匯出 CSV</span>
                </button>
              </div>

            </div>

            {/* List View Container with graceful loading skeletons */}
            {isLoading ? (
              <div className="flex-grow flex flex-col items-center justify-center p-20 gap-3">
                <div className="w-8 h-8 border-3 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400 tracking-wider">連線載入今日點單明細中...</span>
              </div>
            ) : computedOrders.length > 0 ? (
              
              /* Dynamic List row renders */
              <div className="flex-grow overflow-y-auto max-h-[640px] divide-y divide-[#F1F5F9]">
                {computedOrders.map((ord, idx) => {
                  const avatarClass = getAvatarColor(ord.name);
                  const isThisEditing = currentEditId === ord.orderId;
                  return (
                    <div 
                      key={ord.orderId || idx} 
                      className={`order-item px-6 py-4 flex items-center justify-between gap-4 transition-all duration-150 ${
                        isThisEditing ? "bg-amber-50/40" : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {/* Left Side Group Info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        
                        {/* Avatar item initial color system */}
                        <div className={`avatar w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${avatarClass.bg} ${avatarClass.text}`}>
                          {getInitials(ord.name)}
                        </div>

                        <div className="min-w-0 pr-1.5 font-sans">
                          <div className="flex items-baseline gap-2">
                            <span className="font-extrabold text-sm text-[#0F172A] truncate">
                              {ord.name || "熱心茶友"}
                            </span>
                            <span className="text-[9px] font-semibold text-[#94A3B8] font-mono">
                              {ord.timestamp 
                                ? new Date(ord.timestamp).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })
                                : "剛剛"
                              }
                            </span>
                          </div>
                          <p className="text-[12px] text-[#475569] font-medium mt-1">
                            {ord.drink}
                            <span className="ml-1.5 text-[10px] text-[#64748B] bg-slate-100 px-1.5 py-0.5 rounded">
                              {ord.sugar} / {ord.ice}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right Side metadata with buttons list */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase">數量</span>
                          <span className="text-sm font-extrabold text-[#0F172A]">{ord.quantity} 杯</span>
                        </div>

                        <div className="text-right min-w-[54px]">
                          <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase">小計</span>
                          <span className="text-sm font-extrabold text-[#10B981]">${ord.totalPrice}</span>
                        </div>

                        {/* Quiet controls trigger */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => activateEditState(ord)}
                            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-emerald-50 text-[#94A3B8] hover:text-[#10B981] transition cursor-pointer flex items-center justify-center"
                            title="修改我的特調配置"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord.orderId)}
                            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-[#94A3B8] hover:text-rose-650 transition cursor-pointer flex items-center justify-center"
                            title="退點本茶品"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            ) : (
              
              /* Empty prompt block matching Bento style instructions exactly */
              <div className="empty-state flex-grow flex flex-col items-center justify-center text-[#94A3B8] gap-4 p-8">
                <div className="empty-icon text-5xl opacity-40">🥤</div>
                <div className="text-center">
                  <h4 className="font-bold text-sm text-[#1E293B]">目前在今日工作表無人點餐</h4>
                  <p className="text-xs text-[#94A3B8] mt-1.5 max-w-[210px] mx-auto leading-relaxed font-sans">
                    今天還沒有任何人點餐唷！手刀在左側填寫姓名並選擇一杯最愛的茶飲、甜度、冰塊，成為第一個開單先鋒吧！
                  </p>
                </div>
              </div>

            )}

            {/* Responsive last synchronization block */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#F1F5F9] text-center text-[10px] text-[#64748B]">
              備註：本系統提供自動防斷線快取。最後載入更新：{new Date().toLocaleDateString('zh-TW')} {new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </div>

          </div>

        </div>

      </main>

      {/* Bottom corporate credits footer */}
      <footer className="text-center text-[11px] text-[#94A3B8] font-medium leading-relaxed mt-10 pb-8 uppercase tracking-widest font-sans">
        🥤 辦公室下午茶集點系統 — Bento Minimalist Concept Design
      </footer>

    </div>
  );
}
