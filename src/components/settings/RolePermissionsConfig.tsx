import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Save, 
  RotateCcw, 
  User, 
  UserCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useRolePermissionsAdmin, 
  ALL_PERMISSIONS, 
  PERMISSION_CATEGORIES,
  DEFAULT_PERMISSIONS,
} from '@/hooks/useRolePermissions';

const RolePermissionsConfig = () => {
  const { 
    rolePermissions, 
    updatePermission, 
    savePermissions, 
    resetToDefaults,
    loading, 
    saving 
  } = useRolePermissionsAdmin();
  
  const [activeRole, setActiveRole] = useState<'barbeiro' | 'recepcionista'>('barbeiro');

  const handleSave = async () => {
    const success = await savePermissions(activeRole);
    if (success) {
      toast.success(`Permissões do ${activeRole === 'barbeiro' ? 'Barbeiro' : 'Recepcionista'} salvas!`);
    } else {
      toast.error('Erro ao salvar permissões');
    }
  };

  const handleReset = () => {
    resetToDefaults(activeRole);
    toast.info('Permissões restauradas para o padrão. Clique em Salvar para confirmar.');
  };

  const handleToggleAll = (enabled: boolean) => {
    ALL_PERMISSIONS.forEach(perm => {
      updatePermission(activeRole, perm.key, enabled);
    });
  };

  const getPermissionsByCategory = (category: string) => {
    return ALL_PERMISSIONS.filter(p => p.category === category);
  };

  const countEnabledPermissions = (role: string) => {
    const perms = rolePermissions[role] || {};
    return Object.values(perms).filter(Boolean).length;
  };

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Permissões da Equipe
        </CardTitle>
        <CardDescription>
          Configure quais funcionalidades cada função pode acessar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as 'barbeiro' | 'recepcionista')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="barbeiro" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Barbeiro
              <Badge variant="secondary" className="ml-1 text-xs">
                {countEnabledPermissions('barbeiro')}/{ALL_PERMISSIONS.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="recepcionista" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Recepcionista
              <Badge variant="secondary" className="ml-1 text-xs">
                {countEnabledPermissions('recepcionista')}/{ALL_PERMISSIONS.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {['barbeiro', 'recepcionista'].map((role) => (
            <TabsContent key={role} value={role} className="space-y-6 mt-6">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAll(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Habilitar Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAll(false)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Desabilitar Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Padrão
                </Button>
              </div>

              {/* Permissions by Category */}
              <div className="space-y-6">
                {PERMISSION_CATEGORIES.map((category) => {
                  const categoryPermissions = getPermissionsByCategory(category.key);
                  if (categoryPermissions.length === 0) return null;

                  return (
                    <div key={category.key} className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {category.label}
                        <Badge variant="outline" className="text-xs">
                          {categoryPermissions.filter(p => rolePermissions[role]?.[p.key]).length}/{categoryPermissions.length}
                        </Badge>
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {categoryPermissions.map((permission) => (
                          <div
                            key={permission.key}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-accent/50 transition-colors"
                          >
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <Label 
                                htmlFor={`${role}-${permission.key}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {permission.label}
                              </Label>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {permission.description}
                              </p>
                            </div>
                            <Switch
                              id={`${role}-${permission.key}`}
                              checked={rolePermissions[role]?.[permission.key] ?? false}
                              onCheckedChange={(checked) => updatePermission(role, permission.key, checked)}
                              className="ml-3"
                            />
                          </div>
                        ))}
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  );
                })}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Permissões do {role === 'barbeiro' ? 'Barbeiro' : 'Recepcionista'}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RolePermissionsConfig;
