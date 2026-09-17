import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/locale";
import { formatTemplate } from "@/lib/i18n/dictionaries";
import { logoutAction, setLocaleAction, setThemeAction } from "@/lib/actions";
import { getTheme } from "@/lib/theme";
import { PRIMARY_KINGDOM_ID } from "@/lib/types";
import SidebarNav, { NavItem } from "./SidebarNav";

export default async function Sidebar() {
  const [session, { t, locale }, theme] = await Promise.all([
    getSession(),
    getDictionary(),
    getTheme(),
  ]);

  const publicItems: NavItem[] = [
    { href: "/", label: t.nav.home, icon: "home" },
    {
      href: `/kingdom/${PRIMARY_KINGDOM_ID}`,
      label: formatTemplate(t.nav.myKingdom, { id: PRIMARY_KINGDOM_ID }),
      icon: "kingdom",
    },
    { href: "/compare", label: t.nav.compare, icon: "compare" },
  ];

  const adminItems: NavItem[] = [
    { href: "/admin", label: t.admin.nav.menus, icon: "list" },
    { href: "/admin/formula", label: t.admin.nav.formula, icon: "formula" },
    { href: "/admin/kingdoms", label: t.admin.nav.campaigns, icon: "layers" },
  ];

  return (
    <SidebarNav
      siteTitle={t.common.siteTitle}
      publicItems={publicItems}
      adminItems={session ? adminItems : []}
      adminSectionLabel={t.nav.adminSection}
      logoutLabel={t.common.logout}
      toggleLabel={t.nav.toggleMenu}
      collapseLabel={t.nav.collapseMenu}
      expandLabel={t.nav.expandMenu}
      isAdmin={!!session}
      locale={locale}
      theme={theme}
      lightModeLabel={t.nav.lightMode}
      darkModeLabel={t.nav.darkMode}
      logoutAction={logoutAction}
      setLocaleAction={setLocaleAction}
      setThemeAction={setThemeAction}
    />
  );
}
