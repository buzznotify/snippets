import React, { useEffect, useState } from "react";
import { Theme, ThemePanel } from "@radix-ui/themes";
import { useRouter } from "next/router";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { getLocalStorage, getCookie } from "@/lib/services";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Don't redirect if already on auth page or already redirecting
    if (["/auth", "/org", "/auth/logout"].includes(router.pathname) || isRedirecting) {
      return;
    }

    const token = getLocalStorage("token")?.split('"')[1];
    const orgId = getLocalStorage("orgId")?.split('"')[1];
    
    if (!token || !orgId) {
      setIsRedirecting(true);
      router.push("/auth");
    } else {
      // Reset redirecting state if user has valid credentials
      setIsRedirecting(false);
    }
  }, [router.pathname, isRedirecting]);

  return (
    <Theme
      appearance="dark"
      accentColor="teal"
      grayColor="sage"
      radius="medium"
    >
      <div className="flex w-screen h-screen  overflow-auto">
        <Component {...pageProps} />
      </div>
    </Theme>
  );
}

export default MyApp;
