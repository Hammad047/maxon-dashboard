import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  Cloud,
  Rocket,
  RefreshCw,
  Folder,
  File,
  ChevronRight,
  Home,
  ExternalLink,
  Loader2,
  FileImage,
  Shield,
  ChevronDown,
  Check,
  Upload,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  filesApi,
  analyticsApi,
  type FileInfo,
  type FolderInfo,
} from "@/lib/api";

interface GlassCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  accentColor: string;
  children?: React.ReactNode;
}

const colors = [
  "#38bdf8",
  "#a855f7",
  "#f97316",
  "#22c55e",
  "#eab308",
  "#10b981",
];
const getColor = (i: number) => colors[i % colors.length];

const GlassCard = ({
  title,
  value,
  icon,
  gradient,
  accentColor,
  children,
}: GlassCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 border border-slate-200 bg-white shadow-sm transition-all duration-300 cursor-pointer group ${isHovered ? "shadow-md ring-2 ring-slate-200" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          <div className={`p-3 rounded-xl border border-slate-200 ${accentColor} text-white`}
          >
            {icon}
          </div>
        </div>
        <div className="text-4xl font-bold text-slate-900 mb-2">{value}</div>
        {children}
      </div>
    </div>
  );
};

interface FloatingMetricProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

const FloatingMetric = ({ label, value, unit, color }: FloatingMetricProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = 0;
    const increment = Math.max(1, value / 40);
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, 25);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className="text-center p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
      <p className="text-slate-600 text-xs font-medium mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-slate-500 text-xs mt-1">{unit}</p>
    </div>
  );
};

const VIEWABLE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".mp4",
  ".webm",
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

