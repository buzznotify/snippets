import { Box, Button, Flex, Tabs, Text } from "@radix-ui/themes";
import { PlusIcon } from "lucide-react";
import React from "react";
import ActiveTable from "./ActiveTable";
import ArchiveTable from "./ArchiveTable";
import CreateKeyModal from "./CreateKeyModal";
function HomeTabs() {
  const data = [
    {
      id: "s_123",
      key: "omw",
      value: "On My Way",
      dtype: "text",
      date_updated: "now",
      is_analytical: false,
    },
  ];
  const tableData = data?.map(
    ({ id, key, value, dtype, date_updated, is_analytical }) => ({
      id,
      key,
      value,
      type: dtype,
      "last updated": date_updated,
      analytics: is_analytical,
    })
  );
  return (
    <Tabs.Root defaultValue="active">
      <Tabs.List>
        <Flex width="100%">
          <Tabs.Trigger value="active">Active</Tabs.Trigger>
          <Tabs.Trigger value="archive">Archive</Tabs.Trigger>
          <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
        </Flex>
        <CreateKeyModal>
          <Button variant="classic">
            <PlusIcon size="20" />
            Create
          </Button>
        </CreateKeyModal>
      </Tabs.List>

      <Box pt="3">
        <Tabs.Content value="active">
          <ActiveTable {...{ tableData }} />
        </Tabs.Content>

        <Tabs.Content value="archive">
          <ArchiveTable {...{ tableData }} />
        </Tabs.Content>

        <Tabs.Content value="settings">
          <Text size="2">Edit your profile or update contact information.</Text>
        </Tabs.Content>
      </Box>
    </Tabs.Root>
  );
}

export default HomeTabs;
