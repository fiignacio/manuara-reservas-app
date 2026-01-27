import React from "react";
import { NavLink } from "react-router-dom";
import { 
  BarChart3, 
  Calendar, 
  Home, 
  FileText,
  Bed
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Manuara</h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary py-2",
                    isActive ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
                  )
                }
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="/calendar" 
                className={({ isActive }) => 
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary py-2",
                    isActive ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
                  )
                }
              >
                Calendario
              </NavLink>
              <NavLink 
                to="/reservations" 
                className={({ isActive }) => 
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary py-2",
                    isActive ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
                  )
                }
              >
                Reservas
              </NavLink>
              <NavLink 
                to="/analytics" 
                className={({ isActive }) => 
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary py-2",
                    isActive ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
                  )
                }
              >
                Analíticas
              </NavLink>
              <NavLink 
                to="/reports" 
                className={({ isActive }) => 
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary py-2",
                    isActive ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
                  )
                }
              >
                Reportes
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile Navigation - Fixed Bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-5 h-16">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs transition-colors",
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground active:bg-muted"
              )
            }
          >
            <Home className="h-5 w-5" />
            <span>Inicio</span>
          </NavLink>
          <NavLink 
            to="/calendar" 
            className={({ isActive }) => 
              cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs transition-colors",
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground active:bg-muted"
              )
            }
          >
            <Calendar className="h-5 w-5" />
            <span>Calendario</span>
          </NavLink>
          <NavLink 
            to="/reservations" 
            className={({ isActive }) => 
              cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs transition-colors",
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground active:bg-muted"
              )
            }
          >
            <Bed className="h-5 w-5" />
            <span>Reservas</span>
          </NavLink>
          <NavLink 
            to="/analytics" 
            className={({ isActive }) => 
              cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs transition-colors",
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground active:bg-muted"
              )
            }
          >
            <BarChart3 className="h-5 w-5" />
            <span>Analíticas</span>
          </NavLink>
          <NavLink 
            to="/reports" 
            className={({ isActive }) => 
              cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs transition-colors",
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground active:bg-muted"
              )
            }
          >
            <FileText className="h-5 w-5" />
            <span>Reportes</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
