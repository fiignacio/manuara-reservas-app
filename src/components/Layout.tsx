import React from "react";
import { NavLink } from "react-router-dom";
import { 
  BarChart3, 
  Calendar, 
  Home, 
  FileText,
  Bed,
  LogOut,
  User,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/types/user";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, signOut, hasPermission } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-foreground">Manuara Reservas</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )
                }
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="/calendar" 
                className={({ isActive }) => 
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )
                }
              >
                Calendario
              </NavLink>
              <NavLink 
                to="/reservations" 
                className={({ isActive }) => 
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )
                }
              >
                Reservas
              </NavLink>
              {hasPermission('canAccessAnalytics') && (
                <NavLink 
                  to="/analytics" 
                  className={({ isActive }) => 
                    cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )
                  }
                >
                  Analíticas
                </NavLink>
              )}
              {hasPermission('canAccessReports') && (
                <NavLink 
                  to="/reports" 
                  className={({ isActive }) => 
                    cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )
                  }
                >
                  Reportes
                </NavLink>
              )}
            </div>
            
            {/* User Info and Logout */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{user?.displayName || user?.email}</span>
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {user ? ROLE_LABELS[user.role] : ''}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex justify-around py-2">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              cn(
                "flex flex-col items-center p-2 text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Home className="h-5 w-5 mb-1" />
            Dashboard
          </NavLink>
          <NavLink 
            to="/calendar" 
            className={({ isActive }) => 
              cn(
                "flex flex-col items-center p-2 text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Calendar className="h-5 w-5 mb-1" />
            Calendario
          </NavLink>
          <NavLink 
            to="/reservations" 
            className={({ isActive }) => 
              cn(
                "flex flex-col items-center p-2 text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Bed className="h-5 w-5 mb-1" />
            Reservas
          </NavLink>
          {hasPermission('canAccessAnalytics') && (
            <NavLink 
              to="/analytics" 
              className={({ isActive }) => 
                cn(
                  "flex flex-col items-center p-2 text-xs",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <BarChart3 className="h-5 w-5 mb-1" />
              Analíticas
            </NavLink>
          )}
          {hasPermission('canAccessReports') && (
            <NavLink 
              to="/reports" 
              className={({ isActive }) => 
                cn(
                  "flex flex-col items-center p-2 text-xs",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <FileText className="h-5 w-5 mb-1" />
              Reportes
            </NavLink>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="flex flex-col items-center p-2 text-xs text-muted-foreground"
          >
            <LogOut className="h-5 w-5 mb-1" />
            Salir
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;