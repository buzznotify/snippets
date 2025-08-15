import React, { useEffect, useState } from "react";
import { Theme, ThemePanel } from "@radix-ui/themes";
import "./globals.css";
import "@radix-ui/themes/styles.css";

function MyApp({ Component, pageProps }) {
  const [activeURL, setActiveURL] = useState("");
  useEffect(() => {
    // get current url
    const url = "/" + window.location.href?.split("/")?.[3];
    setActiveURL(url);
  }, []);
  return (
    <Theme
      appearance="dark"
      accentColor="lime"
      grayColor="sage"
      radius="medium"
    >
      <div className="flex w-screen h-screen  overflow-auto">
        <Component {...pageProps} />
      </div>
      {/* <ThemePanel /> */}
    </Theme>
  );
}

export default MyApp;
