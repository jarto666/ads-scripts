'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Mail,
  Shield,
  Sparkles,
  FileText,
  Check,
  X,
  Trash2,
  Copy,
  Link,
  UserPlus,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  auth,
  admin,
  type AccessRequest,
  type AdminUser,
  type AdminStats,
} from '@/lib/api';

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activeTab, setActiveTab] = useState('requests');

  const [newUserEmail, setNewUserEmail] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [magicLinkDialog, setMagicLinkDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingLinkFor, setGeneratingLinkFor] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = await auth.me();
      if (!user.isAdmin) {
        router.push('/projects');
        return;
      }
      setIsAdmin(true);
      await Promise.all([fetchStats(), fetchRequests(), fetchUsers()]);
    } catch {
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await admin.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const data = await admin.getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await admin.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const result = await admin.approveRequest(requestId);
      toast({
        title: 'Request approved',
        description: result.created
          ? `User ${result.user.email} created`
          : `User ${result.user.email} already exists`,
      });
      await Promise.all([fetchStats(), fetchRequests(), fetchUsers()]);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await admin.rejectRequest(requestId);
      toast({ title: 'Request rejected' });
      await Promise.all([fetchStats(), fetchRequests()]);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await admin.deleteRequest(requestId);
      toast({ title: 'Request deleted' });
      await Promise.all([fetchStats(), fetchRequests()]);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete request',
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail) return;

    setIsCreatingUser(true);
    try {
      await admin.createUser(newUserEmail);
      toast({ title: 'User created', description: newUserEmail });
      setNewUserEmail('');
      await Promise.all([fetchStats(), fetchUsers()]);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await admin.deleteUser(userId);
      toast({ title: 'User deleted' });
      await Promise.all([fetchStats(), fetchUsers()]);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    try {
      const updated = await admin.toggleAdmin(userId);
      toast({
        title: updated.isAdmin ? 'Admin granted' : 'Admin revoked',
        description: updated.email,
      });
      await fetchUsers();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update admin status',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePlan = async (userId: string, plan: 'free' | 'pro') => {
    try {
      const updated = await admin.updateUserPlan(userId, plan);
      toast({
        title: 'Plan updated',
        description: `${updated.email} is now on ${plan} plan`,
      });
      await fetchUsers();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update plan',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateMagicLink = async (userId: string) => {
    setGeneratingLinkFor(userId);
    try {
      const result = await admin.generateMagicLink(userId);
      setGeneratedLink(result.magicLink);
      setMagicLinkDialog(true);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate magic link',
        variant: 'destructive',
      });
    } finally {
      setGeneratingLinkFor(null);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedLink);
    toast({ title: 'Copied to clipboard' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users and access requests
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warning/15">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalRequests}</p>
                  <p className="text-xs text-muted-foreground">Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success/15">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalScripts}</p>
                  <p className="text-xs text-muted-foreground">Scripts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <Mail className="h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          {/* Pending Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Pending Requests
              </CardTitle>
              <CardDescription>
                Review and approve access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending requests
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border"
                    >
                      <div>
                        <p className="font-medium">{request.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          className="gap-1"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processed Requests */}
          {processedRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Request History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {processedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/20"
                    >
                      <div className="flex items-center gap-3">
                        {request.status === 'approved' ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <div>
                          <p className="text-sm">{request.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(request.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            request.status === 'approved'
                              ? 'success'
                              : 'destructive'
                          }
                          className="text-xs"
                        >
                          {request.status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteRequest(request.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Create User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create User
              </CardTitle>
              <CardDescription>
                Manually create a new user account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="email@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                  />
                </div>
                <Button
                  onClick={handleCreateUser}
                  disabled={!newUserEmail || isCreatingUser}
                >
                  {isCreatingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{users.length} users total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary">
                        {user.isAdmin ? (
                          <Shield className="h-5 w-5 text-primary" />
                        ) : (
                          <Users className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.email}</p>
                          {user.isAdmin && (
                            <Badge variant="default" className="text-xs">
                              Admin
                            </Badge>
                          )}
                          {user.plan === 'pro' && (
                            <Badge variant="warning" className="text-xs gap-1">
                              <Crown className="h-3 w-3" />
                              Pro
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {user._count.projects} projects · Joined{' '}
                          {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.plan}
                        onValueChange={(value: 'free' | 'pro') =>
                          handleUpdatePlan(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">
                            <span className="flex items-center gap-1.5">
                              <Crown className="h-3 w-3 text-warning" />
                              Pro
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateMagicLink(user.id)}
                        disabled={generatingLinkFor === user.id}
                        className="gap-1"
                      >
                        {generatingLinkFor === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link className="h-4 w-4" />
                        )}
                        Magic Link
                      </Button>
                      <Button
                        size="sm"
                        variant={user.isAdmin ? 'secondary' : 'outline'}
                        onClick={() => handleToggleAdmin(user.id)}
                        className="gap-1"
                      >
                        <Shield className="h-4 w-4" />
                        {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Magic Link Dialog */}
      <Dialog open={magicLinkDialog} onOpenChange={setMagicLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Magic Link Generated</DialogTitle>
            <DialogDescription>
              Send this link to the user. It expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm font-mono break-all">{generatedLink}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={copyToClipboard} className="flex-1 gap-2">
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </Button>
              <Button
                variant="outline"
                onClick={() => setMagicLinkDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
