import { Badge, Box, Button, Checkbox, Code, Container, Flex, Separator, Table, Text, Tooltip } from "@radix-ui/themes";
import { CalendarIcon, FileTextIcon, GlobeIcon, PenIcon, TrashIcon } from "lucide-react";
import React, { useCallback } from "react";
import CreateKeyModal from "./CreateKeyModal";
import DeleteKeyModal from "./DeleteKeyModal";
import moment from "moment";
import { TRIGGER_SYMBOL } from "@/lib/constants";

function ActiveTable({
  activeSnippets = [],
  setActiveSnippets,
  setSelectedSnippets,
  getSnippets,
}) {
  const renderType = useCallback((type) => {
    if (type === "text") {
      return <Flex align="center" gap="1"><FileTextIcon color="gray" size="14" /> <Text>Text</Text></Flex>;
    }
    return <Flex align="center" gap="1"><GlobeIcon color="gray" size="14" /> <Text>URL</Text></Flex>;
  }, []);
  return (
    <Container className="h-full">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row align="center">
            {Boolean(activeSnippets?.length) &&
              Object.keys(activeSnippets?.[0] || {})?.map(
                (header, index) =>
                  header !== "id" && (
                    <Table.ColumnHeaderCell className="capitalize" key={index}>
                      {header}
                    </Table.ColumnHeaderCell>
                  )
              )}
            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {activeSnippets?.map(
            ({ id, keyName, value, type, ...item }, index) => (
              <Table.Row key={id} align="center">
                <Table.Cell><Badge highContrast><Text color="lime" weight="bold">{TRIGGER_SYMBOL}</Text>{keyName}</Badge></Table.Cell>
                <Table.Cell
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineBreak: "anywhere",
                    whiteSpace: "wrap",
                    lineClamp: 2,
                    maxLines: 2,
                    maxWidth: "200px",
                  }}
                >
                  {value}
                </Table.Cell>
                <Table.Cell>{renderType(type)}</Table.Cell>
                <Table.Cell><Flex align="center" gap="1"><CalendarIcon color="gray" size="12" />{moment(item?.["Last Updated"], "DD/MM/YYYY, HH:mm:ss").format("MMM D, YYYY h:mm A")}</Flex></Table.Cell>
                <Table.Cell>
                  <Flex align="center" gap="1">
                    <CreateKeyModal
                      setActiveSnippets={setActiveSnippets}
                      mode="edit"
                      data={{ keyName, value, id }}
                    >
                      <Button size="1" variant="soft">
                        <PenIcon size="16" />
                      </Button>
                    </CreateKeyModal>
                    <DeleteKeyModal
                      keyName={keyName}
                      keyId={id}
                      getSnippets={getSnippets}
                    >
                      <Button onClick={(e) => console.log(e)} color="red" size="1" variant="soft">
                        <TrashIcon size="16" />
                      </Button>
                    </DeleteKeyModal>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )
          )}
        </Table.Body>
      </Table.Root>
    </Container>
  );
}

export default ActiveTable;
