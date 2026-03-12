import { Button } from "@/components/ui/button";
import FooterThemeToggle from "@/components/FooterThemeToggle";

type FooterDocItem = {
  label: string;
  url: string | null;
};

export default function DriverFooterDocs({ items }: { items: FooterDocItem[] }) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto max-w-3xl px-4 py-3">
        <div className="grid grid-cols-4 items-center gap-2">
          {items.slice(0, 3).map((item) => {
            if (item.url) {
              return (
                <Button
                  key={item.label}
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full px-3"
                >
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                </Button>
              );
            }

            return (
              <Button
                key={item.label}
                variant="outline"
                size="sm"
                className="w-full rounded-full px-3"
                disabled
              >
                {item.label}
              </Button>
            );
          })}

          <FooterThemeToggle />
        </div>
      </div>
    </footer>
  );
}