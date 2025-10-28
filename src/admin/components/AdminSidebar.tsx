// src/admin/components/AdminSidebar.tsx
import React from 'react';

export type PageType =
  | "dashboard"
  | "tip-ui-management"
  | "reward-ui-management"
  | "vending-management"
  | "flag-nft-management"
  | "diagnostics"
  | "tenant-management";

interface MenuItem {
  id: PageType;
  label: string;
  icon: string;
  color: string;
}

interface MenuGroup {
  title: string;
  icon: string;
  items: MenuItem[];
}

interface AdminSidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: "TIPエンゲージメント",
    icon: "🔥",
    items: [
      { id: "dashboard", label: "ダッシュボード", icon: "📊", color: "#16a34a" },
      { id: "tip-ui-management", label: "TIP 管理", icon: "💝", color: "#dc2626" },
      { id: "reward-ui-management", label: "REWARD管理", icon: "🏆", color: "#7c3aed" },
    ]
  },
  {
    title: "特典・マーケット",
    icon: "🎁",
    items: [
      { id: "vending-management", label: "GIFT HUB管理", icon: "🏪", color: "#059669" },
      { id: "flag-nft-management", label: "フラグNFT管理", icon: "🚩", color: "#ea580c" },
    ]
  },
  {
    title: "システム",
    icon: "⚙️",
    items: [
      { id: "diagnostics", label: "診断", icon: "🔧", color: "#6b7280" },
      // { id: "tenant-management", label: "テナント管理", icon: "🏢", color: "#7c2d12" },
    ]
  }
];

export default function AdminSidebar({
  currentPage,
  onPageChange,
  isCollapsed,
  onToggle
}: AdminSidebarProps) {
  return (
    <aside
      style={{
        width: isCollapsed ? 70 : 240,
        minWidth: isCollapsed ? 70 : 240,
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* ロゴ＆トグルボタン */}
      <div
        style={{
          padding: "16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          gap: 8,
        }}
      >
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/gifterra-logo.png" alt="GIFTERRA" style={{ height: 24 }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
              Admin
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 6,
            padding: "6px 8px",
            cursor: "pointer",
            color: "#fff",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        >
          {isCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* メニューグループ */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {MENU_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} style={{ marginBottom: 24 }}>
            {/* グループタイトル */}
            {!isCollapsed && (
              <div
                style={{
                  padding: "8px 16px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{group.icon}</span>
                <span>{group.title}</span>
              </div>
            )}

            {isCollapsed && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: 18,
                  padding: "8px 0",
                  opacity: 0.6,
                }}
                title={group.title}
              >
                {group.icon}
              </div>
            )}

            {/* メニュー項目 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {group.items.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    style={{
                      background: isActive
                        ? `linear-gradient(90deg, ${item.color}33 0%, ${item.color}11 100%)`
                        : "transparent",
                      borderLeft: isActive ? `3px solid ${item.color}` : "3px solid transparent",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                      border: "none",
                      borderRadius: 0,
                      padding: isCollapsed ? "12px 8px" : "10px 16px",
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 600,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      transition: "all 0.2s ease",
                      justifyContent: isCollapsed ? "center" : "flex-start",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* フッター（バージョン情報など） */}
      {!isCollapsed && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
          }}
        >
          GIFTERRA Admin v1.0
        </div>
      )}
    </aside>
  );
}
