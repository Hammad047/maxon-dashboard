import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Redirect } from "wouter";
import {
  usersApi,
  type UserResponse,
  type UserUpdatePayload,
  type AccessRule,
  type PathPrefixOption,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Users,
  Loader2,
  Pencil,
  LogOut,
  ArrowLeft,
  Lock,
  FolderKey,
  Trash2,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
  external_viewer: "External Viewer",
};

export default function Admin() {
  const { user, logout, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [pathPrefixes, setPathPrefixes] = useState<PathPrefixOption[]>([]);
  const [stats, setStats] = useState<{ total_users: number; active_users: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [editForm, setEditForm] = useState<UserUpdatePayload>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!user || user.role !== "admin") return;
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rulesRes, prefixesRes, discoverRes, statsRes] = await Promise.all([
        usersApi.list(),
        usersApi.accessRules(),
        usersApi.pathPrefixes(),
        usersApi.discoverPaths("").catch(() => ({ data: { prefixes: [] } })),
        usersApi.stats().catch(() => ({ data: { total_users: 0, active_users: 0 } })),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setRules(rulesRes.data?.rules ?? []);
      setStats(statsRes.data ?? null);
      // Merge static path prefixes with discovered S3 paths (dedupe by value)
      const staticPrefixes = prefixesRes.data?.prefixes ?? [];
      const discovered = discoverRes.data?.prefixes ?? [];
      const seen = new Set(staticPrefixes.map((p) => p.value));
      const merged = [...staticPrefixes];
      for (const p of discovered) {
        if (p.value && !seen.has(p.value)) {
          seen.add(p.value);
          merged.push(p);
        }
      }
      setPathPrefixes(merged);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail ?? "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEdit = (u: UserResponse) => {
    setEditingUser(u);
    setEditForm({
      full_name: u.full_name ?? undefined,
      role: u.role,
      is_active: u.is_active,
      allowed_path_prefix: u.allowed_path_prefix ?? undefined,
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await usersApi.update(editingUser.id, editForm);
      setEditingUser(null);
      await loadData();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail ?? "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u: UserResponse) => {
    if (user && u.id === user.id) {
      setError("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Delete user "${u.email}"? This cannot be undone.`)) return;
    setDeletingId(u.id);
    setError(null);
    try {
      await usersApi.delete(u.id);
      await loadData();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail ?? "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Redirect to="/dashboard-v3" />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100" onClick={() => setLocation("/dashboard-v3")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-xs text-slate-500">Manage users and access</p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-4">
                <p className="text-slate-600 text-sm">Total users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-4">
                <p className="text-slate-600 text-sm">Active users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.active_users}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-8 border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Lock className="w-5 h-5" />
              Access rule types
            </CardTitle>
            <p className="text-sm text-slate-600">Permissions are derived from role. Admin has full access; others are scoped by path.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {rules.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-medium text-slate-900">{r.label}</p>
                  <p className="text-xs text-slate-600 mt-1">{r.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <FolderKey className="w-5 h-5" />
              Path prefixes (AWS)
            </CardTitle>
            <p className="text-sm text-slate-600">Paths discovered from S3 plus static options. When editing a user, set Path prefix to restrict access (e.g. dawarc/circuit/ampere). Full access = no restriction.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pathPrefixes.map((p) => (
                <Badge key={p.value} variant="secondary" className="bg-slate-100 text-slate-800">
                  {p.label}: {p.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5" />
              All users
            </CardTitle>
            <p className="text-sm text-slate-600">Set role and path access for each user. Last login and created time shown.</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                Loading users...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-700">Email</TableHead>
                    <TableHead className="text-slate-700">Name</TableHead>
                    <TableHead className="text-slate-700">Role</TableHead>
                    <TableHead className="text-slate-700">Path prefix</TableHead>
                    <TableHead className="text-slate-700">Active</TableHead>
                    <TableHead className="text-slate-700">Last login</TableHead>
                    <TableHead className="text-slate-700">Created</TableHead>
                    <TableHead className="text-slate-700 w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-slate-200">
                      <TableCell className="text-slate-900">{u.email}</TableCell>
                      <TableCell className="text-slate-700">{u.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className={u.role === "admin" ? "bg-slate-800" : "bg-slate-100 text-slate-800"}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700 font-mono text-xs">{u.allowed_path_prefix ?? "Full access"}</TableCell>
                      <TableCell>
                        {u.is_active ? <span className="text-emerald-600">Yes</span> : <span className="text-red-600">No</span>}
                      </TableCell>
                      <TableCell className="text-slate-700 text-xs">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-slate-700 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100" onClick={() => openEdit(u)}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteUser(u)}
                            disabled={user?.id === u.id || deletingId === u.id}
                            title={user?.id === u.id ? "Cannot delete your own account" : "Delete user"}
                          >
                            {deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && users.length === 0 && (
              <p className="py-8 text-center text-slate-500">No users yet.</p>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md" aria-describedby="edit-user-dialog-description">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription id="edit-user-dialog-description" className="sr-only">
              Change role, path access, and active status for this user.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-slate-700">Email</Label>
                <Input value={editingUser.email} disabled className="bg-slate-50 mt-1 border-slate-200" />
              </div>
              <div>
                <Label className="text-slate-700">Full name</Label>
                <Input value={editForm.full_name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value || undefined }))} className="bg-white border-slate-200 mt-1" placeholder="Optional" />
              </div>
              <div>
                <Label className="text-slate-700">Role</Label>
                <Select value={editForm.role ?? editingUser.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as UserResponse["role"] }))}>
                  <SelectTrigger className="w-full mt-1 bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["admin", "editor", "viewer", "external_viewer"] as const).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-700">Path prefix (Full access = no restriction)</Label>
                <Select
                  value={editForm.allowed_path_prefix === undefined || editForm.allowed_path_prefix === null || editForm.allowed_path_prefix === "" ? "__full_access__" : editForm.allowed_path_prefix}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, allowed_path_prefix: v === "__full_access__" ? undefined : v }))}
                >
                  <SelectTrigger className="w-full mt-1 bg-white border-slate-200">
                    <SelectValue placeholder="Full access" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__full_access__">Full access</SelectItem>
                    {pathPrefixes.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}: {p.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-slate-700">Active</Label>
                <Switch checked={editForm.is_active ?? editingUser.is_active} onCheckedChange={(v) => setEditForm((f) => ({ ...f, is_active: v }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} className="border-slate-200 text-slate-700">Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-slate-800 hover:bg-slate-900 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
