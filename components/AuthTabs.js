import { Box, Flex, Tabs } from "@radix-ui/themes";
import React from "react";
import Signin from "./Signin";

function AuthTabs() {
  return (
    <Tabs.Root className="h-full" defaultValue="signin">
      <Tabs.List>
        <Flex width="100%">
          <Tabs.Trigger value="signin">Sign In</Tabs.Trigger>
        </Flex>
      </Tabs.List>

      <Box className="h-full" pt="3">
        <Tabs.Content className="h-full" value="signin">
          <Signin />
        </Tabs.Content>
      </Box>
    </Tabs.Root>
  );
}

export default AuthTabs;
