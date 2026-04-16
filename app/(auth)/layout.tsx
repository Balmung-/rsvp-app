import { LocaleToggle } from "@/ui/LocaleToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen grid place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        {children}
        <div className="mt-10 flex justify-center">
          <LocaleToggle />
        </div>
      </div>
    </div>
  );
}
