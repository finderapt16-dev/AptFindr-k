import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import {
  Bell,
  Building2,
  CircleHelp,
  Flag,
  Gavel,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";

const MAIN_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", section: "landlords" },
  { icon: Building2, label: "Apartments", section: "apartments" },
  { icon: Bell, label: "Notifications", section: "notifications" },
];

const MANAGEMENT_ITEMS = [
  { icon: Flag, label: "Reports", section: "reports" },
  { icon: Gavel, label: "Appeals", section: "appeals" },
];

const ACCOUNT_ITEMS = [
  { icon: Settings, label: "Settings", section: "admininfo" },
  { icon: CircleHelp, label: "Help & Support", section: "support" },
];

export function AdminSidebar({
  activeSection,
  isSupportView = false,
  pendingReports,
  activeAppealsCount,
  unreadNotifsCount,
  navigateToAdminModule,
  navigateToSupport,
  handleLogout,
}) {
  const countFor = (section, label) => {
    if (label === "Help & Support") return 0;
    if (section === "reports") return pendingReports;
    if (section === "appeals") return activeAppealsCount;
    if (section === "notifications") return unreadNotifsCount;
    return 0;
  };

  const renderGroup = (label, items) => (
    <nav aria-label={label} className="admin-figma-sidebar-group">
      <p>{label}</p>
      {items.map(({ icon: Icon, label: itemLabel, section }) => {
        const count = countFor(section, itemLabel);
        const isCurrent = itemLabel === "Help & Support"
          ? isSupportView
          : activeSection === section && !(isSupportView && section === "notifications");

        return (
          <button
            aria-current={isCurrent ? "page" : undefined}
            className={`admin-figma-sidebar-item ${isCurrent ? "is-active" : ""}`}
            key={itemLabel}
            onClick={() => itemLabel === "Help & Support" ? navigateToSupport?.() : navigateToAdminModule(section)}
            type="button"
          >
            <Icon aria-hidden="true" />
            <span>{itemLabel}</span>
            {count > 0 && <small>{count}</small>}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="app-sidebar admin-figma-sidebar">
      <div className="admin-figma-sidebar-brand">
        <img alt="" aria-hidden="true" src="/icon.svg" />
        <span>
          <strong>aptfindr</strong>
          <small>La Paz, Iloilo City</small>
        </span>
      </div>

      {renderGroup("Main", MAIN_ITEMS)}
      {renderGroup("Management", MANAGEMENT_ITEMS)}
      {renderGroup("Account", ACCOUNT_ITEMS)}

      <div className="admin-figma-sidebar-logout">
        <LogoutConfirmation onConfirm={handleLogout}>
          <button type="button">
            <LogOut aria-hidden="true" />
            <span>Log Out</span>
          </button>
        </LogoutConfirmation>
      </div>
    </div>
  );
}