function isViewableInBrowser(filename: string): boolean {
  const lower = filename.toLowerCase();
  return VIEWABLE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/** Parse circuit folder name e.g. 202508-028-S-KHI-R-UW-00152 → { yearMonth, batch, letter, project, type, serial } */
function parseCircuitName(name: string): { yearMonth: string; batch: string; letter: string; project: string; type: string; serial: string } {
  const parts = name.split("-");
  const match = name.match(/^(\d{6})-(\d+)-([A-Z])-([A-Z]+)-(R-[A-Z0-9]+)-(\d+)$/i);
  if (match) {
    const [, yymm, batch, letter, project, type, serial] = match;
    return { yearMonth: yymm ?? "", batch: batch ?? "", letter: letter ?? "", project: project ?? "", type: (type ?? "").toUpperCase(), serial: serial ?? "" };
  }
  const typePart = parts.find(p => /^R-[A-Z0-9]+$/i.test(p));
  return {
    yearMonth: parts[0]?.length === 6 ? parts[0] : "",
    batch: parts[1] ?? "",
    letter: parts[2] ?? "",
    project: parts[3] ?? "",
    type: typePart ? typePart.toUpperCase() : "Other",
    serial: parts[5] ?? "",
  };
}

function formatYearMonth(yymm: string): string {
  if (yymm.length !== 6) return yymm;
  const y = yymm.slice(0, 4);
  const m = yymm.slice(4, 6);
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
  return isNaN(date.getTime()) ? yymm : date.toLocaleString("default", { month: "short", year: "numeric" });
}

export default function DashboardV3() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [prefix, setPrefix] = useState("");
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [activityTrendData, setActivityTrendData] = useState<
    Record<string, unknown>[] | null
  >(null);
  const [activityTrendColumns, setActivityTrendColumns] = useState<string[]>(
    []
  );
  const [activityTrendLoading, setActivityTrendLoading] = useState(false);
  const [activityTrendError, setActivityTrendError] = useState<string | null>(
    null
  );
  const [selectedChartColumns, setSelectedChartColumns] = useState<string[]>(
    []
  );
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);

  // Filters for Activity Trend
  const [filterCity, setFilterCity] = useState<string>("All");
  const [filterMonth, setFilterMonth] = useState<string>("All");

  // Circuit: raw names from API; groupBy drives chart aggregation
  const [circuitRawNames, setCircuitRawNames] = useState<string[]>([]);
  const [circuitGroupBy, setCircuitGroupBy] = useState<"type" | "yearMonth" | "project" | "batch">("type");
  const [circuitPathUser, setCircuitPathUser] = useState<string>("current");

  // File Browser pagination
  const FILE_BROWSER_PAGE_SIZE = 20;
  const [fileBrowserPage, setFileBrowserPage] = useState(1);

  // Upload & Folder Creation
  const [uploading, setUploading] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadPath] = useState("dawarc/Circuler/"); // Upload/Create folder only for Circuler (not Circuit Files Distribution)

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await filesApi.listTree(prefix);
      const data = res.data;
      setFolders(data.folders ?? []);
      setFiles(data.files ?? []);
    } catch (err: unknown) {
      const ax = err as {
        response?: {
          status?: number;
          data?: { detail?: string };
          statusText?: string;
        };
      };
      const status = ax.response?.status;
      const detail = ax.response?.data?.detail;
      const statusText = ax.response?.statusText;
      let msg = "Failed to load files";
      if (typeof detail === "string") msg = detail;
      else if (status === 405)
        msg =
          "Invalid request (Method Not Allowed). Ensure backend allows GET on /api/v1/files/tree.";
      else if (status && statusText) msg = `${status} ${statusText}`;
      setError(msg);
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    setFileBrowserPage(1);
  }, [prefix]);

  const loadPrmData = useCallback(async () => {
    setActivityTrendLoading(true);
    setActivityTrendError(null);
    try {
      const { data } = await analyticsApi.getPrmData();
      const columns = data.columns ?? [];
      setActivityTrendData(data.data ?? []);
      setActivityTrendColumns(columns);
      setSelectedChartColumns(prev =>
        prev.length ? prev : columns.slice(0, 2)
      );
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setActivityTrendError(
        ax.response?.data?.detail ??
        "Failed to load PRM activity data from S3"
      );
      setActivityTrendData(null);
      setActivityTrendColumns([]);
    } finally {
      setActivityTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrmData();
  }, [loadPrmData]);



  const CIRCUIT_PATH_OPTIONS = ["ampere", "hertz", "joule", "kelvin", "pascal", "tesla"];

  const fetchCircuitFiles = useCallback(async () => {
    if (!user?.email) return;

    let username: string;
    if (user.role === "admin" && circuitPathUser !== "current") {
      username = circuitPathUser;
    } else {
      username = "ampere";
      if (user.full_name) {
        const lower = user.full_name.toLowerCase();
        if (lower.includes("ampere")) username = "ampere";
        else if (lower.includes("hertz") || lower.includes("herts")) username = "hertz";
        else if (lower.includes("joule")) username = "joule";
        else if (lower.includes("kelvin")) username = "kelvin";
        else if (lower.includes("pascal")) username = "pascal";
        else if (lower.includes("tesla")) username = "tesla";
        else username = lower.split(" ")[0];
      }
    }

    const targetPath = `dawarc/circuit/${username}`;
    try {
      const { data } = await filesApi.listTree(targetPath, 10000);
      const listFiles = data.files || [];
      const listFolders = data.folders || [];

      const itemsToShow = listFiles.length
        ? listFiles.map(f => f.filename)
        : listFolders.map(f => f.name || f.key?.split("/").filter(Boolean).pop() || "Other");
      setCircuitRawNames(itemsToShow);
    } catch (e) {
      console.error("Failed to load circuit files", e);
      setCircuitRawNames([]);
    }
  }, [user, circuitPathUser]);

  useEffect(() => {
    fetchCircuitFiles();
  }, [fetchCircuitFiles]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const folderPath = `dawarc/Circuler/${newFolderName.trim()}`;
      await filesApi.createFolder(folderPath);
      alert(`Folder created: ${folderPath}`);
      setCreateFolderOpen(false);
      setNewFolderName("");
    } catch (e) {
      console.error(e);
      alert("Failed to create folder");
    }
  };

  const handleUploadCircular = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      await filesApi.upload(file, uploadPath);
      alert(`File uploaded successfully to ${uploadPath}`);
    } catch (err) {
      alert("Failed to upload file");
      console.error(err);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleViewFile = async (file: FileInfo) => {
    try {
      const { data } = await filesApi.downloadUrl(file.key);
      if (isViewableInBrowser(file.filename)) {
        setViewingFile(file);
        setViewUrl(data.presigned_url);
      } else {
        window.open(data.presigned_url, "_blank");
      }
    } catch {
      setError("Failed to get file URL");
    }
  };

  const toggleColumn = (column: string) => {
    setSelectedChartColumns(prev =>
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

  const breadcrumbs = prefix
    ? ["", ...prefix.replace(/\/$/, "").split("/").filter(Boolean)]
    : [""];

  const fileBrowserAllItems = useMemo(
    () => [
      ...folders.map(f => ({ type: "folder" as const, key: f.key, name: f.name })),
      ...files.map(f => ({ type: "file" as const, ...f })),
    ],
    [folders, files]
  );
  const fileBrowserTotalPages = Math.max(1, Math.ceil(fileBrowserAllItems.length / FILE_BROWSER_PAGE_SIZE));
  const fileBrowserPaginatedItems = fileBrowserAllItems.slice(
    (fileBrowserPage - 1) * FILE_BROWSER_PAGE_SIZE,
    fileBrowserPage * FILE_BROWSER_PAGE_SIZE
  );

  const totalFiles = files.length + folders.length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const fileTypes = new Set(
    files.map(f => getFileExtension(f.filename) || "other")
  ).size;

  const rawChartData = activityTrendData ?? [];

  // Filter logic
  const filteredChartData = useMemo(() => {
    return rawChartData.filter(item => {
      const itemCity = String((item as any).City || "");
      const itemMonth = String((item as any).Month || "");

      if (filterCity !== "All" && itemCity !== filterCity) return false;
      if (filterMonth !== "All" && itemMonth !== filterMonth) return false;
      return true;
    });
  }, [rawChartData, filterCity, filterMonth]);

  const chartData = filteredChartData;

  const chartColumns = activityTrendColumns?.length ? activityTrendColumns : [];
  const labelKey = chartColumns[0] ?? ""; // x-axis

  // Extract unique Cities and Months for filters
  const availableCities = useMemo(() => Array.from(new Set(rawChartData.map(d => String((d as any).City || "")))).filter(Boolean).sort(), [rawChartData]);

  // Parse Month: "2025-05-01T00:00:00" -> "May 2025" or just use raw if not date
  const formatMonth = (m: string) => {
    if (!m) return "";
    const d = new Date(m);
    if (isNaN(d.getTime())) return m;
    return d.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    rawChartData.forEach(d => {
      const m = String((d as any).Month || "");
      if (m) months.add(m);
    });
    return Array.from(months).sort();
  }, [rawChartData]);

  // selectedChartColumns is now an array
  const selectedCols = selectedChartColumns?.length
    ? selectedChartColumns
    : chartColumns.slice(1); // default to all except labelKey

  // bar/line data for multiple columns
  const barLineData =
    chartData.length && labelKey && selectedCols.length
      ? chartData.map(r => {
        const row: Record<string, unknown> = {
          name: String((r as Record<string, unknown>)[labelKey] ?? ""),
        };

        selectedCols.forEach(col => {
          const raw = (r as Record<string, unknown>)[col];
          const num = typeof raw === "number" ? raw : Number(raw);
          row[col] = Number.isFinite(num) ? num : 0;
        });

        return row;
      })
      : [];

  // Pie: always available; support any number of categories (expand color palette)
  const PIE_COLORS = [
    "#38bdf8", "#a855f7", "#f97316", "#22c55e", "#eab308", "#ec4899", "#06b6d4", "#84cc16",
    "#f43f5e", "#8b5cf6", "#14b8a6", "#e11d48", "#0ea5e9", "#a3e635", "#d946ef",
  ];
  const pieData = useMemo(() => {
    if (!chartData.length || selectedCols.length === 0) return [];
    const col = selectedCols[0]; // Use first column for pie (when multiple selected, pie still shows)
    const agg = new Map<string, number>();
    chartData.forEach(r => {
      const key = String((r as Record<string, unknown>)[col] ?? "");
      const v = (r as Record<string, unknown>)[col];
      const n = typeof v === "number" ? v : Number(v);
      agg.set(key, (agg.get(key) ?? 0) + (Number.isFinite(n) ? n : 1));
    });
    return Array.from(agg.entries()).map(([name, value], i) => ({
      name,
      value,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [chartData, selectedCols]);

  const pieTotal = pieData.reduce((a, b) => a + b.value, 0);
  const TOOLTIP_STYLE = {
    backgroundColor: "#fff",
    color: "#111",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12px",
  };



  const fileTypeData = useMemo(() => {
    if (!circuitRawNames.length) return [{ name: "No Data", value: 0 }];
    const agg = new Map<string, number>();
    circuitRawNames.forEach(name => {
      const p = parseCircuitName(name);
      let key: string;
      if (circuitGroupBy === "type") key = p.type || "Other";
      else if (circuitGroupBy === "yearMonth") key = p.yearMonth ? formatYearMonth(p.yearMonth) : "Other";
      else if (circuitGroupBy === "project") key = p.project || "Other";
      else key = p.batch || "Other";
      agg.set(key, (agg.get(key) ?? 0) + 1);
    });
    const arr = Array.from(agg.entries()).map(([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value);
    return arr;
  }, [circuitRawNames, circuitGroupBy]);

  return (
    <div className="min-h-screen bg-white text-slate-900 relative">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img src="/images/prm-logo.png" alt="PRM [Public Relations by Maksons]" className="h-14 w-auto max-w-[220px] object-contain shrink-0" style={{ imageRendering: "auto" }} />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-xs text-slate-500">Advanced Analytics</p>
              {user && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Logged in as: <span className="font-semibold text-slate-900">{user.full_name || user.email}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100" onClick={e => { e.preventDefault(); e.stopPropagation(); navigate("/admin"); }}>
              <Shield className="w-4 h-4" />
              Admin Panel
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100" onClick={loadFiles} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard
            title="Total Files"
            value={totalFiles.toLocaleString()}
            icon={<Zap className="w-5 h-5" />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            accentColor="bg-purple-500/50"
          >
            <p className="text-slate-600 text-xs">From AWS S3</p>
          </GlassCard>

          <GlassCard
            title="Storage Used"
            value={formatBytes(totalSize)}
            icon={<Cloud className="w-5 h-5" />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            accentColor="bg-pink-500/50"
          >
            <p className="text-slate-600 text-xs">Current folder</p>
          </GlassCard>

          <GlassCard
            title="Circuit Files Distribution"
            value={fileTypes}
            icon={<Rocket className="w-5 h-5" />}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            accentColor="bg-cyan-500/50"
          >
            <p className="text-slate-600 text-xs">Unique extensions</p>
          </GlassCard>
        </div>


        {/* File Browser */}
        <div className="relative overflow-hidden rounded-2xl p-6 mb-8 bg-white border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">File Browser</h2>
              <p className="text-slate-600 text-sm mt-1">
                Browse files from your AWS S3 bucket. Folders match the structure in your bucket.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">dawarc/Circuler/:</span>
              <input type="file" id="upload-circuler" className="hidden" onChange={handleUploadCircular} disabled={uploading} />
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-700" onClick={() => setCreateFolderOpen(true)}>
                <Folder className="w-4 h-4 mr-1" />
                Create folder
              </Button>
              <Button variant="default" size="sm" className="bg-slate-800 hover:bg-slate-900 text-white" onClick={() => document.getElementById("upload-circuler")?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload file
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 mb-4 text-sm">
            {breadcrumbs.map((part, i) => {
              const path = breadcrumbs.slice(0, i + 1).filter(Boolean).join("/");
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1">
                  {i === 0 ? (
                    <button onClick={() => setPrefix("")} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                      <Home className="w-4 h-4" />
                      Root
                    </button>
                  ) : (
                    <button
                      onClick={() => setPrefix(path + "/")}
                      disabled={isLast}
                      className={`px-2 py-1 rounded transition-colors ${isLast ? "text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                    >
                      {part}
                    </button>
                  )}
                  {i < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                </span>
              );
            })}
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              Loading files...
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {fileBrowserPaginatedItems.map(item =>
                  item.type === "folder" ? (
                    <button
                      key={item.key}
                      onClick={() => setPrefix(item.key)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 text-left transition-colors group border border-transparent"
                    >
                      <Folder className="w-5 h-5 text-amber-600" />
                      <span className="text-slate-900 font-medium">{item.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-slate-600" />
                    </button>
                  ) : (
                    <button
                      key={item.key}
                      onClick={() => handleViewFile(item)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 text-left transition-colors group border border-transparent"
                    >
                      {isViewableInBrowser(item.filename) ? (
                        <FileImage className="w-5 h-5 text-cyan-600" />
                      ) : (
                        <File className="w-5 h-5 text-slate-500" />
                      )}
                      <span className="text-slate-900 flex-1 truncate">{item.filename}</span>
                      <span className="text-slate-500 text-sm shrink-0">{formatBytes(item.size)}</span>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                    </button>
                  )
                )}
                {!loading && folders.length === 0 && files.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No files or folders in this location</div>
                )}
              </div>
              {fileBrowserAllItems.length > FILE_BROWSER_PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <span className="text-sm text-slate-600">
                    Page {fileBrowserPage} of {fileBrowserTotalPages} ({fileBrowserAllItems.length} items)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => setFileBrowserPage(p => Math.max(1, p - 1))} disabled={fileBrowserPage <= 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => setFileBrowserPage(p => Math.min(fileBrowserTotalPages, p + 1))} disabled={fileBrowserPage >= fileBrowserTotalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="space-y-6 mb-8">
          {/* Activity Trend – controls stay on top; chart area contained so legend/data don't cover filters */}
          <div className="relative rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
            <div className="flex flex-shrink-0 flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 z-20 relative">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Activity Trend</h2>
                <p className="text-xs text-slate-600">PRM: prm/vault/mi-data-bank/MI Data Bank - PRM.xlsx</p>
                <div className="flex gap-2 text-slate-700 mt-2">
                  <select className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                    <option value="All">All Cities</option>
                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                    <option value="All">All Months</option>
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m) || m}</option>)}
                  </select>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-600 hover:bg-slate-100 ml-2" onClick={() => loadPrmData()} title="Refresh Data">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Popover open={columnSelectorOpen} onOpenChange={setColumnSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-between border-slate-200 bg-white text-slate-900 hover:bg-slate-50" disabled={!chartColumns.length}>
                      <span className="truncate">
                        {selectedChartColumns.length ? `${selectedChartColumns.length} column${selectedChartColumns.length > 1 ? "s" : ""} selected` : "Select columns"}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 bg-white border-slate-200">
                    <div className="max-h-[300px] overflow-y-auto">
                      {chartColumns.map(column => (
                        <button key={column} onClick={() => toggleColumn(column)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 transition-colors">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedChartColumns.includes(column) ? "bg-purple-500 border-purple-500" : "border-slate-300"}`}>
                            {selectedChartColumns.includes(column) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="truncate">{column}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  <button type="button" onClick={() => setChartType("bar")} className={`px-3 py-1.5 text-sm ${chartType === "bar" ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}>Bar</button>
                  <button type="button" onClick={() => setChartType("line")} className={`px-3 py-1.5 text-sm ${chartType === "line" ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}>Line</button>
                  <button type="button" onClick={() => setChartType("pie")} className={`px-3 py-1.5 text-sm ${chartType === "pie" ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}>Pie</button>
                </div>
              </div>
            </div>
            {activityTrendError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
                {activityTrendError}
              </div>
            )}

            <div className="relative z-0 min-h-[320px] overflow-hidden rounded-lg border border-slate-100 bg-slate-50/50">
            <ResponsiveContainer width="100%" height={320}>
              {chartType === "pie" && pieData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "rgba(255,255,255,0.5)" }}
                  >
                    {pieData.map(entry => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, name: string) => [
                      v,
                      pieTotal
                        ? `${name} • ${((v / pieTotal) * 100).toFixed(1)}%`
                        : name,
                    ]}
                  />
                  {pieData.length <= 12 && <Legend />}
                </PieChart>
              ) : barLineData.length > 0 ? (
                chartType === "line" ? (
                  <LineChart data={barLineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis dataKey="name" stroke="#475569" tick={{ fill: "#475569" }} />
                    <YAxis stroke="#475569" tick={{ fill: "#475569" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    {selectedChartColumns.length <= 12 && <Legend />}
                    {selectedChartColumns.map((col, i) => (
                      <Line
                        key={col}
                        type="monotone"
                        dataKey={col} // each line is now one column
                        stroke={getColor(i)}
                        strokeWidth={2}
                        dot={{ fill: getColor(i) }}
                        name={col}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={barLineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis dataKey="name" stroke="#475569" tick={{ fill: "#475569" }} />
                    <YAxis stroke="#475569" tick={{ fill: "#475569" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    {selectedChartColumns.length <= 12 && <Legend />}
                    {selectedChartColumns.map((col, i) => (
                      <Bar
                        key={col}
                        dataKey={col} // each bar series is one column
                        fill={getColor(i)}
                        radius={[4, 4, 0, 0]}
                        name={col}
                      />
                    ))}
                  </BarChart>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  No data to display
                </div>
              )}
            </ResponsiveContainer>
            </div>
          </div>

        {/* Circuit Files Distribution – parsed from names like 202508-028-S-KHI-R-UW-00152 */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white/80 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Circuit Files Distribution</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Names follow: <strong>YYYYMM-Batch-Letter-Project-Type-Serial</strong> (e.g. 202508-028-S-KHI-R-UW-00152). Group by dimension below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-slate-700 text-sm whitespace-nowrap">Group by:</Label>
                <Select value={circuitGroupBy} onValueChange={v => setCircuitGroupBy(v as "type" | "yearMonth" | "project" | "batch")}>
                  <SelectTrigger className="w-[140px] bg-white border-slate-200 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type">Type (R-UW, R-TU…)</SelectItem>
                    <SelectItem value="yearMonth">Year-Month</SelectItem>
                    <SelectItem value="project">Project (e.g. KHI)</SelectItem>
                    <SelectItem value="batch">Batch</SelectItem>
                  </SelectContent>
                </Select>
                {user?.role === "admin" && (
                  <>
                    <Label className="text-slate-700 text-sm whitespace-nowrap">Path:</Label>
                    <Select value={circuitPathUser} onValueChange={v => { setCircuitPathUser(v); setCircuitRawNames([]); }}>
                      <SelectTrigger className="w-[120px] bg-white border-slate-200 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current user</SelectItem>
                        {CIRCUIT_PATH_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-700" onClick={() => fetchCircuitFiles()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="w-full" style={{ maxHeight: 420 }}>
              <div style={{ height: Math.max(280, fileTypeData.length * 28), width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fileTypeData} layout="vertical" margin={{ top: 4, right: 24, left: 120, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={116} stroke="#475569" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ ...TOOLTIP_STYLE, backgroundColor: "#fff", color: "#111" }} />
                    <Bar
                      dataKey="value"
                      fill="url(#gradientBarCircuit)"
                      radius={[0, 4, 4, 0]}
                      name="Count"
                    />
                    <defs>
                      <linearGradient id="gradientBarCircuit" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <FloatingMetric
            label="Images"
            value={
              files.filter(f =>
                [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(
                  getFileExtension(f.filename)
                )
              ).length
            }
            unit="files"
            color="text-blue-400"
          />
          <FloatingMetric
            label="Documents"
            value={
              files.filter(f => [".pdf"].includes(getFileExtension(f.filename)))
                .length
            }
            unit="files"
            color="text-purple-400"
          />
          <FloatingMetric
            label="Videos"
            value={
              files.filter(f =>
                [".mp4", ".webm", ".mov"].includes(getFileExtension(f.filename))
              ).length
            }
            unit="files"
            color="text-pink-400"
          />
          <FloatingMetric
            label="Others"
            value={
              files.filter(
                f =>
                  ![
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".gif",
                    ".webp",
                    ".pdf",
                    ".mp4",
                    ".webm",
                    ".mov",
                  ].includes(getFileExtension(f.filename))
              ).length
            }
            unit="files"
            color="text-cyan-400"
          />
        </div>

        <footer className="text-center py-6 border-t border-slate-200">
          <p className="text-slate-500 text-sm">
            Last updated: {new Date().toLocaleString()}
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Created by Hammad Rustam
          </p>
        </footer>
      </main>

      {/* File View Dialog */}
      <Dialog
        open={!!viewingFile}
        onOpenChange={open => {
          if (!open) {
            setViewingFile(null);
            setViewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 truncate">
              {viewingFile?.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
            {viewUrl && viewingFile && (
              <>
                {[".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(
                  getFileExtension(viewingFile.filename)
                ) && (
                    <img
                      src={viewUrl}
                      alt={viewingFile.filename}
                      className="max-w-full max-h-[70vh] object-contain rounded"
                    />
                  )}
                {getFileExtension(viewingFile.filename) === ".pdf" && (
                  <iframe
                    src={viewUrl}
                    title={viewingFile.filename}
                    className="w-full h-[70vh] rounded border-0"
                  />
                )}
                {[".mp4", ".webm"].includes(
                  getFileExtension(viewingFile.filename)
                ) && (
                    <video
                      src={viewUrl}
                      controls
                      className="max-w-full max-h-[70vh] rounded"
                    />
                  )}
              </>
            )}
          </div>
          {viewUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 text-sm underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </a>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Folder Name</Label>
              <input
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-900"
                placeholder="e.g. May-Reports"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
              />
              <p className="text-xs text-slate-500">Will be created inside <code className="bg-slate-100 px-1 rounded">dawarc/Circuler/</code></p>
            </div>
            <Button className="w-full bg-slate-800 hover:bg-slate-900 text-white" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
