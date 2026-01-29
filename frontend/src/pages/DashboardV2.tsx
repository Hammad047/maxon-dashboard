import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, HardDrive, Layers, TrendingUp, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Dashboard V2: Minimalist Neumorphism Design
 * Design Philosophy: Soft, embossed UI with organic, tactile feel
 * - Monochromatic color scheme with subtle tonal variations
 * - Generous spacing and breathing room
 * - Organic, rounded corners throughout
 * - Gentle, non-intrusive interactions
 */

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const StatItem = ({ label, value, icon, color }: StatItemProps) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(true);
  }, []);

  return (
    <div
      className={`p-8 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-lg hover:shadow-xl transition-all duration-500 ${
        animated ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">{label}</p>
          <p className="text-4xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`p-4 rounded-2xl ${color}`}>{icon}</div>
      </div>
      <div className="h-1 w-12 rounded-full bg-gradient-to-r from-amber-600 to-amber-400"></div>
    </div>
  );
};

interface FileRowProps {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

const FileRow = ({ name, count, percentage, color }: FileRowProps) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <p className="font-semibold text-slate-700">{name}</p>
        <p className="text-sm text-slate-500">{count} files</p>
      </div>
      <div className="h-3 rounded-full bg-slate-200 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-slate-500 mt-2">{percentage}% of total</p>
    </div>
  );
};

export default function DashboardV2() {
  const storageData = [
    { month: "Jan", value: 400 },
    { month: "Feb", value: 520 },
    { month: "Mar", value: 680 },
    { month: "Apr", value: 890 },
    { month: "May", value: 1200 },
    { month: "Jun", value: 1450 },
  ];

  const fileDistribution = [
    { name: "JPEG Images", count: 520, percentage: 52, color: "bg-blue-400" },
    { name: "PDF Documents", count: 178, percentage: 18, color: "bg-amber-400" },
    { name: "MP4 Videos", count: 142, percentage: 14, color: "bg-purple-400" },
    { name: "JPG Images", count: 63, percentage: 6, color: "bg-emerald-400" },
    { name: "MPEG Videos", count: 49, percentage: 5, color: "bg-rose-400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-sm border-b border-slate-200/50">
        <div className="container flex items-center justify-between h-16">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-xs text-slate-600">File storage analytics</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="rounded-full">
              Settings
            </Button>
            <Button variant="destructive" size="sm" className="rounded-full">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-12">
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <StatItem
            label="Total Files"
            value="1,000"
            icon={<FileText className="w-6 h-6 text-slate-700" />}
            color="bg-blue-100"
          />
          <StatItem
            label="Storage Used"
            value="2.3 GB"
            icon={<HardDrive className="w-6 h-6 text-slate-700" />}
            color="bg-amber-100"
          />
          <StatItem
            label="Classified Data"
            value="8"
            icon={<Layers className="w-6 h-6 text-slate-700" />}
            color="bg-emerald-100"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Storage Trend */}
          <div className="p-8 rounded-3xl bg-white shadow-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Storage Trend</h2>
              <p className="text-sm text-slate-600">Monthly growth over 6 months</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={storageData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dbeafe" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#dbeafe" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* File Distribution */}
          <div className="p-8 rounded-3xl bg-white shadow-lg">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">File Distribution</h2>
              <p className="text-sm text-slate-600">Breakdown by file type</p>
            </div>
            <div className="space-y-2">
              {fileDistribution.map((file, index) => (
                <FileRow key={index} {...file} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Ready to explore more?</h3>
              <p className="text-sm text-slate-600">Access detailed file information and manage your storage</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-full">
                Learn More
              </Button>
              <Button className="rounded-full bg-amber-600 hover:bg-amber-700 text-white">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">Minimalist Dashboard • Neumorphism Design</p>
        </div>
      </main>
    </div>
  );
}
