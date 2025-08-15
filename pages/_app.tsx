import React from "react";
import { Theme } from "@radix-ui/themes";
import "../styles/globals.css";
import "@radix-ui/themes/styles.css";
import { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
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
