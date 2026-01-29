import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, Image, Music, FileArchive, Download, RefreshCw, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Dashboard V1: Modern Analytics Dashboard
 * Design Philosophy: Contemporary data visualization with glassmorphism effects
 * - Clean information hierarchy with strategic whitespace
 * - Smooth micro-interactions and animations
 * - Professional color palette with vibrant accents (emerald, sapphire, coral)
 * - Responsive grid layout with floating elements
 */

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendColor?: string;
}

const MetricCard = ({ label, value, icon, trend, trendColor = "text-emerald-600" }: MetricCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const numValue = typeof value === "string" ? parseInt(value.replace(/[^0-9]/g, "")) : value;
    let current = 0;
    const increment = numValue / 30;
    const interval = setInterval(() => {
      current += increment;
      if (current >= numValue) {
        setDisplayValue(numValue);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <Card className="card-elevated group hover:scale-105 transition-transform duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="metric-value text-accent">{displayValue}</div>
        {trend && <p className={`text-xs mt-2 ${trendColor}`}>{trend}</p>}
      </CardContent>
    </Card>
  );
};

interface FileItem {
  name: string;
  type: string;
  size: string;
  count: number;
}

const FileTypeIcon = ({ type }: { type: string }) => {
  const iconClass = "w-5 h-5";
  switch (type) {
    case "jpeg":
    case "jpg":
    case "png":
      return <Image className={`${iconClass} text-blue-500`} />;
    case "pdf":
      return <FileText className={`${iconClass} text-red-500`} />;
    case "mp4":
    case "mpeg":
      return <Music className={`${iconClass} text-purple-500`} />;
    default:
      return <FileArchive className={`${iconClass} text-gray-500`} />;
  }
};

export default function DashboardV1() {
  // Sample data
  const extensionData = [
    { name: "jpeg", value: 520, fill: "var(--color-chart-1)" },
    { name: "pdf", value: 178, fill: "var(--color-chart-2)" },
    { name: "mp4", value: 142, fill: "var(--color-chart-3)" },
    { name: "jpg", value: 63, fill: "var(--color-chart-4)" },
    { name: "mpeg", value: 49, fill: "var(--color-chart-5)" },
  ];

  const storageByMonth = [
    { month: "Jan", storage: 400, files: 240 },
    { month: "Feb", storage: 520, files: 310 },
    { month: "Mar", storage: 680, files: 420 },
    { month: "Apr", storage: 890, files: 580 },
    { month: "May", storage: 1200, files: 750 },
    { month: "Jun", storage: 1450, files: 920 },
  ];

  const fileItems: FileItem[] = [
    { name: "jpeg", type: "image", size: "520 files", count: 520 },
    { name: "pdf", type: "document", size: "178 files", count: 178 },
    { name: "mp4", type: "video", size: "142 files", count: 142 },
    { name: "jpg", type: "image", size: "63 files", count: 63 },
    { name: "mpeg", type: "video", size: "49 files", count: 49 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">Signed in as hammad.khannazi@gmail.com (viewer)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="destructive" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            label="Total Files"
            value={1000}
            icon={<FileArchive className="w-5 h-5 text-accent" />}
            trend="↑ 12% from last month"
          />
          <MetricCard
            label="Total Storage"
            value="2.3 GB"
            icon={<Download className="w-5 h-5 text-accent" />}
            trend="↑ 8% from last month"
          />
          <MetricCard
            label="File Types"
            value={8}
            icon={<Image className="w-5 h-5 text-accent" />}
            trend="2 new types added"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Storage Trend Chart */}
          <Card className="card-elevated lg:col-span-2">
            <CardHeader>
              <CardTitle>Storage Trend</CardTitle>
              <CardDescription>Monthly storage usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={storageByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="storage" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ fill: "var(--color-chart-2)" }} />
                  <Line type="monotone" dataKey="files" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ fill: "var(--color-chart-1)" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* File Type Distribution */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Top Extensions</CardTitle>
              <CardDescription>File type distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={extensionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {extensionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* File Browser Section */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>File Types Overview</CardTitle>
            <CardDescription>1000 items • Organized by extension</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fileItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-white rounded-lg group-hover:shadow-md transition-shadow">
                      <FileTypeIcon type={item.name} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{item.name.toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{item.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.size}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Last updated: {new Date().toLocaleString()}</p>
        </div>
      </main>
    </div>
  );
}
