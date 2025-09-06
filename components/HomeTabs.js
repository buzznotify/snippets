import { Box, Button, Flex, Tabs } from "@radix-ui/themes";
import { PlusIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import ActiveTable from "./ActiveTable";
import CreateKeyModal from "./CreateKeyModal";
import {
  deleteSnippetsAPI,
  getAllSnippetsAPI,
  getLocalStorage,
} from "../lib/services";
function HomeTabs() {
  const [activeSnippets, setActiveSnippets] = useState([]);
  const [selectedSnippets, setSelectedSnippets] = useState([]);
  const getSnippets = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    if (token) {
      getAllSnippetsAPI(token).then(async (response) => {
        setActiveSnippets(response);
      });
    }
  };
  useEffect(() => {
    getSnippets();
  }, []);
  return (
    <Tabs.Root defaultValue="active">
      <Tabs.List>
        <Flex width="100%">
          <Tabs.Trigger value="active">Active</Tabs.Trigger>
        </Flex>
        <CreateKeyModal setActiveSnippets={setActiveSnippets}>
          <Button variant="classic">
            <PlusIcon size="20" />
            Create
          </Button>
        </CreateKeyModal>
      </Tabs.List>

      <Box py="3">
        <Tabs.Content value="active">
          <ActiveTable
            {...{
              activeSnippets,
              setActiveSnippets,
              setSelectedSnippets,
              getSnippets,
            }}
          />
        </Tabs.Content>
      </Box>
    </Tabs.Root>
  );
}

export default HomeTabs;
