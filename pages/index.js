import React, { useEffect, useRef, useState } from "react";
// import { login, setLocalStorage } from "./_services";
import HomeTabs from "../components/HomeTabs";
import { Badge, Box, Button, Container, DropdownMenu, Flex, Heading } from "@radix-ui/themes";
import CreateKeyModal from "../components/CreateKeyModal";
import { EllipsisVerticalIcon, User, UserIcon } from "lucide-react";
import { getCookie } from "cookies-next";
import { getLocalStorage } from "../lib/services";

const Home = () => {
  const [org, setOrg] = useState(null);
  useEffect(() => {
    const orgDetails = getCookie("org");
    if (orgDetails) {
      const parsedOrgDetails = JSON.parse(orgDetails);
      setOrg(parsedOrgDetails);
    }
  }, []);
  return (
    <Container className="flex flex-col items-center h-full w-full my-20">
      <Box className="h-full space-y-4">
        <Flex justify="between">
          <Heading>Snippets</Heading>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button className="focus:outline-none focus:ring-0 focus:bg-transparent hover:bg-transparent" variant="ghost">
                <UserIcon size="20" />
                <DropdownMenu.TriggerIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {org ? <DropdownMenu.Item onClick={() => window.location.href = "/org"}>Switch Org <Badge>{org.name}({org.id})</Badge></DropdownMenu.Item> : null}
              <DropdownMenu.Item onClick={() => window.location.href = "/profile"}>Profile</DropdownMenu.Item>
              <DropdownMenu.Item color="red" onClick={() => window.location.href = "/logout"}>
                Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
        <HomeTabs />
      </Box>
    </Container>
  );
};

export default Home;
