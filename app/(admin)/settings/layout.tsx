import { SegmentedNav } from "@/ui/SegmentedNav";

export default function SettingsLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <div className="mb-8">
        <SegmentedNav
          items={[
            { href: "/settings/account", label: "Account" },
            { href: "/settings/brand", label: "Brand" },
            { href: "/settings/channels", label: "Channels" },
            { href: "/settings/team", label: "Team" },
            { href: "/settings/suppressions", label: "Suppressions" },
          ]}
        />
      </div>
      {children}
    </div>
  );
}
