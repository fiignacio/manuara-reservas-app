
import { Home, Calendar, BarChart3, FileText } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/logo.png';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, shortName: 'Inicio' },
    { name: 'Calendario & Reservas', href: '/calendar', icon: Calendar, shortName: 'Cal. & Reservas' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, shortName: 'Analytics' },
  ];

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card-cabin border-b border-border/50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img 
                  src={logoImage} 
                  alt="Manuara Eco Lodge" 
                  className="w-8 h-8 object-contain rounded-lg"
                />
                <h1 className="text-xl font-bold text-foreground">Manuara Reservas</h1>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-card border-t border-border/50 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex justify-around py-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center space-y-1 p-3 rounded-lg text-xs transition-colors min-h-[44px] min-w-[44px]',
                  isActive
                    ? 'text-primary bg-accent'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="w-6 h-6" />
              <span className="text-center text-[10px] leading-tight max-w-[60px]">{item.shortName}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
