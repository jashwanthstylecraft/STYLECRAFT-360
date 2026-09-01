import { NavLink, Link, useNavigate } from "react-router-dom";
import { Home, ChevronsLeft, ChevronsRight, X, UploadCloud, PencilLine, Settings, LogOut } from "lucide-react";
import { DEPARTMENTS } from "../../config/departments";
import { useAuth } from "../../contexts/AuthContext";
import { useDataStatus } from "../../hooks/useDataStatus";

function NavItem({ to, label, Icon, enabled, collapsed, onNavigate }) {
  const content = (
    <>
      <Icon size={18} strokeWidth={2} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  const baseClasses =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

  if (!enabled) {
    return (
      <div className="group relative">
        <div className={`${baseClasses} cursor-not-allowed text-slate-500/60`}>{content}</div>
        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          Coming soon
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${baseClasses} ${
          isActive
            ? "bg-white/10 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      {content}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const { data: dataStatus } = useDataStatus();

  // A department marked `enabled: false` in config (Marketing, Customer
  // Service — kept empty on purpose, see shared/metricRegistry.mjs) comes
  // back to life the moment it has a real metric (built-in or added via
  // Settings → Add Graph) — no code change needed to "re-enable" a tab.
  function isDeptEnabled(dept) {
    return dept.enabled || (dataStatus?.departmentMetricCounts?.[dept.slug] ?? 0) > 0;
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col bg-navy transition-transform duration-200 lg:static lg:translate-x-0 lg:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[72px]" : "lg:w-64"}`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          {!collapsed && (
            <Link to="/" onClick={onCloseMobile} className="leading-tight">
              <div className="text-sm font-extrabold tracking-wide text-white">STYLECRAFT</div>
              <div className="text-xs font-semibold tracking-widest text-actual">360</div>
            </Link>
          )}
          <button
            onClick={onToggleCollapsed}
            className="hidden rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
          <button
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          <NavItem to="/" label="360 View" Icon={Home} enabled collapsed={collapsed} onNavigate={onCloseMobile} />
          <div className="my-2 border-t border-white/10" />
          {DEPARTMENTS.map((dept) => (
            <NavItem
              key={dept.slug}
              to={dept.path}
              label={dept.label}
              Icon={dept.icon}
              enabled={isDeptEnabled(dept)}
              collapsed={collapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>

        <div className="px-3 pb-2">
          <div className="mb-2 border-t border-white/10" />
          {isAdmin && (
            <>
              <NavItem to="/data-entry" label="Data Entry" Icon={PencilLine} enabled collapsed={collapsed} onNavigate={onCloseMobile} />
              <NavItem to="/data" label="Data" Icon={UploadCloud} enabled collapsed={collapsed} onNavigate={onCloseMobile} />
            </>
          )}
          <NavItem to="/settings" label="Settings" Icon={Settings} enabled collapsed={collapsed} onNavigate={onCloseMobile} />
        </div>

        {user && (
          <div className="border-t border-white/10 px-3 py-3">
            <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${collapsed ? "justify-center" : "justify-between"}`}>
              {!collapsed && (
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-sm font-medium text-white">{user.name}</div>
                  <div className="text-xs capitalize text-slate-400">{user.role}</div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="px-4 py-4 text-xs text-slate-500">
            The whole business, at a glance.
          </div>
        )}
      </aside>
    </>
  );
}
